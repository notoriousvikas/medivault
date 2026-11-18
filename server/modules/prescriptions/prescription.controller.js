import { Prescription } from './prescription.model.js';
import { Chat } from '../chat/chat.model.js';
import { callGroqChat } from '../../config/groq.js';
import { buildPrescriptionAnalysisPrompt } from '../../services/prompts.service.js';
import { buildRagContext } from '../../services/rag.service.js';
import { AppError, catchAsync } from '../../middleware/error.middleware.js';

const listPrescriptions = catchAsync(async (req, res) => {
  const prescriptions = await Prescription.find({
    userId: req.user.userId,
  }).sort({ date: -1 });

  res.status(200).json({
    status: 'success',
    results: prescriptions.length,
    data: prescriptions,
  });
});

const getPrescription = catchAsync(async (req, res) => {
  const prescription = await Prescription.findOne({
    _id: req.params.id,
    userId: req.user.userId,
  });

  if (!prescription) throw new AppError('Prescription not found.', 404);

  res.status(200).json({ status: 'success', data: prescription });
});

const createPrescription = catchAsync(async (req, res) => {
  const { doctorName, medications, date } = req.body;

  if (!doctorName) {
    throw new AppError('Doctor name is required.', 400);
  }

  let parsedMedications = medications;
  if (typeof medications === 'string') {
    try {
      parsedMedications = JSON.parse(medications);
    } catch {
      throw new AppError('Invalid JSON format for medications.', 400);
    }
  }

  const prescription = await Prescription.create({
    userId: req.user.userId,
    doctorName,
    medications: Array.isArray(parsedMedications) ? parsedMedications : [],
    date: date || Date.now(),
  });

  res.status(201).json({ status: 'success', data: prescription });
});

const updatePrescription = catchAsync(async (req, res) => {
  const { doctorName, medications, date } = req.body;

  const updateFields = {};
  if (doctorName !== undefined) updateFields.doctorName = doctorName;
  if (date !== undefined) updateFields.date = date;
  if (medications !== undefined) {
    let parsedMedications = medications;
    if (typeof medications === 'string') {
      try {
        parsedMedications = JSON.parse(medications);
      } catch {
        throw new AppError('Invalid JSON format for medications.', 400);
      }
    }
    updateFields.medications = Array.isArray(parsedMedications)
      ? parsedMedications
      : [];
  }

  const prescription = await Prescription.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    updateFields,
    { new: true, runValidators: true }
  );

  if (!prescription) throw new AppError('Prescription not found.', 404);

  res.status(200).json({ status: 'success', data: prescription });
});

const deletePrescription = catchAsync(async (req, res) => {
  const prescription = await Prescription.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.userId,
  });

  if (!prescription) throw new AppError('Prescription not found.', 404);

  res.status(204).end();
});

/**
 * Perform deep clinical analysis of a prescription report using Groq and RAG context.
 * Automatically saves the analysis in the chat history for conversational memory.
 */
const analyzePrescription = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const prescription = await Prescription.findOne({
    _id: id,
    userId,
  });

  if (!prescription) {
    throw new AppError('Prescription not found.', 404);
  }

  // Retrieve grounded RAG context
  const ragContext = await buildRagContext({
    userId,
    targetPrescriptionId: prescription._id,
  });

  // Build structured clinical prompt
  const groqMessages = buildPrescriptionAnalysisPrompt({
    prescription,
    patientProfile: ragContext.patientProfile,
    activePrescriptions: ragContext.prescriptions,
    medicalRecords: ragContext.records,
    chatHistory: ragContext.chatHistory,
  });

  // Execute Groq model analysis
  const groqResult = await callGroqChat({
    messages: groqMessages,
    temperature: 0.2,
    maxTokens: 600,
  });

  // Record this analysis into Chat history so it feeds future RAG conversations
  const chatEntry = await Chat.create({
    userId,
    role: 'assistant',
    content: groqResult.content,
    category: 'prescription_analysis',
    referenceId: prescription._id,
    referenceType: 'Prescription',
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
      prescriptionId: prescription._id,
      doctorName: prescription.doctorName,
      date: prescription.date,
      medications: prescription.medications,
      analysis: groqResult.content,
      chatMessageId: chatEntry._id,
      contextUsed: ragContext.contextUsed,
      metadata: groqResult.usage,
    },
  });
});

export {
  listPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  deletePrescription,
  analyzePrescription,
};
