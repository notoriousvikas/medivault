import { latLngToCell, cellToLatLng, cellToBoundary, cellToParent } from 'h3-js';

/**
 * Privacy & Anonymization Engine for AyuRaksha Jagruti Hotspots.
 * Enforces k-anonymity, spatial coarsening, case-count bucketing,
 * reporting delays, and bounding-box quantization.
 */

export const PRIVACY_CONFIG = {
  // Minimum independent unique users required before publishing a hotspot
  MIN_K_THRESHOLD: Number(process.env.JAGRUTI_MIN_K_THRESHOLD) || 5,
  // Reporting delay in hours so real-time submissions cannot be correlated
  REPORTING_DELAY_HOURS: Number(process.env.JAGRUTI_REPORTING_DELAY_HOURS) || 6,
  // Default H3 resolution for urban/dense regions (~5.16 km^2 per hex)
  DEFAULT_H3_RESOLUTION: 7,
  // Intermediate resolution (~36.1 km^2 per hex)
  INTERMEDIATE_H3_RESOLUTION: 6,
  // Coarse H3 resolution for low-density regions (~252.9 km^2 per hex)
  COARSE_H3_RESOLUTION: 5,
  // Quantization precision for map bounding-box queries (1 decimal ~11 km)
  BBOX_QUANTIZATION_DECIMALS: 1,
};

export const HOTSPOT_DISCLAIMER =
  'Hotspot locations are approximate and represent aggregated health reports. Individual patient locations are never displayed.';

export const DISEASE_PREVENTIVE_MEASURES = {
  Dengue: [
    'Eliminate stagnant water in coolers, flower pots, and open containers.',
    'Use EPA-approved mosquito repellents and sleep under mosquito nets.',
    'Wear long-sleeved clothing during dawn and dusk peak mosquito hours.',
    'Seek medical evaluation promptly for high fever with severe headache or joint pain.',
  ],
  Malaria: [
    'Use insecticide-treated bed nets and indoor residual sprays.',
    'Avoid outdoor exposure near stagnant water bodies after sunset.',
    'Seek prompt blood testing if experiencing cyclical fever, chills, and sweating.',
  ],
  Fever: [
    'Stay hydrated with clean water, ORS, or clear fluids and get adequate rest.',
    'Monitor temperature regularly and consult a physician if fever persists beyond 48 hours.',
    'Avoid self-medicating with unprescribed antibiotics.',
  ],
  'Respiratory / Cough': [
    'Wear a well-fitted mask in crowded indoor spaces.',
    'Practice frequent handwashing and cover coughs/sneezes.',
    'Ensure good indoor ventilation and seek care if experiencing breathlessness.',
  ],
  Gastrointestinal: [
    'Drink only boiled, filtered, or sealed safe drinking water.',
    'Wash hands thoroughly with soap before meals and after restroom use.',
    'Consume freshly cooked food and use ORS to prevent dehydration.',
  ],
  'Skin Rash / Lesions': [
    'Avoid scratching lesions and keep affected skin clean and dry.',
    'Do not share towels, bedding, or personal clothing.',
    'Consult a healthcare provider for accurate diagnosis before applying topical steroids.',
  ],
  Headache: [
    'Stay well hydrated and rest in a quiet, dimly lit room.',
    'Consult a doctor immediately if headache is sudden, severe, or accompanied by fever or neck stiffness.',
  ],
  'Body Pain / Fatigue': [
    'Prioritize rest and adequate hydration.',
    'Seek clinical evaluation if accompanied by persistent fever or rash.',
  ],
  'Chills & Sweats': [
    'Keep warm during chills and stay hydrated during sweating episodes.',
    'Consult a clinician to rule out vector-borne or systemic infections.',
  ],
  default: [
    'Follow standard hygiene, safe water, and vector-control precautions.',
    'Consult a qualified healthcare professional if symptoms worsen or persist.',
  ],
};

/**
 * Converts [latitude, longitude] into an H3 cell index.
 */
export function coordsToH3Cell(latitude, longitude, resolution = PRIVACY_CONFIG.DEFAULT_H3_RESOLUTION) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return latLngToCell(lat, lng, resolution);
}

/**
 * Returns the parent H3 cell at a coarser resolution for low-density regions.
 */
export function getCoarserH3Cell(h3Index, targetResolution = PRIVACY_CONFIG.COARSE_H3_RESOLUTION) {
  return cellToParent(h3Index, targetResolution);
}

/**
 * Computes the GeoJSON Point centroid and GeoJSON Polygon boundary strictly from the H3 cell.
 */
export function getH3Geometry(h3Index) {
  const [lat, lng] = cellToLatLng(h3Index);
  // cellToBoundary with formatAsGeoJson=true returns [lng, lat] pairs closed as a GeoJSON ring
  const ring = cellToBoundary(h3Index, true);

  return {
    centroid: {
      type: 'Point',
      coordinates: [Number(lng.toFixed(5)), Number(lat.toFixed(5))],
    },
    hexBoundary: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}

/**
 * Converts an exact independent case count into a privacy-safe range string.
 * Exact counts are never returned to the frontend.
 */
export function toCaseCountRange(uniqueCount, k = PRIVACY_CONFIG.MIN_K_THRESHOLD) {
  if (!Number.isFinite(uniqueCount) || uniqueCount < k) {
    return 'Insufficient Data';
  }
  if (uniqueCount <= 10) return '5–10';
  if (uniqueCount <= 20) return '11–20';
  if (uniqueCount <= 35) return '21–35';
  if (uniqueCount <= 50) return '36–50';
  if (uniqueCount <= 100) return '51–100';
  return '100+';
}

/**
 * Classifies hotspot severity.
 * Areas below k-threshold are NEVER classified as disease-free; they are marked 'insufficient_data'.
 */
export function classifyHotspotSeverity(uniqueCount, growthRate = 0, k = PRIVACY_CONFIG.MIN_K_THRESHOLD) {
  if (!Number.isFinite(uniqueCount) || uniqueCount < k) {
    return 'insufficient_data';
  }
  if (uniqueCount >= 21 || (uniqueCount >= 15 && growthRate >= 50)) {
    return 'high';
  }
  if (uniqueCount >= 11 || (uniqueCount >= 8 && growthRate >= 25)) {
    return 'moderate';
  }
  return 'low';
}

/**
 * Classifies trend direction from current vs prior period independent counts.
 */
export function classifyTrend(currentCount, priorCount = 0, k = PRIVACY_CONFIG.MIN_K_THRESHOLD) {
  if (!Number.isFinite(currentCount) || currentCount < k) {
    return 'insufficient_data';
  }
  if (priorCount <= 0) {
    return currentCount >= 8 ? 'increasing' : 'stable';
  }
  const pctChange = ((currentCount - priorCount) / priorCount) * 100;
  if (pctChange >= 15) return 'increasing';
  if (pctChange <= -15) return 'decreasing';
  return 'stable';
}

/**
 * Quantizes a [west, south, east, north] bounding box to a coarse grid
 * to prevent differencing attacks via micro-shifted viewport queries.
 */
export function quantizeBoundingBox(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return null;
  const [west, south, east, north] = bbox.map(Number);
  if ([west, south, east, north].some((n) => !Number.isFinite(n))) return null;
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
    return null;
  }

  const factor = 10 ** PRIVACY_CONFIG.BBOX_QUANTIZATION_DECIMALS;
  return [
    Math.max(-180, Math.floor(west * factor) / factor),
    Math.max(-90, Math.floor(south * factor) / factor),
    Math.min(180, Math.ceil(east * factor) / factor),
    Math.min(90, Math.ceil(north * factor) / factor),
  ];
}

/**
 * Returns disease-specific preventive measures.
 */
export function getPreventiveMeasures(disease) {
  return DISEASE_PREVENTIVE_MEASURES[disease] || DISEASE_PREVENTIVE_MEASURES.default;
}

/**
 * Formats an approximate area label without exposing street-level or patient-level details.
 */
export function formatApproximateAreaName(city, state) {
  const cleanCity = (city || '').trim();
  const cleanState = (state || '').trim();
  if (cleanCity && cleanCity !== 'Unknown City' && cleanCity !== 'Local Area') {
    return `${cleanCity} – Approximate Region`;
  }
  if (cleanState) {
    return `${cleanState} – Approximate Region`;
  }
  return 'Approximate Regional Zone';
}

/**
 * Strict output sanitizer: whitelists only anonymized, aggregated fields for public APIs.
 */
export function sanitizeHotspotForPublic(doc) {
  if (!doc || doc.isSuppressed) return null;

  return {
    id: String(doc._id || doc.h3Index),
    h3Index: doc.h3Index,
    resolution: doc.resolution,
    disease: doc.disease,
    timeWindow: doc.timeWindow,
    approximateAreaName: doc.approximateAreaName,
    city: doc.city || 'Regional Zone',
    state: doc.state || '',
    caseCountRange: doc.caseCountRange,
    severity: doc.severity,
    trend: doc.trend,
    centroid: doc.centroid,
    hexBoundary: doc.hexBoundary,
    preventiveMeasures:
      Array.isArray(doc.preventiveMeasures) && doc.preventiveMeasures.length > 0
        ? doc.preventiveMeasures
        : getPreventiveMeasures(doc.disease),
    lastUpdatedAt: doc.lastUpdatedAt,
    isSampleData: Boolean(doc.isSampleData),
    disclaimer: HOTSPOT_DISCLAIMER,
  };
}
