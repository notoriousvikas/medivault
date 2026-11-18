/**
 * Medical System Prompt establishing clinical safety and simple, patient-friendly clarity.
 */
const SYSTEM_MEDICAL_ANALYST_PROMPT = `You are Aarogya AI, a helpful, clear, and concise clinical assistant for MediVault.
Your goal is to provide simple, direct, and easy-to-understand explanations of medical records, prescriptions, and health questions.

Core Directives:
1. KEEP IT SIMPLE & DIRECT: Give clear, concise answers without overwhelming tables, long academic outlines, or excessive boilerplate.
2. PLAIN LANGUAGE: Translate complex clinical jargon into plain, everyday language that any patient can easily understand.
3. GROUNDED IN PATIENT DATA: Use the provided patient profile, allergies, and records accurately.
4. ESSENTIAL SAFETY ONLY: Highlight genuine safety warnings (like drug interactions or serious red flags) in 1-2 brief sentences.`;

const SYSTEM_CHAT_PROMPT = `You are Aarogya AI, a friendly, concise, and focused medical assistant for MediVault.

STRICT DOMAIN SCOPE:
- You ONLY answer questions related to medicine, health, symptoms, medications, lab reports, wellness, or MediVault platform features (such as uploading medical records, emergency QR passes, doctor access codes, and health timelines).
- If the user's inquiry is NOT related to health, medicine, or MediVault (e.g., coding, general trivia, politics, entertainment, games, math, essays, or non-medical topics), you MUST politely decline and ignore it. Respond with a single polite sentence: "I am Aarogya AI, MediVault's clinical health assistant. I can only assist with medical questions and managing your MediVault health records. Please feel free to ask a health-related query!"
- Never engage in non-medical or off-topic discussions.

Instructions for valid health inquiries:
1. Give a SIMPLE, DIRECT, and CONCISE answer to the user's question (usually 2-4 short paragraphs or a few brief bullet points).
2. DO NOT output large markdown tables, encyclopedic lists, or lengthy academic essays.
3. Speak in warm, plain language that is easy for a patient to digest.
4. If there are critical warning signs or red flags, mention them briefly in one or two clear bullet points.
5. Keep any medical advice practical and actionable, reminding them simply to consult their doctor for personalized care.`;

/**
 * Builds prompt for comprehensive prescription analysis using RAG context.
 */
function buildPrescriptionAnalysisPrompt({
  prescription,
  patientProfile,
  activePrescriptions = [],
  medicalRecords = [],
  chatHistory = [],
}) {
  const patientInfo = `
- Name: ${patientProfile?.name || 'Unknown'}
- Age: ${patientProfile?.age || 'Not specified'}
- Blood Group: ${patientProfile?.bloodGroup || 'Not specified'}
- Known Allergies: ${
    patientProfile?.allergies?.length
      ? patientProfile.allergies.join(', ')
      : 'None reported'
  }
`.trim();

  const currentMedsText = prescription.medications?.length
    ? prescription.medications
        .map(
          (m, idx) =>
            `${idx + 1}. **${m.name}** | Dosage: ${m.dosage} | Frequency: ${m.frequency} | Duration: ${m.duration}`
        )
        .join('\n')
    : 'No individual medications specified.';

  const otherActiveMedsText = activePrescriptions
    .filter((p) => p._id?.toString() !== prescription._id?.toString())
    .flatMap((p) => p.medications || [])
    .map((m) => `- ${m.name} (${m.dosage}, ${m.frequency})`)
    .join('\n') || 'None recorded.';

  const relevantRecordsSummary = medicalRecords
    .slice(0, 5)
    .map(
      (r) =>
        `- [${new Date(r.uploadDate || r.createdAt).toLocaleDateString()}] ${r.title} (${r.category})`
    )
    .join('\n') || 'No previous medical records found.';

  const chatContextText = chatHistory
    .slice(-4)
    .map((c) => `${c.role.toUpperCase()}: ${c.content}`)
    .join('\n') || 'No previous discussion.';

  return [
    { role: 'system', content: SYSTEM_MEDICAL_ANALYST_PROMPT },
    {
      role: 'user',
      content: `Please perform an in-depth clinical analysis of the following prescription report using the provided patient health record context.

### 📋 PATIENT PROFILE (RAG Grounding)
${patientInfo}

### 💊 CURRENT PRESCRIPTION DETAILS
- Prescribing Doctor: ${prescription.doctorName}
- Date Prescribed: ${new Date(prescription.date).toLocaleDateString()}
- Prescribed Medications:
${currentMedsText}

### 🔄 OTHER ACTIVE MEDICATIONS (from historical prescriptions)
${otherActiveMedsText}

### 📁 RELEVANT MEDICAL RECORDS / LAB HISTORY
${relevantRecordsSummary}

### 💬 RECENT PATIENT QUERIES / CHAT CONTEXT
${chatContextText}

---

### INSTRUCTIONS:
Provide a simple, concise, and easy-to-read review in plain language (keep it brief):
1. **Quick Overview**: What these medications treat in plain language.
2. **Safety & Allergies**: Check against known allergies (${patientProfile?.allergies?.join(', ') || 'None'}) and any interactions.
3. **How to Take & Key Advice**: 2-3 brief practical bullet points.`,
    },
  ];
}

/**
 * Builds prompt for comprehensive medical record / lab report analysis using RAG context.
 */
function buildRecordAnalysisPrompt({
  record,
  patientProfile,
  pastRecords = [],
  activePrescriptions = [],
  chatHistory = [],
}) {
  const patientInfo = `
- Name: ${patientProfile?.name || 'Unknown'}
- Age: ${patientProfile?.age || 'Not specified'}
- Blood Group: ${patientProfile?.bloodGroup || 'Not specified'}
- Known Allergies: ${
    patientProfile?.allergies?.length
      ? patientProfile.allergies.join(', ')
      : 'None reported'
  }
`.trim();

  const recordContent = `
- Title: ${record.title}
- Category: ${record.category}
- Date: ${new Date(record.uploadDate || record.createdAt).toLocaleDateString()}
- File URL: ${record.fileUrl || 'N/A'}
- Extracted / Parsed Data: ${
    typeof record.parsedData === 'object'
      ? JSON.stringify(record.parsedData, null, 2)
      : record.parsedData || 'None available'
  }
`.trim();

  const pastRecordsSummary = pastRecords
    .filter((r) => r._id?.toString() !== record._id?.toString())
    .slice(0, 5)
    .map(
      (r) =>
        `- [${new Date(r.uploadDate || r.createdAt).toLocaleDateString()}] ${r.title} (${r.category})`
    )
    .join('\n') || 'No previous records.';

  const activeMeds = activePrescriptions
    .flatMap((p) => p.medications || [])
    .map((m) => `- ${m.name} (${m.dosage})`)
    .join('\n') || 'None recorded.';

  const chatContextText = chatHistory
    .slice(-4)
    .map((c) => `${c.role.toUpperCase()}: ${c.content}`)
    .join('\n') || 'None.';

  return [
    { role: 'system', content: SYSTEM_MEDICAL_ANALYST_PROMPT },
    {
      role: 'user',
      content: `Please conduct a comprehensive clinical analysis of this medical record / diagnostic report using the retrieved patient background.

### 📋 PATIENT PROFILE
${patientInfo}

### 📄 TARGET MEDICAL RECORD REPORT
${recordContent}

### 📈 HISTORICAL RECORDS & TREND CONTEXT
${pastRecordsSummary}

### 💊 CURRENT ACTIVE MEDICATIONS
${activeMeds}

### 💬 RECENT CONSULTATION CONTEXT
${chatContextText}

---

### INSTRUCTIONS:
Provide a simple, concise, and clear analysis of this report in plain language (keep it brief and avoid massive tables):
1. **Summary**: A short 2-3 sentence overview of what the test shows.
2. **Notable Values**: Mention any values that are out of range or important, in simple terms.
3. **Next Steps**: 2-3 simple recommendations for the patient to discuss with their doctor.`,
    },
  ];
}

/**
 * Builds conversational prompt for RAG-augmented health chat queries.
 */
function buildRagChatPrompt({
  userQuery,
  patientProfile,
  relevantRecords = [],
  relevantPrescriptions = [],
  chatHistory = [],
}) {
  const patientProfileSection = patientProfile
    ? `Patient: ${patientProfile.name}, Age: ${patientProfile.age || 'N/A'}, Blood Group: ${
        patientProfile.bloodGroup || 'N/A'
      }, Allergies: ${
        patientProfile.allergies?.length
          ? patientProfile.allergies.join(', ')
          : 'None reported'
      }`
    : 'Profile not available.';

  const recordsContext = relevantRecords.length
    ? relevantRecords
        .map((r, i) => {
          const parsed =
            r.parsedData && Object.keys(r.parsedData).length > 0
              ? JSON.stringify(r.parsedData)
              : '';
          return `Record ${i + 1}: "${r.title}" (Category: ${r.category}, Date: ${new Date(
            r.uploadDate || r.createdAt
          ).toLocaleDateString()}) ${parsed ? `[Data: ${parsed}]` : ''}`;
        })
        .join('\n')
    : 'No relevant records found.';

  const prescriptionsContext = relevantPrescriptions.length
    ? relevantPrescriptions
        .map((p, i) => {
          const meds = (p.medications || [])
            .map((m) => `${m.name} (${m.dosage}, ${m.frequency})`)
            .join('; ');
          return `Prescription ${i + 1}: Dr. ${p.doctorName} (${new Date(
            p.date
          ).toLocaleDateString()}) - Medications: ${meds || 'None listed'}`;
        })
        .join('\n')
    : 'No relevant prescriptions found.';

  const messages = [
    {
      role: 'system',
      content: `${SYSTEM_CHAT_PROMPT}

--- PATIENT & CLINICAL CONTEXT (RAG) ---
[PATIENT PROFILE]
${patientProfileSection}

[MEDICAL RECORDS]
${recordsContext}

[ACTIVE & HISTORICAL PRESCRIPTIONS]
${prescriptionsContext}
----------------------------------------

If the query is NOT related to medical, health, or MediVault topics, ignore/decline it politely with: "I am MediVault's health assistant. I can only assist with medical questions and managing your MediVault health records. Please feel free to ask a health-related query!"

Otherwise, give a simple, concise, and direct answer to the user's health question in plain conversational language. Do not output big tables or checklists unless specifically requested.`,
    },
  ];

  // Append recent conversational turns
  for (const turn of chatHistory.slice(-8)) {
    if (['user', 'assistant'].includes(turn.role)) {
      messages.push({
        role: turn.role,
        content: turn.content,
      });
    }
  }

  // Append the current user query
  messages.push({
    role: 'user',
    content: userQuery,
  });

  return messages;
}

export {
  SYSTEM_MEDICAL_ANALYST_PROMPT,
  buildPrescriptionAnalysisPrompt,
  buildRecordAnalysisPrompt,
  buildRagChatPrompt,
};
