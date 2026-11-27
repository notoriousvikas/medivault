import { User } from '../modules/users/user.model.js';
import { Record } from '../modules/records/record.model.js';
import { Prescription } from '../modules/prescriptions/prescription.model.js';
import { Chat } from '../modules/chat/chat.model.js';
import { ChatSession } from '../modules/chat/chat-session.model.js';

/**
 * RAG (Retrieval-Augmented Generation) Service
 * Retrieves and formats patient clinical data, records, prescriptions,
 * current session history, and important relevant memories from previous chats.
 */

const STOP_WORDS = new Set([
  'the', 'is', 'are', 'was', 'were', 'what', 'which', 'who', 'how', 'when',
  'where', 'why', 'can', 'could', 'would', 'should', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'shall', 'may', 'might', 'about', 'with',
  'from', 'that', 'this', 'these', 'those', 'for', 'and', 'but', 'or',
  'not', 'you', 'your', 'please', 'tell', 'give', 'know', 'help', 'hello',
  'hi', 'hey', 'thanks', 'thank', 'okay', 'ok', 'yes', 'no', 'can', 'want',
  'need', 'like', 'just', 'some', 'any', 'also', 'very', 'much', 'more',
  'kya', 'hai', 'hain', 'mujhe', 'mera', 'meri', 'mere', 'batao', 'karo',
]);

const CLINICAL_IMPORTANCE_TERMS = new Set([
  'allergy', 'allergic', 'allergies', 'pain', 'fever', 'cough', 'breath',
  'breathing', 'chest', 'heart', 'blood', 'pressure', 'sugar', 'diabetes',
  'insulin', 'bp', 'thyroid', 'cholesterol', 'hemoglobin', 'platelet',
  'platelets', 'wbc', 'rbc', 'tablet', 'capsule', 'syrup', 'dose', 'dosage',
  'medication', 'medications', 'medicine', 'medicines', 'prescription',
  'doctor', 'diagnosis', 'symptom', 'symptoms', 'report', 'scan', 'xray',
  'x-ray', 'mri', 'ct', 'lab', 'test', 'infection', 'antibiotic', 'surgery',
  'pregnant', 'pregnancy', 'asthma', 'kidney', 'liver', 'migraine',
  'headache', 'dizziness', 'nausea', 'vomiting', 'rash', 'swelling',
  'fatigue', 'weakness', 'reaction', 'interaction', 'chronic', 'history',
  'hospital', 'emergency', 'glucose', 'creatinine', 'vitamin', 'deficiency',
  'anemia', 'hypertension', 'paracetamol', 'ibuprofen', 'metformin',
  'amoxicillin', 'azithromycin', 'aspirin', 'atorvastatin',
]);

const RECALL_INTENT_PATTERN =
  /\b(previous|previously|earlier|last time|before|remember|mentioned|told you|asked you|past chat|old chat|pehle|pichli|yaad)\b/i;

const TRIVIAL_MESSAGE_PATTERN =
  /^(hi+|hello+|hey+|ok+|okay+|thanks+|thank you+|bye+|good morning|good evening|good night|namaste|haan|no|yes)[.!?\s]*$/i;

function extractMeaningfulTerms(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/**
 * Pure scoring function to evaluate whether a past chat message is both
 * relevant to the current query and clinically/conversationally important.
 */
function scorePastChatMessage(message, query) {
  const content = (message?.content || '').trim();
  if (content.length < 18 || TRIVIAL_MESSAGE_PATTERN.test(content)) {
    return 0;
  }

  const queryTerms = [...new Set(extractMeaningfulTerms(query))];
  const hasRecallIntent = RECALL_INTENT_PATTERN.test(query || '');

  const contentLower = content.toLowerCase();
  const contentTerms = new Set(extractMeaningfulTerms(content));

  let overlapScore = 0;
  let matchedTerms = 0;

  for (const term of queryTerms) {
    if (contentTerms.has(term)) {
      matchedTerms += 1;
      overlapScore += CLINICAL_IMPORTANCE_TERMS.has(term) ? 2.0 : 1.25;
    } else if (
      term.length >= 5 &&
      (contentLower.includes(term.slice(0, -1)) ||
        Array.from(contentTerms).some(
          (ct) => ct.length >= 5 && (ct.startsWith(term.slice(0, 5)) || term.startsWith(ct.slice(0, 5)))
        ))
    ) {
      matchedTerms += 1;
      overlapScore += 0.9;
    }
  }

  // Evaluate clinical/medical importance of the past message itself
  let clinicalImportance = 0;
  for (const term of contentTerms) {
    if (CLINICAL_IMPORTANCE_TERMS.has(term)) {
      clinicalImportance += 0.6;
    }
  }
  if (/\b\d+(\.\d+)?\s*(mg|ml|mcg|g\/dl|mmhg|bpm|%)\b/i.test(content)) {
    clinicalImportance += 1.0;
  }
  if (message.role === 'user' && content.length >= 40) {
    clinicalImportance += 0.4;
  }
  if (Array.isArray(message.contextUsed) && message.contextUsed.length > 0) {
    clinicalImportance += 0.3;
  }
  clinicalImportance = Math.min(clinicalImportance, 3.0);

  // Without explicit recall intent, require at least one meaningful query-term match
  if (!hasRecallIntent && matchedTerms === 0) {
    return 0;
  }

  // With recall intent, clinically important past messages can surface even with low term overlap
  if (hasRecallIntent && matchedTerms === 0 && clinicalImportance < 1.0) {
    return 0;
  }

  // Gentle recency bonus (up to +0.5 for messages within the last 7 days)
  let recencyBonus = 0;
  if (message.createdAt) {
    const ageDays = Math.max(
      0,
      (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    recencyBonus = Math.max(0, 0.5 - ageDays * 0.05);
  }

  return overlapScore + clinicalImportance * 0.8 + recencyBonus;
}

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
 * Retrieve recent chat history for conversational continuity within the active session.
 */
async function retrieveChatHistory(userId, { limit = 8, sessionId = null, category } = {}) {
  const query = { userId };
  if (sessionId) {
    query.sessionId = sessionId;
  }
  if (category) {
    query.category = category;
  }

  const messages = await Chat.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Return chronologically
  return messages.reverse();
}

/**
 * Retrieve important, relevant messages from PREVIOUS chat sessions (Cross-Chat RAG).
 * Only returns memories that pass the relevance & clinical importance threshold.
 */
async function retrieveRelevantPastChats(
  userId,
  { query = '', excludeSessionId = null, limit = 4, minScore = 1.6 } = {}
) {
  if (!query || !query.trim()) return [];

  const dbQuery = { userId };
  if (excludeSessionId) {
    dbQuery.sessionId = { $ne: excludeSessionId };
  }

  // Pull recent candidate messages across prior chats (capped for speed)
  const candidates = await Chat.find(dbQuery)
    .sort({ createdAt: -1 })
    .limit(120)
    .select('role content sessionId createdAt contextUsed')
    .lean();

  if (candidates.length === 0) return [];

  const scored = candidates
    .map((msg) => ({
      ...msg,
      ragScore: scorePastChatMessage(msg, query),
    }))
    .filter((msg) => msg.ragScore >= minScore)
    .sort((a, b) => {
      if (Math.abs(b.ragScore - a.ragScore) > 0.2) {
        return b.ragScore - a.ragScore;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit);

  if (scored.length === 0) return [];

  // Enrich with session titles for clear attribution
  const sessionIds = [
    ...new Set(scored.map((m) => m.sessionId?.toString()).filter(Boolean)),
  ];
  const sessions = sessionIds.length
    ? await ChatSession.find({ _id: { $in: sessionIds }, userId })
        .select('title')
        .lean()
    : [];
  const sessionTitleMap = new Map(sessions.map((s) => [s._id.toString(), s.title]));

  return scored.map((m) => ({
    _id: m._id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
    sessionId: m.sessionId,
    sessionTitle:
      (m.sessionId && sessionTitleMap.get(m.sessionId.toString())) || 'Previous Chat',
    ragScore: Number(m.ragScore.toFixed(2)),
  }));
}

/**
 * Assembles complete grounded RAG context for a patient inquiry or document analysis.
 */
async function buildRagContext({
  userId,
  query = '',
  sessionId = null,
  targetRecordId = null,
  targetPrescriptionId = null,
  chatLimit = 8,
}) {
  const [patientProfile, prescriptions, records, chatHistory, relevantPastChats] =
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
      retrieveChatHistory(userId, { limit: chatLimit, sessionId }),
      retrieveRelevantPastChats(userId, {
        query,
        excludeSessionId: sessionId,
        limit: 4,
      }),
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

  for (const pc of relevantPastChats) {
    contextUsed.push({
      title: `Previous Chat: ${pc.sessionTitle}`,
      docType: 'past_chat',
      snippet: `${pc.role === 'user' ? 'You asked' : 'AI noted'} (${new Date(
        pc.createdAt
      ).toLocaleDateString()}): ${pc.content.slice(0, 110)}${
        pc.content.length > 110 ? '...' : ''
      }`,
      refId: pc._id,
    });
  }

  return {
    patientProfile,
    prescriptions,
    records,
    chatHistory,
    relevantPastChats,
    contextUsed,
  };
}

export {
  retrievePatientProfile,
  retrievePrescriptions,
  retrieveRecords,
  retrieveChatHistory,
  retrieveRelevantPastChats,
  scorePastChatMessage,
  buildRagContext,
};
