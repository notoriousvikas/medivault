/**
 * Medical System Prompt establishing clinical safety and simple, patient-friendly clarity.
 */
const SYSTEM_MEDICAL_ANALYST_PROMPT = `You are AyuRaksha AI (Life Saver), a helpful, clear, and concise clinical assistant.
Your goal is to provide simple, direct, and easy-to-understand explanations of medical records, prescriptions, and health questions.

Core Directives:
1. KEEP IT SIMPLE & DIRECT: Give clear, concise answers without overwhelming tables, long academic outlines, or excessive boilerplate.
2. PLAIN LANGUAGE: Translate complex clinical jargon into plain, everyday language that any patient can easily understand.
3. GROUNDED IN PATIENT DATA: Use the provided patient profile, allergies, and records accurately.
4. ESSENTIAL SAFETY ONLY: Highlight genuine safety warnings (like drug interactions or serious red flags) in 1-2 brief sentences.`;

const SYSTEM_CHAT_PROMPT = `You are AyuRaksha AI (Life Saver), a friendly, concise, and focused medical assistant.

STRICT DOMAIN SCOPE:
- You ONLY answer questions related to medicine, health, symptoms, medications, lab reports, wellness, or AyuRaksha platform features (such as uploading medical records, emergency QR passes, doctor access codes, and health timelines).
- If the user's inquiry is NOT related to health, medicine, or AyuRaksha (e.g., coding, general trivia, politics, entertainment, games, math, essays, or non-medical topics), you MUST politely decline and ignore it. Respond with a single polite sentence: "I am AyuRaksha AI (Life Saver), your clinical health assistant. I can only assist with medical questions and managing your AyuRaksha health records. Please feel free to ask a health-related query!"
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
 * Helper to identify if a record is an actual chest X-ray
 */
function isXRayRecord(record) {
  if (!record) return false;
  const cat = (record.category || '').toLowerCase();
  const title = (record.title || '').toLowerCase();
  if (
    cat.includes('lab') ||
    cat.includes('blood') ||
    cat.includes('prescription') ||
    cat.includes('discharge') ||
    cat.includes('note') ||
    cat.includes('pathology') ||
    title.includes('lab') ||
    title.includes('blood') ||
    title.includes('cbc') ||
    title.includes('prescription')
  ) {
    return false;
  }
  if (cat.includes('xray') || cat.includes('x-ray') || cat.includes('radiograph')) return true;
  if (
    (cat === 'scan' || cat.includes('scan')) &&
    (title.includes('xray') || title.includes('x-ray') || title.includes('chest') || title.includes('radiograph') || title.includes('cxr'))
  ) {
    return true;
  }
  return false;
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

  const isXRay = isXRayRecord(record);

  // If the record is NOT a chest X-Ray, filter out past X-ray discussions to prevent prompt contamination
  const cleanChatHistory = isXRay
    ? chatHistory
    : chatHistory.filter((c) => {
        const text = (c.content || '').toLowerCase();
        return (
          !text.includes('x-ray') &&
          !text.includes('radiograph') &&
          !text.includes('lung opacity') &&
          !text.includes('densenet') &&
          !text.includes('pneumothorax') &&
          !text.includes('cardiomegaly')
        );
      });

  const recordContent = `
- Document Title: ${record.title}
- Document Category: ${record.category}
- Upload Date: ${new Date(record.uploadDate || record.createdAt).toLocaleDateString()}
- Extracted Clinical Data / Biomarkers: ${
    record.parsedData && Object.keys(record.parsedData).length > 0
      ? JSON.stringify(record.parsedData, null, 2)
      : 'No pre-parsed numeric data. Interpret based on title, category, and standard clinical reference for this diagnostic test.'
  }
`.trim();

  const pastRecordsSummary = pastRecords
    .filter((r) => r._id?.toString() !== record._id?.toString())
    .slice(0, 4)
    .map(
      (r) =>
        `- [${new Date(r.uploadDate || r.createdAt).toLocaleDateString()}] ${r.title} (${r.category})`
    )
    .join('\n') || 'None.';

  const activeMeds = activePrescriptions
    .flatMap((p) => p.medications || [])
    .map((m) => `- ${m.name} (${m.dosage})`)
    .join('\n') || 'None recorded.';

  const chatContextText = cleanChatHistory
    .slice(-3)
    .map((c) => `${c.role.toUpperCase()}: ${c.content}`)
    .join('\n') || 'None.';

  const categoryGuidance = isXRay
    ? `DOCUMENT TYPE: CHEST RADIOGRAPH / IMAGING
- Focus on pulmonary markings, cardiothoracic structures, pleural spaces, and radiologic features.`
    : `DOCUMENT TYPE: ${record.category.toUpperCase()} (LABORATORY / CLINICAL DOCUMENT)
- THIS IS NOT A CHEST X-RAY OR RADIOGRAPH.
- STRICT NEGATIVE DIRECTIVE: DO NOT mention lungs, lung opacity, chest X-rays, radiographs, infiltration, pneumothorax, effusion, cardiomegaly, or CT/MRI imaging.
- DO NOT borrow findings from previous imaging visits or past chat discussions.
- Focus strictly on laboratory medicine for this specific test (${record.title} - ${record.category}), such as complete blood count (CBC), hematology (hemoglobin, WBC/leukocytes, platelets, RBC indices), blood biochemistry, or pathology indicators.`;

  return [
    { role: 'system', content: SYSTEM_MEDICAL_ANALYST_PROMPT },
    {
      role: 'user',
      content: `Please conduct a grounded clinical interpretation of this medical document.

### 📋 PATIENT PROFILE
${patientInfo}

### 📄 TARGET MEDICAL DOCUMENT (ANALYZE THIS ONLY)
${recordContent}

### 🔬 CLINICAL BOUNDARIES & INSTRUCTIONS:
${categoryGuidance}

### 📈 PATIENT BACKGROUND (FOR REFERENCE ONLY — DO NOT CONFUSE WITH TARGET DOCUMENT)
- Prior Records: ${pastRecordsSummary}
- Active Medications: ${activeMeds}
- Prior Chat Context: ${chatContextText}

---

### REQUIRED OUTPUT FORMAT:
Provide a clear, simple, and patient-friendly analysis (2-3 short paragraphs or clean bullet points):
1. **Summary**: A clear 2-3 sentence overview explaining what this ${record.category} (${record.title}) is and what it tells the patient.
2. **Notable Findings / Key Markers**: Highlight key parameters relevant to this test (e.g. for CBC/blood test: Hemoglobin, White Blood Cells, Platelets; for metabolic: Glucose, Kidney/Liver markers) and explain what normal vs abnormal values signify.
3. **Next Steps**: 2-3 practical questions or follow-up points to discuss with their treating doctor or pathologist.`,
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
  preferredLanguage,
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

  let languageInstruction = '';
  if (preferredLanguage && preferredLanguage !== 'en-IN' && preferredLanguage !== 'auto') {
    languageInstruction = `\n[SPOKEN/WRITTEN LANGUAGE INSTRUCTION]\nThe user has explicitly requested language code "${preferredLanguage}". You MUST respond in that language (e.g. Hindi, Bengali, Tamil, Telugu, etc.) using clear, natural, and warm sentences. Keep formatting simple so it sounds natural when read aloud via Text-to-Speech. Avoid heavy tables or excessive asterisks.`;
  } else {
    languageInstruction = `\n[LANGUAGE INSTRUCTION]\nRespond in the SAME language that the user used to ask their question. If the user writes or speaks in English, respond in clear English. If the user writes or speaks in Hindi or another Indian language, respond in that language. Use warm, concise, and easy-to-understand sentences. Avoid complex markdown tables or excessive asterisks so the response can be read or spoken aloud naturally.`;
  }

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
${languageInstruction}

If the query is NOT related to medical, health, or AyuRaksha topics, ignore/decline it politely with: "I am AyuRaksha's health assistant. I can only assist with medical questions and managing your AyuRaksha health records. Please feel free to ask a health-related query!"

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

/**
 * Builds prompt for Plain-Language Clinical Interpretation of TorchXRayVision DenseNet-121 findings.
 */
function buildXRayInterpretationPrompt({
  xrayResult,
  patientProfile,
  recordTitle = 'Chest X-Ray',
}) {
  const patientInfo = `
- Name: ${patientProfile?.name || 'Patient'}
- Age: ${patientProfile?.age || 'Not specified'}
- Blood Group: ${patientProfile?.bloodGroup || 'Not specified'}
- Known Allergies: ${
    patientProfile?.allergies?.length
      ? patientProfile.allergies.join(', ')
      : 'None reported'
  }
`.trim();

  // Sort findings by raw score descending to highlight top signals
  const sortedFindings = [...(xrayResult.findings || [])].sort(
    (a, b) => (b.raw_score || 0) - (a.raw_score || 0)
  );

  const findingsText = sortedFindings
    .map(
      (f, i) =>
        `${i + 1}. **${f.label}**: raw score ${f.raw_score?.toFixed(4) ?? f.raw_score}`
    )
    .join('\n');

  return [
    {
      role: 'system',
      content: `${SYSTEM_MEDICAL_ANALYST_PROMPT}

You are translating computational DenseNet-121 radiology model findings into a clear, patient-friendly explanation.
Always adhere to medical safety: raw model scores are NOT clinical diagnoses.`,
    },
    {
      role: 'user',
      content: `Please provide a clear, empathetic, and concise patient-friendly clinical interpretation for the following Chest X-Ray radiograph analysis.

### 📋 PATIENT PROFILE
${patientInfo}

### 🩻 RADIOLOGY RECORD: ${recordTitle}
- Modality: ${xrayResult.modality || 'Chest X-Ray (CXR)'}
- Neural Network Model: ${xrayResult.model_name || 'DenseNet-121'} (${xrayResult.model_version || 'densenet121-res224-all'})
- Compute Device: ${xrayResult.device || 'CPU'}
- Execution Time: ${xrayResult.execution_time_ms || 0} ms

### 🔬 TOP PATHOLOGY PATTERN SCORES (TorchXRayVision)
${findingsText}

### ⚠️ CLINICAL DISCLAIMER
${xrayResult.clinical_disclaimer || 'Research prototype only. Not a medical diagnosis.'}

---

### INSTRUCTIONS:
Provide a clear, brief, and patient-centered explanation (2-3 short paragraphs max):
1. **Summary of Findings**: Explain what the radiograph patterns indicate in everyday words (highlight the top 2-3 highest-scoring findings, and note if other findings are minimal/low).
2. **Context & Plain Language Explanation**: Briefly explain what those top terms mean in normal human terms without inducing anxiety.
3. **Safety Guidance & Next Steps**: Mention clearly that these numbers are computational pattern-matching scores rather than a doctor's diagnosis, and advise discussing the scan with their treating doctor or radiologist.`,
    },
  ];
}

export {
  SYSTEM_MEDICAL_ANALYST_PROMPT,
  buildPrescriptionAnalysisPrompt,
  buildRecordAnalysisPrompt,
  buildRagChatPrompt,
  buildXRayInterpretationPrompt,
};
