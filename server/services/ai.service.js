import path from 'node:path';
import { AppError } from '../middleware/error.middleware.js';
import { callGroqChat } from '../config/groq.js';
import { buildXRayInterpretationPrompt } from './prompts.service.js';

const DEFAULT_AI_SERVICE_URL = 'http://127.0.0.1:8000';

/**
 * Returns the sanitized base URL of the Python FastAPI microservice.
 */
export function getAiServiceUrl() {
  const rawUrl = process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL;
  return rawUrl.trim().replace(/\/+$/, '');
}

/**
 * Check the operational health and readiness of the Python AI microservice.
 * Queries GET /health with a resilient timeout.
 *
 * @returns {Promise<{
 *   available: boolean,
 *   url: string,
 *   status?: string,
 *   service?: string,
 *   version?: string,
 *   modelLoaded?: boolean,
 *   device?: string,
 *   message?: string
 * }>}
 */
export async function checkAiServiceHealth() {
  const baseUrl = getAiServiceUrl();
  const endpoint = `${baseUrl}/health`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        available: false,
        url: baseUrl,
        statusCode: response.status,
        message: `AI service returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      available: true,
      url: baseUrl,
      status: data.status,
      service: data.service,
      version: data.version,
      modelLoaded: Boolean(data.model_loaded),
      device: data.device || 'unknown',
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const isTimeout = error.name === 'AbortError';
    return {
      available: false,
      url: baseUrl,
      message: isTimeout
        ? `Connection to AI microservice at ${baseUrl} timed out.`
        : `AI microservice is unreachable at ${baseUrl}. Ensure the FastAPI server is running (e.g. npm run ai:start).`,
      error: error.message,
    };
  }
}

/**
 * Download a remote image document (e.g. from Cloudinary) into a Node.js Buffer
 * so it can be forwarded to the Python AI microservice.
 *
 * @param {string} fileUrl
 * @returns {Promise<{ buffer: Buffer, filename: string, contentType: string }>}
 */
export async function fetchFileBufferFromUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') {
    throw new AppError('A valid fileUrl is required to download the document.', 400);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(fileUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        `Failed to fetch document file from storage (${response.status} ${response.statusText}).`,
        400
      );
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsedName = 'scan_document.png';
    try {
      const urlObj = new URL(fileUrl);
      const base = path.basename(urlObj.pathname);
      if (base && base.length > 2) {
        parsedName = base;
      }
    } catch {
      // fallback to default filename
    }

    return {
      buffer,
      filename: parsedName,
      contentType,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof AppError) throw error;
    throw new AppError(
      `Unable to retrieve record file for analysis: ${error.message}`,
      500
    );
  }
}

/**
 * Executes DenseNet-121 Chest X-Ray inference by calling the Python FastAPI microservice.
 *
 * @param {Object} params
 * @param {Buffer} params.fileBuffer - Raw binary image buffer (JPG / PNG)
 * @param {string} [params.filename='chest_xray.png']
 * @param {string} [params.contentType='image/png']
 * @param {string} [params.scanId]
 * @returns {Promise<{
 *   status: string,
 *   scan_id?: string,
 *   filename: string,
 *   modality: string,
 *   model_name: string,
 *   model_version: string,
 *   device: string,
 *   execution_time_ms: number,
 *   findings: Array<{ label: string, raw_score: number, interpretation_note: string }>,
 *   clinical_disclaimer: string
 * }>}
 */
export async function analyzeChestXRay({
  fileBuffer,
  filename = 'chest_xray.png',
  contentType = 'image/png',
  scanId,
}) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new AppError('Invalid image buffer provided for Chest X-Ray analysis.', 400);
  }

  const baseUrl = getAiServiceUrl();
  const endpoint = `${baseUrl}/analyze/chest-xray`;

  // Build multipart form data with the image blob
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: contentType });
  formData.append('file', blob, filename);

  if (scanId) {
    formData.append('scan_id', String(scanId));
  }

  const controller = new AbortController();
  // Allow up to 60s for model inference on CPU
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    const isTimeout = error.name === 'AbortError';
    throw new AppError(
      isTimeout
        ? 'Chest X-Ray AI inference timed out after 60 seconds.'
        : `Could not connect to AI microservice at ${baseUrl}. Ensure the Python service is running (npm run ai:start). Error: ${error.message}`,
      503
    );
  }

  clearTimeout(timeoutId);

  let responseData;
  try {
    responseData = await response.json();
  } catch {
    throw new AppError(
      `AI service returned invalid non-JSON response with HTTP status ${response.status}.`,
      502
    );
  }

  if (!response.ok) {
    const errorDetail = responseData?.detail || responseData?.message || 'Inference failed.';
    throw new AppError(
      `AI Microservice Error (${response.status}): ${errorDetail}`,
      response.status >= 500 ? 502 : response.status
    );
  }

  return responseData;
}

/**
 * Optionally generate an Aarogya AI plain-language clinical synthesis
 * from DenseNet-121 findings using Groq.
 *
 * @param {Object} params
 * @param {Object} params.xrayResult
 * @param {Object} [params.patientProfile]
 * @param {string} [params.recordTitle]
 * @returns {Promise<string>}
 */
export async function synthesizeXRayReportWithGroq({
  xrayResult,
  patientProfile,
  recordTitle,
}) {
  if (!process.env.GROQ_API_KEY) {
    return 'Chest X-Ray radiographic analysis completed successfully. DenseNet-121 findings extracted.';
  }

  try {
    const groqMessages = buildXRayInterpretationPrompt({
      xrayResult,
      patientProfile,
      recordTitle,
    });

    const groqResult = await callGroqChat({
      messages: groqMessages,
      temperature: 0.2,
      maxTokens: 500,
    });

    return groqResult.content;
  } catch (err) {
    console.warn('Groq synthesis for X-Ray findings failed (falling back to raw findings):', err.message);
    return 'Chest X-Ray analysis completed. Review the individual radiographic findings and consult your physician.';
  }
}
