import mongoose from 'mongoose';
import { AggregatedHotspot } from './hotspot.model.js';
import { aggregateHotspotsToH3 } from './hotspot.aggregation.js';
import {
  HOTSPOT_DISCLAIMER,
  PRIVACY_CONFIG,
  coordsToH3Cell,
  getH3Geometry,
  getPreventiveMeasures,
  quantizeBoundingBox,
  sanitizeHotspotForPublic,
} from './hotspot.privacy.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const hotspotCache = new Map();

export function invalidateHotspotCache() {
  hotspotCache.clear();
}

function getCached(key) {
  const entry = hotspotCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    hotspotCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  // Bound cache size to prevent unbounded memory growth
  if (hotspotCache.size > 250) {
    const firstKey = hotspotCache.keys().next().value;
    hotspotCache.delete(firstKey);
  }
  hotspotCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function buildFilterQuery({ bbox, disease, timeWindow = '7d', area }) {
  const filter = {
    isSuppressed: false,
    timeWindow: ['7d', '30d', '90d'].includes(timeWindow) ? timeWindow : '7d',
  };

  if (disease && disease !== 'all') {
    filter.disease = disease.trim();
  }

  if (area && area.trim() && area.trim().toLowerCase() !== 'all') {
    const escaped = area.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ city: regex }, { state: regex }, { approximateAreaName: regex }];
  }

  const quantized = quantizeBoundingBox(bbox);
  if (quantized) {
    const [west, south, east, north] = quantized;
    filter.centroid = {
      $geoWithin: {
        $box: [
          [west, south],
          [east, north],
        ],
      },
    };
  }

  return { filter, quantizedBbox: quantized };
}

/**
 * Fetches privacy-filtered aggregated hotspots for the map.
 */
export async function getHotspots(params = {}) {
  const {
    bbox = null,
    disease = 'all',
    timeWindow = '7d',
    area = '',
    viewMode = 'hotspot',
    limit = 200,
  } = params;

  const { filter, quantizedBbox } = buildFilterQuery({ bbox, disease, timeWindow, area });
  const safeLimit = Math.min(250, Math.max(1, Number(limit) || 200));
  const cacheKey = JSON.stringify({ filter, viewMode, safeLimit });

  const cached = getCached(cacheKey);
  if (cached) {
    return { ...cached, cacheHit: true };
  }

  const docs = await AggregatedHotspot.find(filter)
    .sort({ severity: 1, lastUpdatedAt: -1 })
    .limit(safeLimit)
    .lean();

  let hotspots = docs.map(sanitizeHotspotForPublic).filter(Boolean);

  // If area-level view is requested, roll up H3 cells by city/approximateAreaName
  if (viewMode === 'area' && hotspots.length > 0) {
    const areaMap = new Map();
    const severityRank = { high: 3, moderate: 2, low: 1, insufficient_data: 0 };

    for (const h of hotspots) {
      const key = `${h.city}::${h.disease}`;
      if (!areaMap.has(key)) {
        areaMap.set(key, {
          ...h,
          id: `area:${h.city}:${h.disease}`,
          cellCount: 1,
        });
      } else {
        const existing = areaMap.get(key);
        existing.cellCount += 1;
        if (severityRank[h.severity] > severityRank[existing.severity]) {
          existing.severity = h.severity;
          existing.caseCountRange = h.caseCountRange;
          existing.trend = h.trend;
        }
      }
    }
    hotspots = Array.from(areaMap.values());
  }

  const result = {
    hotspots,
    meta: {
      total: hotspots.length,
      timeWindow: filter.timeWindow,
      viewMode,
      quantizedBbox,
      kThreshold: PRIVACY_CONFIG.MIN_K_THRESHOLD,
      reportingDelayHours: PRIVACY_CONFIG.REPORTING_DELAY_HOURS,
      hasSampleData: hotspots.some((h) => h.isSampleData),
      disclaimer: HOTSPOT_DISCLAIMER,
    },
    cacheHit: false,
  };

  setCached(cacheKey, result);
  return result;
}

/**
 * Fetches a single publicly available aggregated hotspot by ID or H3 index.
 */
export async function getHotspotById(id) {
  let doc = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    doc = await AggregatedHotspot.findOne({ _id: id, isSuppressed: false }).lean();
  }
  if (!doc) {
    doc = await AggregatedHotspot.findOne({ h3Index: id, isSuppressed: false }).lean();
  }
  if (!doc) return null;
  return sanitizeHotspotForPublic(doc);
}

/**
 * Returns aggregate statistics for the selected region and filters.
 */
export async function getHotspotSummary(params = {}) {
  const { bbox = null, disease = 'all', timeWindow = '7d', area = '' } = params;
  const { filter } = buildFilterQuery({ bbox, disease, timeWindow, area });
  const cacheKey = JSON.stringify({ summary: true, filter });

  const cached = getCached(cacheKey);
  if (cached) {
    return { ...cached, cacheHit: true };
  }

  const docs = await AggregatedHotspot.find(filter)
    .select('severity disease trend city approximateAreaName lastUpdatedAt isSampleData')
    .lean();

  const severityCounts = { high: 0, moderate: 0, low: 0, insufficient_data: 0 };
  const trendCounts = { increasing: 0, decreasing: 0, stable: 0, insufficient_data: 0 };
  const diseaseMap = new Map();
  const regionSet = new Set();
  let lastUpdatedAt = null;
  let hasSampleData = false;

  for (const d of docs) {
    if (severityCounts[d.severity] !== undefined) severityCounts[d.severity]++;
    if (trendCounts[d.trend] !== undefined) trendCounts[d.trend]++;
    diseaseMap.set(d.disease, (diseaseMap.get(d.disease) || 0) + 1);
    if (d.city) regionSet.add(d.city);
    if (d.isSampleData) hasSampleData = true;
    if (!lastUpdatedAt || new Date(d.lastUpdatedAt) > new Date(lastUpdatedAt)) {
      lastUpdatedAt = d.lastUpdatedAt;
    }
  }

  const topDiseases = Array.from(diseaseMap.entries())
    .map(([name, count]) => ({ disease: name, hotspotCount: count }))
    .sort((a, b) => b.hotspotCount - a.hotspotCount)
    .slice(0, 6);

  const summary = {
    totalHotspots: docs.length,
    monitoredRegionsCount: regionSet.size,
    severityCounts,
    trendCounts,
    topDiseases,
    timeWindow: filter.timeWindow,
    lastUpdatedAt,
    hasSampleData,
    disclaimer: HOTSPOT_DISCLAIMER,
    cacheHit: false,
  };

  setCached(cacheKey, summary);
  return summary;
}

/**
 * Triggers H3 re-aggregation and invalidates the response cache.
 */
export async function refreshHotspots(timeWindow = '7d', options = {}) {
  const stats = await aggregateHotspotsToH3(timeWindow, options);
  invalidateHotspotCache();
  return stats;
}

/**
 * Development-only helper to seed clearly marked sample H3 hotspots
 * across major Indian regions so the map can be demonstrated without fake patient records.
 */
export async function seedSampleHotspots() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Sample hotspot seeding is disabled in production.');
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() - PRIVACY_CONFIG.REPORTING_DELAY_HOURS * 3600 * 1000);
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 3600 * 1000);

  const sampleSeeds = [
    { lat: 32.7266, lng: 74.857, city: 'Jammu', state: 'Jammu & Kashmir', disease: 'Dengue', range: '11–20', severity: 'moderate', trend: 'increasing', res: 7 },
    { lat: 32.705, lng: 74.885, city: 'Jammu', state: 'Jammu & Kashmir', disease: 'Fever', range: '5–10', severity: 'low', trend: 'stable', res: 7 },
    { lat: 28.6139, lng: 77.209, city: 'New Delhi', state: 'Delhi', disease: 'Respiratory / Cough', range: '21–35', severity: 'high', trend: 'increasing', res: 7 },
    { lat: 28.5355, lng: 77.391, city: 'Noida', state: 'Uttar Pradesh', disease: 'Dengue', range: '11–20', severity: 'moderate', trend: 'stable', res: 7 },
    { lat: 19.076, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra', disease: 'Gastrointestinal', range: '21–35', severity: 'high', trend: 'increasing', res: 7 },
    { lat: 19.1136, lng: 72.8697, city: 'Mumbai', state: 'Maharashtra', disease: 'Dengue', range: '11–20', severity: 'moderate', trend: 'decreasing', res: 7 },
    { lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka', disease: 'Fever', range: '11–20', severity: 'moderate', trend: 'stable', res: 7 },
    { lat: 12.9352, lng: 77.6245, city: 'Bengaluru', state: 'Karnataka', disease: 'Respiratory / Cough', range: '5–10', severity: 'low', trend: 'decreasing', res: 7 },
    { lat: 17.385, lng: 78.4867, city: 'Hyderabad', state: 'Telangana', disease: 'Dengue', range: '5–10', severity: 'low', trend: 'stable', res: 7 },
    { lat: 26.9124, lng: 75.7873, city: 'Jaipur', state: 'Rajasthan', disease: 'Chills & Sweats', range: 'Insufficient Data', severity: 'insufficient_data', trend: 'insufficient_data', res: 5 },
  ];

  const ops = [];
  for (const tw of ['7d', '30d', '90d']) {
    for (const s of sampleSeeds) {
      const h3Index = coordsToH3Cell(s.lat, s.lng, s.res);
      const { centroid, hexBoundary } = getH3Geometry(h3Index);
      ops.push({
        updateOne: {
          filter: { h3Index, disease: s.disease, timeWindow: tw },
          update: {
            $set: {
              resolution: s.res,
              approximateAreaName: `${s.city} – Approximate Region`,
              city: s.city,
              state: s.state,
              caseCountRange: s.range,
              severity: s.severity,
              trend: s.trend,
              centroid,
              hexBoundary,
              preventiveMeasures: getPreventiveMeasures(s.disease),
              isSuppressed: false,
              isSampleData: true,
              periodStart,
              periodEnd,
              lastUpdatedAt: now,
            },
          },
          upsert: true,
        },
      });
    }
  }

  await AggregatedHotspot.bulkWrite(ops);
  invalidateHotspotCache();

  return { seededCount: ops.length };
}
