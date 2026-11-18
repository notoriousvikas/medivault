import { Chat } from './chat.model.js';
import { callGroqChat } from '../../config/groq.js';
import { buildRagChatPrompt } from '../../services/prompts.service.js';
import { buildRagContext } from '../../services/rag.service.js';
import { AppError, catchAsync } from '../../middleware/error.middleware.js';

/**
 * Send a chat message, run RAG retrieval over patient records, and generate Groq AI response.
 * Records both the user message and assistant answer in the database for conversational memory and future RAG.
 */
const sendMessage = catchAsync(async (req, res) => {
  const { message, category = 'general', referenceId, referenceType = 'None' } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new AppError('Message text is required.', 400);
  }

  const userId = req.user.userId;

  // Retrieve RAG context across patient records, prescriptions, and past chat
  const ragContext = await buildRagContext({
    userId,
    query: message,
    targetRecordId: referenceType === 'Record' ? referenceId : null,
    targetPrescriptionId: referenceType === 'Prescription' ? referenceId : null,
  });

  // Construct grounded prompt
  const groqMessages = buildRagChatPrompt({
    userQuery: message.trim(),
    patientProfile: ragContext.patientProfile,
    relevantRecords: ragContext.records,
    relevantPrescriptions: ragContext.prescriptions,
    chatHistory: ragContext.chatHistory,
  });

  // Call Groq API
  const groqResult = await callGroqChat({
    messages: groqMessages,
    temperature: 0.3,
    maxTokens: 600,
  });

  // Record user message
  await Chat.create({
    userId,
    role: 'user',
    content: message.trim(),
    category,
    referenceId: referenceId || undefined,
    referenceType: ['Record', 'Prescription'].includes(referenceType)
      ? referenceType
      : 'None',
  });

  // Record assistant response with RAG context used
  const assistantChat = await Chat.create({
    userId,
    role: 'assistant',
    content: groqResult.content,
    category,
    referenceId: referenceId || undefined,
    referenceType: ['Record', 'Prescription'].includes(referenceType)
      ? referenceType
      : 'None',
    contextUsed: ragContext.contextUsed,
    metadata: {
      model: groqResult.model,
      usage: groqResult.usage,
    },
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
 * Retrieve chat history for the authenticated user
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
 * Clear all chat history for the authenticated user
 */
const clearChatHistory = catchAsync(async (req, res) => {
  await Chat.deleteMany({ userId: req.user.userId });
  res.status(204).end();
});

/**
 * Delete a specific chat message
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

export { sendMessage, getChatHistory, clearChatHistory, deleteChatMessage };
