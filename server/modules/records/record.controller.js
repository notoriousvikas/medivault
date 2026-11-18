import { Record } from './record.model.js';
import { Chat } from '../chat/chat.model.js';
import { callGroqChat } from '../../config/groq.js';
import { buildRecordAnalysisPrompt } from '../../services/prompts.service.js';
import { buildRagContext } from '../../services/rag.service.js';
import { AppError, catchAsync } from '../../middleware/error.middleware.js';
import uploadDocument from '../../utils/uploadDocument.js';

const listRecords = catchAsync(async (req, res) => {
  const records = await Record.find({ userId: req.user.userId }).sort({
    uploadDate: -1,
  });

  res.status(200).json({
    status: 'success',
    results: records.length,
    data: records,
  });
});

const getRecord = catchAsync(async (req, res) => {
  const record = await Record.findOne({
    _id: req.params.id,
    userId: req.user.userId,
  });

  if (!record) throw new AppError('Record not found.', 404);

  res.status(200).json({ status: 'success', data: record });
});

const createRecord = catchAsync(async (req, res) => {
  const { title, category, uploadDate, parsedData } = req.body;
  let fileUrl = req.body.fileUrl;

  if (!fileUrl && req.file) {
    const uploadResult = await uploadDocument(req.file);
    fileUrl = uploadResult.url;
  }

  if (!title || !category || !fileUrl) {
    throw new AppError('Title, category, and fileUrl are required.', 400);
  }

  let finalParsedData = parsedData;
  if (typeof parsedData === 'string') {
    try {
      finalParsedData = JSON.parse(parsedData);
    } catch {
      finalParsedData = {};
    }
  }

  const record = await Record.create({
    userId: req.user.userId,
    title,
    category,
    fileUrl,
    uploadDate: uploadDate || Date.now(),
    parsedData: finalParsedData || {},
  });

  res.status(201).json({ status: 'success', data: record });
});

const updateRecord = catchAsync(async (req, res) => {
  const { title, category, uploadDate, parsedData } = req.body;
  let fileUrl = req.body.fileUrl;

  if (!fileUrl && req.file) {
    const uploadResult = await uploadDocument(req.file);
    fileUrl = uploadResult.url;
  }

  const updateFields = {};
  if (title !== undefined) updateFields.title = title;
  if (category !== undefined) updateFields.category = category;
  if (fileUrl !== undefined) updateFields.fileUrl = fileUrl;
  if (uploadDate !== undefined) updateFields.uploadDate = uploadDate;
  if (parsedData !== undefined) {
    let finalParsedData = parsedData;
    if (typeof parsedData === 'string') {
      try {
        finalParsedData = JSON.parse(parsedData);
      } catch {
        throw new AppError('Invalid JSON format for parsedData.', 400);
      }
    }
    updateFields.parsedData = finalParsedData;
  }

  const record = await Record.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    updateFields,
    { new: true, runValidators: true }
  );

  if (!record) throw new AppError('Record not found.', 404);

  res.status(200).json({ status: 'success', data: record });
});

const deleteRecord = catchAsync(async (req, res) => {
  const record = await Record.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.userId,
  });

  if (!record) throw new AppError('Record not found.', 404);

  res.status(204).end();
});

/**
 * Perform deep clinical analysis of a medical record report using Groq and RAG context.
 * Automatically saves the analysis in the chat history for conversational memory.
 */
const analyzeRecord = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const record = await Record.findOne({
    _id: id,
    userId,
  });

  if (!record) {
    throw new AppError('Record not found.', 404);
  }

  // Retrieve grounded RAG context
  const ragContext = await buildRagContext({
    userId,
    targetRecordId: record._id,
  });

  // Build structured clinical prompt
  const groqMessages = buildRecordAnalysisPrompt({
    record,
    patientProfile: ragContext.patientProfile,
    pastRecords: ragContext.records,
    activePrescriptions: ragContext.prescriptions,
    chatHistory: ragContext.chatHistory,
  });

  // Execute Groq model analysis
  const groqResult = await callGroqChat({
    messages: groqMessages,
    temperature: 0.2,
    maxTokens: 600,
  });

  // Optionally persist analysis into record's parsedData for quick retrieval
  record.parsedData = {
    ...(record.parsedData || {}),
    aiAnalysis: groqResult.content,
    analyzedAt: new Date(),
  };
  await record.save();

  // Record this analysis into Chat history so it feeds future RAG conversations
  const chatEntry = await Chat.create({
    userId,
    role: 'assistant',
    content: groqResult.content,
    category: 'record_analysis',
    referenceId: record._id,
    referenceType: 'Record',
    contextUsed: ragContext.contextUsed,
    metadata: {
      model: groqResult.model,
      usage: groqResult.usage,
      analyzedAt: new Date(),
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      recordId: record._id,
      title: record.title,
      category: record.category,
      fileUrl: record.fileUrl,
      analysis: groqResult.content,
      chatMessageId: chatEntry._id,
      contextUsed: ragContext.contextUsed,
      metadata: groqResult.usage,
    },
  });
});

export {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  analyzeRecord,
};
