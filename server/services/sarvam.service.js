import { AppError } from '../middleware/error.middleware.js';

const SARVAM_STT_ENDPOINT = 'https://api.sarvam.ai/speech-to-text';
const SARVAM_TTS_ENDPOINT = 'https://api.sarvam.ai/text-to-speech';

/**
 * Supported Indian languages for Sarvam Saaras v4 (STT) and Bulbul v4 Flash (TTS).
 */
export const SARVAM_SUPPORTED_LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', defaultSpeaker: 'shubh_enhi_ads' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', defaultSpeaker: 'shubh_enhi_ads' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', defaultSpeaker: 'shubh_enhi_ads' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', defaultSpeaker: 'shubh_enhi_ads' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', defaultSpeaker: 'shubh_enhi_ads' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', defaultSpeaker: 'shubh_enhi_ads' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', defaultSpeaker: 'shubh_enhi_ads' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', defaultSpeaker: 'shubh_enhi_ads' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', defaultSpeaker: 'shubh_enhi_ads' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', defaultSpeaker: 'shubh_enhi_ads' },
  { code: 'od-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', defaultSpeaker: 'shubh_enhi_ads' },
];

/**
 * Strips heavy markdown formatting (bold, headers, bullets, links) so the TTS engine
 * speaks clean, natural clinical sentences without reading punctuation characters out loud.
 */
export function cleanTextForSpeech(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    // Replace markdown headers (### Header -> Header)
    .replace(/^#{1,6}\s+/gm, '')
    // Replace markdown bold/italic (**bold**, *italic*)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove code ticks `code`
    .replace(/`([^`]+)`/g, '$1')
    // Clean bullet symbols
    .replace(/^[-*•]\s+/gm, '')
    // Replace multiple newlines with a period and space for natural breathing pauses
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    // Collapse excess spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Transcribe user audio recording into text using Sarvam Saaras v4 STT.
 *
 * @param {Object} options
 * @param {Buffer} options.fileBuffer - Raw audio file bytes
 * @param {string} [options.filename='recording.wav']
 * @param {string} [options.contentType='audio/wav']
 * @param {string} [options.languageCode] - BCP-47 language code (or omit for automatic detection)
 * @param {string} [options.model='saaras:v4']
 * @param {string} [options.mode='transcribe'] - 'transcribe' | 'translate' | 'codemix'
 * @returns {Promise<{transcript: string, languageCode: string, requestId: string}>}
 */
export async function transcribeAudio({
  fileBuffer,
  filename = 'recording.wav',
  contentType = 'audio/wav',
  languageCode,
  model = 'saaras:v4',
  mode = 'transcribe',
}) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new AppError(
      'SARVAM_API_KEY is not configured in the environment. Please add it to your server .env file.',
      500
    );
  }

  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new AppError('Valid audio file buffer is required for transcription.', 400);
  }

  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: contentType || 'audio/wav' });
  formData.append('file', blob, filename || 'recording.wav');
  formData.append('model', model || 'saaras:v4');
  formData.append('mode', mode || 'transcribe');

  if (languageCode && languageCode !== 'auto' && languageCode !== 'unknown') {
    formData.append('language_code', languageCode);
  }

  let response;
  try {
    response = await fetch(SARVAM_STT_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
      },
      body: formData,
    });
  } catch (networkErr) {
    throw new AppError(`Sarvam STT network error: ${networkErr.message}`, 502);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Sarvam STT API Error:', response.status, errorBody);
    throw new AppError(
      `Sarvam STT failed (${response.status}): ${errorBody || response.statusText}`,
      response.status >= 500 ? 502 : response.status
    );
  }

  const result = await response.json();

  return {
    transcript: result.transcript || '',
    languageCode: result.language_code || languageCode || 'hi-IN',
    requestId: result.request_id || null,
  };
}

/**
 * Synthesize text into natural speech audio using Sarvam Bulbul v4 Flash TTS.
 *
 * @param {Object} options
 * @param {string} options.text - Text content to convert into speech
 * @param {string} [options.languageCode='hi-IN'] - BCP-47 language code (e.g. 'hi-IN', 'en-IN')
 * @param {string} [options.model='bulbul:v4-flash']
 * @param {string} [options.speaker='shubh_enhi_ads'] - Voice persona
 * @param {number} [options.pace=1.0] - Speech speed factor (0.5 to 2.0)
 * @param {number} [options.speechSampleRate=22050]
 * @returns {Promise<{audioBase64: string, audioDataUrl: string, requestId: string, languageCode: string}>}
 */
export async function synthesizeSpeech({
  text,
  languageCode = 'hi-IN',
  model = 'bulbul:v4-flash',
  speaker = 'shubh_enhi_ads',
  pace = 1.0,
  speechSampleRate = 22050,
}) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new AppError(
      'SARVAM_API_KEY is not configured in the environment. Please add it to your server .env file.',
      500
    );
  }

  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new AppError('Text is required for speech synthesis.', 400);
  }

  // Clean text and respect the 2,500 character limit of Bulbul models
  const cleaned = cleanTextForSpeech(text);
  const truncatedText = cleaned.slice(0, 2400);

  // Validate or fallback language code
  const isSupported = SARVAM_SUPPORTED_LANGUAGES.some((l) => l.code === languageCode);
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const validLanguageCode = isSupported && languageCode !== 'auto'
    ? languageCode
    : hasDevanagari
    ? 'hi-IN'
    : 'en-IN';

  const payload = {
    text: truncatedText,
    language_code: validLanguageCode,
    model: model || 'bulbul:v4-flash',
    speaker: speaker || 'shubh_enhi_ads',
    pace: Math.max(0.5, Math.min(2.0, Number(pace) || 1.0)),
    speech_sample_rate: speechSampleRate || 22050,
    audio_codec: 'wav',
  };

  let response;
  try {
    response = await fetch(SARVAM_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    throw new AppError(`Sarvam TTS network error: ${networkErr.message}`, 502);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Sarvam TTS API Error:', response.status, errorBody);
    throw new AppError(
      `Sarvam TTS failed (${response.status}): ${errorBody || response.statusText}`,
      response.status >= 500 ? 502 : response.status
    );
  }

  const result = await response.json();
  const audioBase64 = result.audios?.[0] || '';

  return {
    requestId: result.request_id || null,
    audioBase64,
    audioDataUrl: audioBase64 ? `data:audio/wav;base64,${audioBase64}` : null,
    languageCode: validLanguageCode,
    model: payload.model,
    speaker: payload.speaker,
  };
}
