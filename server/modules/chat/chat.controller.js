import { Chat } from './chat.model.js';
import { callGroqChat } from '../../config/groq.js';
import { buildRagChatPrompt } from '../../services/prompts.service.js';
import { buildRagContext } from '../../services/rag.service.js';
import { AppError, catchAsync } from '../../middleware/error.middleware.js';
import {
  transcribeAudio,
  synthesizeSpeech,
  SARVAM_SUPPORTED_LANGUAGES,
} from '../../services/sarvam.service.js';
import { recordSymptomFromChat } from '../hotspot/hotspot.controller.js';

/**
 * Shared core AI query processing:
 * Grounds the query using RAG across patient records, prescriptions, and history,
 * executes Groq LLM completion, and persists conversational memory to MongoDB.
 */
async function processRagChatQuery({
  userId,
  message,
  category = 'general',
  referenceId,
  referenceType = 'None',
  preferredLanguage,
}) {
  // 1. Retrieve grounded clinical context across patient profile, records, prescriptions, and chat history
  const ragContext = await buildRagContext({
    userId,
    query: message,
    targetRecordId: referenceType === 'Record' ? referenceId : null,
    targetPrescriptionId: referenceType === 'Prescription' ? referenceId : null,
  });

  // 2. Build grounded chat prompt with patient context and language guidance
  const groqMessages = buildRagChatPrompt({
    userQuery: message.trim(),
    patientProfile: ragContext.patientProfile,
    relevantRecords: ragContext.records,
    relevantPrescriptions: ragContext.prescriptions,
    chatHistory: ragContext.chatHistory,
    preferredLanguage,
  });

  // 3. Generate response using Groq LLM
  const groqResult = await callGroqChat({
    messages: groqMessages,
    temperature: 0.3,
    maxTokens: 600,
  });

  // 4. Save user message in conversational memory
  const userChat = await Chat.create({
    userId,
    role: 'user',
    content: message.trim(),
    category,
    referenceId: referenceId || undefined,
    referenceType: ['Record', 'Prescription'].includes(referenceType) ? referenceType : 'None',
  });

  // 5. Save assistant response with RAG audit context
  const assistantChat = await Chat.create({
    userId,
    role: 'assistant',
    content: groqResult.content,
    category,
    referenceId: referenceId || undefined,
    referenceType: ['Record', 'Prescription'].includes(referenceType) ? referenceType : 'None',
    contextUsed: ragContext.contextUsed,
    metadata: {
      model: groqResult.model,
      usage: groqResult.usage,
      languageCode: preferredLanguage || 'en-IN',
    },
  });

  // 6. Passively extract symptoms from patient conversation for area-based health cluster detection
  recordSymptomFromChat({
    userId,
    message: message.trim(),
    preferredLanguage,
  }).catch((err) =>
    console.warn('[HealthRisk] Chat symptom passive extraction warning:', err.message)
  );

  return {
    userChat,
    assistantChat,
    groqResult,
    ragContext,
  };
}

/**
 * Send a standard text chat message.
 * POST /api/chat
 */
const sendMessage = catchAsync(async (req, res) => {
  const { message, category = 'general', referenceId, referenceType = 'None', languageCode } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new AppError('Message text is required.', 400);
  }

  const userId = req.user.userId;

  const { assistantChat } = await processRagChatQuery({
    userId,
    message,
    category,
    referenceId,
    referenceType,
    preferredLanguage: languageCode,
  });

  res.status(200).json({
    status: 'success',
    data: {
      reply: assistantChat.content,
      messageId: assistantChat._id,
      category: assistantChat.category,
      contextUsed: assistantChat.contextUsed,
      createdAt: assistantChat.createdAt,
      metadata: assistantChat.metadata,
    },
  });
});

/**
 * Complete Multilingual Voice AI Interaction:
 * 1. Audio received -> Transcribed via Sarvam Saaras v4 STT
 * 2. Transcribed query -> Grounded via MediVault RAG & Groq LLM
 * 3. Clinical answer -> Synthesized into Indic speech via Sarvam Bulbul v4 Flash TTS
 * 4. Returns recognized text, clinical response, and base64 audio stream
 * POST /api/chat/voice
 */
const voiceConversation = catchAsync(async (req, res) => {
  const userId = req.user.userId;

  if (!req.file || !req.file.buffer) {
    throw new AppError('Audio file is required for voice conversation.', 400);
  }

  const {
    languageCode = 'auto',
    category = 'general',
    referenceId,
    referenceType = 'None',
    speaker,
    pace,
  } = req.body;

  // 1. Transcribe speech using Sarvam Saaras v4
  const sttResult = await transcribeAudio({
    fileBuffer: req.file.buffer,
    filename: req.file.originalname || 'voice_query.wav',
    contentType: req.file.mimetype || 'audio/wav',
    languageCode: languageCode && languageCode !== 'auto' ? languageCode : undefined,
  });

  const recognizedText = (sttResult.transcript || '').trim();

  if (!recognizedText) {
    return res.status(200).json({
      status: 'success',
      data: {
        transcript: '',
        reply: 'No speech was detected. Please try speaking closer to your microphone or check your mic permissions.',
        languageCode: sttResult.languageCode || (languageCode !== 'auto' ? languageCode : 'en-IN'),
        audio: null,
      },
    });
  }

  const activeLanguage =
    sttResult.languageCode && sttResult.languageCode !== 'unknown'
      ? sttResult.languageCode
      : languageCode && languageCode !== 'auto'
      ? languageCode
      : /[\u0900-\u097F]/.test(recognizedText)
      ? 'hi-IN'
      : 'en-IN';

  // 2. Process query through existing Groq RAG pipeline
  const { assistantChat } = await processRagChatQuery({
    userId,
    message: recognizedText,
    category,
    referenceId,
    referenceType,
    preferredLanguage: activeLanguage,
  });

  // 3. Synthesize assistant response into speech using Sarvam Bulbul v4 Flash
  let ttsResult = null;
  try {
    ttsResult = await synthesizeSpeech({
      text: assistantChat.content,
      languageCode: activeLanguage,
      speaker: speaker || 'shubh_enhi_ads',
      pace: pace ? Number(pace) : 1.0,
    });
  } catch (ttsErr) {
    console.warn('Sarvam TTS warning, falling back to text-only reply:', ttsErr.message);
  }

  // Update assistantChat metadata with speech audit
  if (ttsResult) {
    assistantChat.metadata = {
      ...(assistantChat.metadata || {}),
      sarvam: {
        sttRequestId: sttResult.requestId,
        ttsRequestId: ttsResult.requestId,
        languageCode: activeLanguage,
        speaker: ttsResult.speaker,
      },
    };
    await assistantChat.save();
  }

  res.status(200).json({
    status: 'success',
    data: {
      transcript: recognizedText,
      reply: assistantChat.content,
      languageCode: activeLanguage,
      audio: ttsResult?.audioDataUrl || null,
      messageId: assistantChat._id,
      category: assistantChat.category,
      contextUsed: assistantChat.contextUsed,
      createdAt: assistantChat.createdAt,
      metadata: assistantChat.metadata,
    },
  });
});

/**
 * Transcribe recorded audio only using Sarvam Saaras v4 (allows user to see recognized text before sending).
 * POST /api/chat/transcribe
 */
const transcribeAudioOnly = catchAsync(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw new AppError('Audio file is required for transcription.', 400);
  }

  const { languageCode } = req.body;

  const result = await transcribeAudio({
    fileBuffer: req.file.buffer,
    filename: req.file.originalname || 'speech.wav',
    contentType: req.file.mimetype || 'audio/wav',
    languageCode: languageCode && languageCode !== 'auto' ? languageCode : undefined,
  });

  res.status(200).json({
    status: 'success',
    data: {
      transcript: result.transcript,
      languageCode: result.languageCode,
      requestId: result.requestId,
    },
  });
});

/**
 * Synthesize existing assistant message text into speech on-demand using Sarvam Bulbul v4 Flash.
 * POST /api/chat/synthesize
 */
const synthesizeSpeechOnly = catchAsync(async (req, res) => {
  const { text, languageCode = 'hi-IN', speaker = 'shubh_enhi_ads', pace = 1.0 } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new AppError('Text is required for speech synthesis.', 400);
  }

  const result = await synthesizeSpeech({
    text: text.trim(),
    languageCode,
    speaker,
    pace: Number(pace) || 1.0,
  });

  res.status(200).json({
    status: 'success',
    data: {
      audio: result.audioDataUrl,
      languageCode: result.languageCode,
      requestId: result.requestId,
      speaker: result.speaker,
    },
  });
});

/**
 * Return list of supported Indian languages for voice interaction.
 * GET /api/chat/languages
 */
const getSupportedLanguages = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: SARVAM_SUPPORTED_LANGUAGES,
  });
};

/**
 * Retrieve chat history for the authenticated user.
 * GET /api/chat
 */
const getChatHistory = catchAsync(async (req, res) => {
  const { category, page = 1, limit = 50 } = req.query;

  const query = { userId: req.user.userId };
  if (category) {
    query.category = category;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [messages, total] = await Promise.all([
    Chat.find(query).sort({ createdAt: 1 }).skip(skip).limit(limitNum),
    Chat.countDocuments(query),
  ]);

  res.status(200).json({
    status: 'success',
    results: messages.length,
    pagination: {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
    data: messages,
  });
});

/**
 * Clear all chat history for the authenticated user.
 * DELETE /api/chat
 */
const clearChatHistory = catchAsync(async (req, res) => {
  await Chat.deleteMany({ userId: req.user.userId });
  res.status(204).end();
});

/**
 * Delete a specific chat message.
 * DELETE /api/chat/:id
 */
const deleteChatMessage = catchAsync(async (req, res) => {
  const message = await Chat.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.userId,
  });

  if (!message) {
    throw new AppError('Chat message not found.', 404);
  }

  res.status(204).end();
});

/**
 * Optimized Live Turn for Real-time Voice Chat:
 * Accepts either pre-transcribed text (from Web Speech API) OR uploaded audio file (multipart).
 * Immediately processes query through RAG Groq pipeline and synthesizes speech via Sarvam Bulbul TTS.
 * This guarantees lightning-fast sub-second turns during live audio calls.
 * POST /api/chat/live-turn
 */
const liveTurn = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  let text = req.body?.message || '';
  let detectedLang = req.body?.languageCode || 'auto';
  let sttRequestId = null;

  // If audio file was uploaded
  if (req.file && req.file.buffer) {
    const sttResult = await transcribeAudio({
      fileBuffer: req.file.buffer,
      filename: req.file.originalname || 'live_voice.wav',
      contentType: req.file.mimetype || 'audio/wav',
      languageCode: detectedLang !== 'auto' ? detectedLang : undefined,
    });
    text = (sttResult.transcript || '').trim();
    detectedLang = sttResult.languageCode || detectedLang;
    sttRequestId = sttResult.requestId;
  }

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(200).json({
      status: 'success',
      data: {
        transcript: '',
        reply: 'I could not hear any speech clearly. Could you please repeat that?',
        audio: null,
      },
    });
  }

  const {
    category = 'general',
    referenceId,
    referenceType = 'None',
    speaker = 'shubh_enhi_ads',
    pace = 1.05,
  } = req.body || {};

  const activeLanguage =
    detectedLang && detectedLang !== 'auto' && detectedLang !== 'unknown'
      ? detectedLang
      : /[\u0900-\u097F]/.test(text)
      ? 'hi-IN'
      : 'en-IN';

  // Grounded RAG + Groq AI completion
  const { assistantChat } = await processRagChatQuery({
    userId,
    message: text.trim(),
    category,
    referenceId,
    referenceType,
    preferredLanguage: activeLanguage,
  });

  // Synthesize response into natural speech
  let ttsResult = null;
  try {
    ttsResult = await synthesizeSpeech({
      text: assistantChat.content,
      languageCode: activeLanguage,
      speaker: speaker || 'shubh_enhi_ads',
      pace: Math.max(0.8, Math.min(1.5, Number(pace) || 1.05)),
    });
  } catch (ttsErr) {
    console.warn('Live turn Sarvam TTS warning, falling back to text:', ttsErr.message);
  }

  if (ttsResult) {
    assistantChat.metadata = {
      ...(assistantChat.metadata || {}),
      sarvam: {
        sttRequestId,
        ttsRequestId: ttsResult.requestId,
        languageCode: activeLanguage,
        speaker: ttsResult.speaker,
      },
      liveAudio: true,
    };
    await assistantChat.save();
  }

  res.status(200).json({
    status: 'success',
    data: {
      transcript: text.trim(),
      reply: assistantChat.content,
      languageCode: activeLanguage,
      audio: ttsResult?.audioDataUrl || null,
      messageId: assistantChat._id,
      category: assistantChat.category,
      contextUsed: assistantChat.contextUsed,
      createdAt: assistantChat.createdAt,
      metadata: assistantChat.metadata,
    },
  });
});

export {
  sendMessage,
  voiceConversation,
  liveTurn,
  transcribeAudioOnly,
  synthesizeSpeechOnly,
  getSupportedLanguages,
  getChatHistory,
  clearChatHistory,
  deleteChatMessage,
};
