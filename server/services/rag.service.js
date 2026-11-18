import { User } from '../modules/users/user.model.js';
import { Record } from '../modules/records/record.model.js';
import { Prescription } from '../modules/prescriptions/prescription.model.js';
import { Chat } from '../modules/chat/chat.model.js';

/**
 * RAG (Retrieval-Augmented Generation) Service
 * Retrieves and formats patient clinical data, records, prescriptions,
 * and past recorded conversations to ground LLM reasoning in verified context.
 */

/**
 * Retrieve patient profile and baseline health indicators.
 */
async function retrievePatientProfile(userId) {
  return User.findById(userId)
    .select('name age bloodGroup allergies emergencyContacts role')
    .lean();
}

/**
 * Retrieve prescriptions for the patient.
 */
async function retrievePrescriptions(userId, { limit = 10, targetPrescriptionId } = {}) {
  const query = { userId };
  const prescriptions = await Prescription.find(query)
    .sort({ date: -1 })
    .limit(limit)
    .lean();

  if (targetPrescriptionId) {
    const exists = prescriptions.some(
      (p) => p._id.toString() === targetPrescriptionId.toString()
    );
    if (!exists) {
      const target = await Prescription.findOne({
        _id: targetPrescriptionId,
        userId,
      }).lean();
      if (target) prescriptions.unshift(target);
    }
  }

  return prescriptions;
}

/**
 * Retrieve medical records with optional keyword matching against query.
 */
async function retrieveRecords(userId, { limit = 10, query, targetRecordId } = {}) {
  const dbQuery = { userId };

  if (query) {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (terms.length > 0) {
      const regex = new RegExp(terms.join('|'), 'i');
      dbQuery.$or = [{ title: regex }, { category: regex }];
    }
  }

  let records = await Record.find(dbQuery)
    .sort({ uploadDate: -1 })
    .limit(limit)
    .lean();

  // If search was too restrictive and found nothing, fall back to recent records
  if (records.length === 0) {
    records = await Record.find({ userId })
      .sort({ uploadDate: -1 })
      .limit(limit)
      .lean();
  }

  if (targetRecordId) {
    const exists = records.some(
      (r) => r._id.toString() === targetRecordId.toString()
    );
    if (!exists) {
      const target = await Record.findOne({
        _id: targetRecordId,
        userId,
      }).lean();
      if (target) records.unshift(target);
    }
  }

  return records;
}

/**
 * Retrieve recent chat history for conversational continuity.
 */
async function retrieveChatHistory(userId, { limit = 8, category } = {}) {
  const query = { userId };
  if (category) query.category = category;

  const messages = await Chat.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Return chronologically
  return messages.reverse();
}

/**
 * Assembles complete grounded RAG context for a patient inquiry or document analysis.
 */
async function buildRagContext({
  userId,
  query = '',
  targetRecordId = null,
  targetPrescriptionId = null,
  chatLimit = 8,
}) {
  const [patientProfile, prescriptions, records, chatHistory] =
    await Promise.all([
      retrievePatientProfile(userId),
      retrievePrescriptions(userId, {
        limit: 10,
        targetPrescriptionId,
      }),
      retrieveRecords(userId, {
        limit: 10,
        query,
        targetRecordId,
      }),
      retrieveChatHistory(userId, { limit: chatLimit }),
    ]);

  // Build metadata citations of context used
  const contextUsed = [];

  if (patientProfile) {
    contextUsed.push({
      title: `Patient Profile (${patientProfile.name})`,
      docType: 'profile',
      snippet: `Allergies: ${
        patientProfile.allergies?.join(', ') || 'None'
      } | Blood Group: ${patientProfile.bloodGroup || 'N/A'}`,
      refId: patientProfile._id,
    });
  }

  for (const p of prescriptions.slice(0, 4)) {
    const medsCount = p.medications?.length || 0;
    contextUsed.push({
      title: `Prescription by Dr. ${p.doctorName}`,
      docType: 'prescription',
      snippet: `${medsCount} medication(s) prescribed on ${new Date(
        p.date
      ).toLocaleDateString()}`,
      refId: p._id,
    });
  }

  for (const r of records.slice(0, 4)) {
    contextUsed.push({
      title: r.title,
      docType: 'record',
      snippet: `Category: ${r.category} | Date: ${new Date(
        r.uploadDate || r.createdAt
      ).toLocaleDateString()}`,
      refId: r._id,
    });
  }

  if (chatHistory.length > 0) {
    contextUsed.push({
      title: `Prior Chat Consultations`,
      docType: 'past_chat',
      snippet: `${chatHistory.length} previous conversation messages loaded into memory`,
    });
  }

  return {
    patientProfile,
    prescriptions,
    records,
    chatHistory,
    contextUsed,
  };
}

export {
  retrievePatientProfile,
  retrievePrescriptions,
  retrieveRecords,
  retrieveChatHistory,
  buildRagContext,
};
