import { catchAsync, AppError } from '../../middleware/error.middleware.js';
import {
  checkAiServiceHealth,
  analyzeChestXRay,
  fetchFileBufferFromUrl,
  synthesizeXRayReportWithGroq,
} from '../../services/ai.service.js';
import { User } from '../users/user.model.js';

/**
 * Health check endpoint for the Python AI microservice.
 * GET /api/ai/health
 */
const getHealth = catchAsync(async (req, res) => {
  const health = await checkAiServiceHealth();

  res.status(200).json({
    status: 'success',
    data: health,
  });
});

/**
 * Direct Chest X-Ray analysis endpoint.
 * Accepts either an uploaded file (multipart/form-data with key 'file')
 * or a JSON body with 'fileUrl'.
 * POST /api/ai/analyze-xray
 */
const analyzeChestXRayDirect = catchAsync(async (req, res) => {
  let fileBuffer;
  let filename = 'uploaded_xray.png';
  let contentType = 'image/png';

  if (req.file) {
    fileBuffer = req.file.buffer;
    filename = req.file.originalname || filename;
    contentType = req.file.mimetype || contentType;
  } else if (req.body?.fileUrl) {
    const downloaded = await fetchFileBufferFromUrl(req.body.fileUrl);
    fileBuffer = downloaded.buffer;
    filename = downloaded.filename || filename;
    contentType = downloaded.contentType || contentType;
  } else {
    throw new AppError(
      'An image file upload (multipart field "file") or "fileUrl" is required.',
      400
    );
  }

  const scanId = req.body?.scanId || req.body?.scan_id;

  // Run DenseNet-121 inference on the Python AI microservice
  const analysisResult = await analyzeChestXRay({
    fileBuffer,
    filename,
    contentType,
    scanId,
  });

  // Optionally generate clinical synthesis with Groq
  let summary = null;
  const shouldSynthesize = req.body?.synthesize !== false && req.body?.synthesize !== 'false';
  if (shouldSynthesize) {
    let patientProfile = null;
    if (req.user?.userId) {
      patientProfile = await User.findById(req.user.userId)
        .select('name age bloodGroup allergies')
        .lean();
    }

    summary = await synthesizeXRayReportWithGroq({
      xrayResult: analysisResult,
      patientProfile,
      recordTitle: filename,
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      ...analysisResult,
      summary,
    },
  });
});

export { getHealth, analyzeChestXRayDirect };
