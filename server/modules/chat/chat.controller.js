import { Chat } from './chat.model.js';
import { ChatSession } from './chat-session.model.js';
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

function deriveSessionTitle(text = '') {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'New Chat';
  if (cleaned.length <= 48) return cleaned;
  const sliced = cleaned.slice(0, 48);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 20 ? sliced.slice(0, lastSpace) : sliced).trim() + '...';
}

async function ensureChatSession({
  userId,
  sessionId,
  initialMessage = '',
  category = 'general',
  referenceId,
  referenceType = 'None',
}) {
  if (sessionId) {
    const existing = await ChatSession.findOne({ _id: sessionId, userId });
    if (!existing) {
      throw new AppError('Chat session not found.', 404);
    }
    return existing;
  }

  return ChatSession.create({
    userId,
    title: deriveSessionTitle(initialMessage),
    category,
    referenceId: referenceId || undefined,
    referenceType: ['Record', 'Prescription'].includes(referenceType) ? referenceType : 'None',
    lastMessageAt: new Date(),
  });
}

/**
 * Shared core AI query processing:
 * Grounds the query using RAG across patient records, prescriptions, current session history,
 * and important memories from previous chats, executes Groq LLM completion, and persists
 * conversational memory to MongoDB.
 */
async function processRagChatQuery({
  userId,
  message,
  sessionId,
  category = 'general',
  referenceId,
  referenceType = 'None',
  preferredLanguage,
}) {
  // 0. Resolve or create the active ChatSession
  const session = await ensureChatSession({
    userId,
    sessionId,
    initialMessage: message,
    category,
    referenceId,
    referenceType,
  });

  // 1. Retrieve grounded clinical context across patient profile, records, prescriptions, active session, and past chats
  const ragContext = await buildRagContext({
    userId,
    query: message,
    sessionId: session._id,
    targetRecordId: referenceType === 'Record' ? referenceId : null,
    targetPrescriptionId: referenceType === 'Prescription' ? referenceId : null,
  });

  // 2. Build grounded chat prompt with patient context, cross-chat RAG memories, and language guidance
  const groqMessages = buildRagChatPrompt({
    userQuery: message.trim(),
    patientProfile: ragContext.patientProfile,
    relevantRecords: ragContext.records,
    relevantPrescriptions: ragContext.prescriptions,
    chatHistory: ragContext.chatHistory,
    relevantPastChats: ragContext.relevantPastChats,
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
    sessionId: session._id,
    role: 'user',
    content: message.trim(),
    category,
    referenceId: referenceId || undefined,
    referenceType: ['Record', 'Prescription'].includes(referenceType) ? referenceType : 'None',
  });

  // 5. Save assistant response with RAG audit context
  const assistantChat = await Chat.create({
    userId,
    sessionId: session._id,
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

  // Update session metadata & auto-title if still 'New Chat'
  if (session.title === 'New Chat' && message.trim()) {
    session.title = deriveSessionTitle(message);
  }
  session.lastMessageAt = assistantChat.createdAt || new Date();
  session.lastMessagePreview = assistantChat.content.slice(0, 140);
  session.messageCount = (session.messageCount || 0) + 2;
  await session.save();

  // 6. Passively extract symptoms from patient conversation for area-based health cluster detection
  recordSymptomFromChat({
    userId,
    message: message.trim(),
    preferredLanguage,
  }).catch((err) =>
    console.warn('[HealthRisk] Chat symptom passive extraction warning:', err.message)
  );

  return {
    session,
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
  const {
    message,
    sessionId,
    category = 'general',
    referenceId,
    referenceType = 'None',
    languageCode,
  } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new AppError('Message text is required.', 400);
  }

  const userId = req.user.userId;

  const { session, assistantChat } = await processRagChatQuery({
    userId,
    message,
    sessionId,
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
      sessionId: session._id,
      sessionTitle: session.title,
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
    sessionId,
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
  const { session, assistantChat } = await processRagChatQuery({
    userId,
    message: recognizedText,
    sessionId,
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
      sessionId: session._id,
      sessionTitle: session.title,
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
 * List all chat sessions for the authenticated user (ChatGPT-style sidebar).
 * Migrates any legacy session-less messages into a "Previous Conversation" session once.
 * GET /api/chat/sessions
 */
const getSessions = catchAsync(async (req, res) => {
  const userId = req.user.userId;

  // One-time migration for legacy messages created before multi-session support
  const legacyFilter = {
    userId,
    $or: [{ sessionId: { $exists: false } }, { sessionId: null }],
  };
  const legacyCount = await Chat.countDocuments(legacyFilter);
  if (legacyCount > 0) {
    const [firstLegacy, lastLegacy] = await Promise.all([
      Chat.findOne(legacyFilter).sort({ createdAt: 1 }).lean(),
      Chat.findOne(legacyFilter).sort({ createdAt: -1 }).lean(),
    ]);
    const legacySession = await ChatSession.create({
      userId,
      title: deriveSessionTitle(firstLegacy?.content || 'Previous Conversation'),
      lastMessageAt: lastLegacy?.createdAt || new Date(),
      lastMessagePreview: (lastLegacy?.content || '').slice(0, 140),
      messageCount: legacyCount,
    });
    await Chat.updateMany(legacyFilter, { $set: { sessionId: legacySession._id } });
  }

  const sessions = await ChatSession.find({ userId })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    data: sessions,
  });
});

/**
 * Create a new chat session.
 * POST /api/chat/sessions
 */
const createSession = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const { title, category = 'general', referenceId, referenceType = 'None' } = req.body || {};

  const session = await ChatSession.create({
    userId,
    title: title && title.trim() ? title.trim().slice(0, 120) : 'New Chat',
    category,
    referenceId: referenceId || undefined,
    referenceType: ['Record', 'Prescription'].includes(referenceType) ? referenceType : 'None',
    lastMessageAt: new Date(),
  });

  res.status(201).json({
    status: 'success',
    data: session,
  });
});

/**
 * Rename an existing chat session.
 * PATCH /api/chat/sessions/:sessionId
 */
const renameSession = catchAsync(async (req, res) => {
  const { title } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new AppError('Session title is required.', 400);
  }

  const session = await ChatSession.findOneAndUpdate(
    { _id: req.params.sessionId, userId: req.user.userId },
    { $set: { title: title.trim().slice(0, 120) } },
    { new: true }
  );

  if (!session) {
    throw new AppError('Chat session not found.', 404);
  }

  res.status(200).json({
    status: 'success',
    data: session,
  });
});

/**
 * Delete a chat session and all its messages.
 * DELETE /api/chat/sessions/:sessionId
 */
const deleteSession = catchAsync(async (req, res) => {
  const session = await ChatSession.findOneAndDelete({
    _id: req.params.sessionId,
    userId: req.user.userId,
  });

  if (!session) {
    throw new AppError('Chat session not found.', 404);
  }

  await Chat.deleteMany({
    userId: req.user.userId,
    sessionId: session._id,
  });

  res.status(204).end();
});

/**
 * Retrieve chat history for the authenticated user (optionally scoped to a sessionId).
 * GET /api/chat
 */
const getChatHistory = catchAsync(async (req, res) => {
  const { category, sessionId, page = 1, limit = 50 } = req.query;

  const query = { userId: req.user.userId };
  if (sessionId) {
    query.sessionId = sessionId;
  }
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
 * Clear chat history for a specific session or all sessions for the authenticated user.
 * DELETE /api/chat
 */
const clearChatHistory = catchAsync(async (req, res) => {
  const { sessionId } = req.query;
  const userId = req.user.userId;

  if (sessionId) {
    await Chat.deleteMany({ userId, sessionId });
    await ChatSession.findOneAndUpdate(
      { _id: sessionId, userId },
      { $set: { messageCount: 0, lastMessagePreview: '' } }
    );
  } else {
    await Promise.all([
      Chat.deleteMany({ userId }),
      ChatSession.deleteMany({ userId }),
    ]);
  }
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
    sessionId,
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
  const { session, assistantChat } = await processRagChatQuery({
    userId,
    message: text.trim(),
    sessionId,
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
      sessionId: session._id,
      sessionTitle: session.title,
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
  getSessions,
  createSession,
  renameSession,
  deleteSession,
  getChatHistory,
  clearChatHistory,
  deleteChatMessage,
};
