/**
 * Controlled clinical symptom taxonomy and rule-based semantic normalizer.
 * Maps patient-reported terms (English & Indic conversational speech)
 * to canonical public health categories without leaking PII to external AI endpoints.
 */

export const SYMPTOM_TAXONOMY = {
  Fever: {
    label: 'Fever & Elevated Temperature',
    keywords: [
      'fever',
      'high temperature',
      'high temp',
      'pyrexia',
      'feverish',
      'burning up',
      'temp',
      'hyperthermia',
      // Indic / Hinglish transliterations
      'bukhar',
      'bukhaar',
      'taap',
      'garam sharir',
      'jwar',
    ],
    weight: 1.2,
  },
  'Respiratory / Cough': {
    label: 'Respiratory & Cough',
    keywords: [
      'cough',
      'dry cough',
      'wet cough',
      'sore throat',
      'throat pain',
      'throat irritation',
      'shortness of breath',
      'breathlessness',
      'difficulty breathing',
      'wheezing',
      'congestion',
      'chest congestion',
      'runny nose',
      'stuffy nose',
      'sneezing',
      'cold',
      'flu',
      // Indic / Hinglish transliterations
      'khansi',
      'khaansi',
      'sardi',
      'zukham',
      'jukham',
      'gala kharab',
      'gale me dard',
      'gale mein dard',
      'saans lene me dikkat',
      'saas',
      'naak behna',
    ],
    weight: 1.3,
  },
  Headache: {
    label: 'Headache & Migraine',
    keywords: [
      'headache',
      'severe headache',
      'migraine',
      'throbbing head',
      'head pressure',
      'sinus headache',
      'head pain',
      // Indic / Hinglish
      'sir dard',
      'sar dard',
      'matha dard',
      'sirdard',
      'sardard',
    ],
    weight: 1.0,
  },
  'Body Pain / Fatigue': {
    label: 'Body Pain & Fatigue',
    keywords: [
      'body pain',
      'body ache',
      'muscle ache',
      'muscle pain',
      'myalgia',
      'joint pain',
      'arthralgia',
      'fatigue',
      'tiredness',
      'exhaustion',
      'lethargy',
      'weakness',
      'malaise',
      // Indic / Hinglish
      'badan dard',
      'kamar dard',
      'jodon me dard',
      'thakan',
      'thakawat',
      'kamzori',
      'kamjori',
      'susti',
    ],
    weight: 1.1,
  },
  Gastrointestinal: {
    label: 'Gastrointestinal & Stomach',
    keywords: [
      'diarrhea',
      'loose motions',
      'vomiting',
      'nausea',
      'stomach ache',
      'abdominal pain',
      'stomach cramps',
      'food poisoning',
      'indigestion',
      'acid reflux',
      'loss of appetite',
      // Indic / Hinglish
      'pet dard',
      'dast',
      'ulti',
      'loose motion',
      'pet kharab',
      'gas',
      'apach',
    ],
    weight: 1.25,
  },
  'Skin Rash / Lesions': {
    label: 'Skin Rash & Lesions',
    keywords: [
      'rash',
      'skin rash',
      'hives',
      'itching',
      'red bumps',
      'measles',
      'pox',
      'skin spots',
      'erythema',
      // Indic / Hinglish
      'khujli',
      'daane',
      'laal daane',
      'chakatte',
    ],
    weight: 1.2,
  },
  'Chills & Sweats': {
    label: 'Chills & Night Sweats',
    keywords: [
      'chills',
      'shivering',
      'cold sweats',
      'night sweats',
      'sweating',
      // Indic / Hinglish
      'thand lagna',
      'kampkampi',
      'paseena',
    ],
    weight: 1.0,
  },
};

/**
 * Normalizes an array of free-text symptom phrases into canonical taxonomy categories.
 *
 * @param {string[]} rawSymptoms Free-text symptom inputs
 * @returns {string[]} Deduplicated canonical categories
 */
export function normalizeSymptoms(rawSymptoms = []) {
  if (!Array.isArray(rawSymptoms) || rawSymptoms.length === 0) {
    return ['General Health Issue'];
  }

  const matchedCategories = new Set();

  for (const raw of rawSymptoms) {
    if (!raw || typeof raw !== 'string') continue;
    const clean = raw.trim().toLowerCase();

    let matched = false;
    for (const [category, meta] of Object.entries(SYMPTOM_TAXONOMY)) {
      if (meta.keywords.some((kw) => clean.includes(kw) || kw.includes(clean))) {
        matchedCategories.add(category);
        matched = true;
      }
    }

    if (!matched && clean.length > 0) {
      matchedCategories.add('Other Symptoms');
    }
  }

  return matchedCategories.size > 0
    ? Array.from(matchedCategories)
    : ['General Health Issue'];
}

/**
 * Automatically extracts symptoms directly from a natural conversational chat message
 * (both English & Indic voice / text speech).
 *
 * @param {string} text Natural language message from user
 * @returns {{ hasSymptoms: boolean, matchedCategories: string[], matchedKeywords: string[], estimatedSeverity: 'mild' | 'moderate' | 'severe' }}
 */
export function extractSymptomsFromText(text = '') {
  if (!text || typeof text !== 'string') {
    return {
      hasSymptoms: false,
      matchedCategories: [],
      matchedKeywords: [],
      estimatedSeverity: 'mild',
    };
  }

  const clean = text.toLowerCase();
  const matchedCategories = new Set();
  const matchedKeywords = [];

  for (const [category, meta] of Object.entries(SYMPTOM_TAXONOMY)) {
    for (const kw of meta.keywords) {
      // Regex word boundary matching or phrase containment
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(clean) || clean.includes(kw)) {
        matchedCategories.add(category);
        matchedKeywords.push(kw);
      }
    }
  }

  // Estimate severity based on contextual intensity words
  const severeKeywords = [
    'severe',
    'acute',
    'extreme',
    'terrible',
    'unbearable',
    'intense',
    'very high',
    'cannot breathe',
    'hospital',
    'emergency',
    'bahut jyada',
    'bohot',
    'bahut teez',
    'bura haal',
  ];

  let estimatedSeverity = 'moderate';
  if (severeKeywords.some((sw) => clean.includes(sw))) {
    estimatedSeverity = 'severe';
  } else if (clean.includes('mild') || clean.includes('little') || clean.includes('thoda')) {
    estimatedSeverity = 'mild';
  }

  return {
    hasSymptoms: matchedCategories.size > 0,
    matchedCategories: Array.from(matchedCategories),
    matchedKeywords: Array.from(new Set(matchedKeywords)),
    estimatedSeverity,
  };
}
