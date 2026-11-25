import {
  getHotspots,
  getHotspotById,
  getHotspotSummary,
  refreshHotspots,
  seedSampleHotspots,
} from './hotspot.service.js';
import { AggregatedHotspot } from './hotspot.model.js';
import { HealthReport } from './health-report.model.js';
import { normalizeSymptoms, extractSymptomsFromText } from './symptom-taxonomy.js';
import { User } from '../users/user.model.js';
import { getPreventiveMeasures, HOTSPOT_DISCLAIMER } from './hotspot.privacy.js';

function buildAreaKey(area = {}) {
  const city = (area.city || 'general').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const locality = (area.locality || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const postalCode = (area.postalCode || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (locality && locality !== 'unknown') return `${city}:${locality}`;
  if (postalCode) return `${city}:${postalCode}`;
  return `${city}:central`;
}

const VALID_WINDOWS = new Set(['7d', '30d', '90d']);
const VALID_VIEW_MODES = new Set(['hotspot', 'area']);

function parseBbox(bboxStr) {
  if (!bboxStr || typeof bboxStr !== 'string') return null;
  const parts = bboxStr.split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return null;
  }
  return parts;
}

/**
 * GET /api/jagruti/hotspots
 * Returns privacy-filtered aggregated H3 hotspots.
 */
export async function listHotspots(req, res, next) {
  try {
    const {
      disease = 'all',
      timeWindow = '7d',
      bbox,
      area = '',
      viewMode = 'hotspot',
      limit = 200,
    } = req.query;

    if (!VALID_WINDOWS.has(timeWindow)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid timeWindow. Supported values: 7d, 30d, 90d.',
      });
    }

    if (!VALID_VIEW_MODES.has(viewMode)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid viewMode. Supported values: hotspot, area.',
      });
    }

    const parsedBbox = bbox ? parseBbox(bbox) : null;
    if (bbox && !parsedBbox) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid bbox format. Expected west,south,east,north.',
      });
    }

    const result = await getHotspots({
      bbox: parsedBbox,
      disease,
      timeWindow,
      area,
      viewMode,
      limit,
    });

    return res.json({
      status: 'success',
      data: result.hotspots,
      meta: {
        ...result.meta,
        cacheHit: result.cacheHit,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jagruti/hotspots/summary
 * Returns aggregate statistics for the selected region.
 */
export async function getSummary(req, res, next) {
  try {
    const { disease = 'all', timeWindow = '7d', bbox, area = '' } = req.query;

    if (!VALID_WINDOWS.has(timeWindow)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid timeWindow. Supported values: 7d, 30d, 90d.',
      });
    }

    const parsedBbox = bbox ? parseBbox(bbox) : null;
    const summary = await getHotspotSummary({
      bbox: parsedBbox,
      disease,
      timeWindow,
      area,
    });

    return res.json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jagruti/hotspots/:id
 * Returns details of a single publicly available aggregated hotspot.
 */
export async function getHotspotDetails(req, res, next) {
  try {
    const hotspot = await getHotspotById(req.params.id);
    if (!hotspot) {
      return res.status(404).json({
        status: 'fail',
        message: 'Aggregated hotspot not found or suppressed for privacy.',
      });
    }

    return res.json({
      status: 'success',
      data: hotspot,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/jagruti/hotspots/refresh
 * Triggers H3 re-aggregation (doctor/admin only).
 */
export async function triggerRefresh(req, res, next) {
  try {
    const timeWindow = VALID_WINDOWS.has(req.body?.timeWindow) ? req.body.timeWindow : '7d';
    const stats = await refreshHotspots(timeWindow);
    return res.json({
      status: 'success',
      message: 'H3 hotspot aggregation refreshed.',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/jagruti/hotspots/seed-sample
 * Development-only endpoint to seed clearly marked sample hotspots.
 */
export async function triggerSampleSeed(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        status: 'fail',
        message: 'Sample seeding is not permitted in production.',
      });
    }
    const result = await seedSampleHotspots();
    return res.json({
      status: 'success',
      message: 'Sample aggregated hotspots seeded for development.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jagruti/nearby-alerts
 * Returns privacy-safe area-level advisories filtered by the user's preferences and approximate city.
 */
export async function getNearbyHealthAlerts(req, res, next) {
  try {
    const userDoc = await User.findById(req.user.userId)
      .select('location alertPreferences')
      .lean();

    const prefs = userDoc?.alertPreferences || {
      enabled: true,
      minSeverity: 'moderate',
      diseases: [],
      radiusKm: 25,
    };

    if (!prefs.enabled) {
      return res.json({
        status: 'success',
        data: [],
        preferences: prefs,
        disclaimer: HOTSPOT_DISCLAIMER,
      });
    }

    const userCity = req.query.city || userDoc?.location?.city || '';
    const severityOrder = { low: 1, moderate: 2, high: 3 };
    const minRank = severityOrder[prefs.minSeverity] || 2;

    const allowedSeverities = ['high'];
    if (minRank <= 2) allowedSeverities.push('moderate');
    if (minRank <= 1) allowedSeverities.push('low');

    const hotspotQuery = {
      isSuppressed: false,
      timeWindow: '7d',
      severity: { $in: allowedSeverities },
    };

    if (userCity) {
      const escaped = userCity.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      hotspotQuery.city = new RegExp(escaped, 'i');
    }

    if (Array.isArray(prefs.diseases) && prefs.diseases.length > 0) {
      hotspotQuery.disease = { $in: prefs.diseases };
    }

    const hotspots = await AggregatedHotspot.find(hotspotQuery)
      .sort({ lastUpdatedAt: -1 })
      .limit(10)
      .lean();

    // Deduplicate advisories by approximateAreaName + disease
    const advisoriesMap = new Map();

    for (const h of hotspots) {
      const key = `${h.approximateAreaName}::${h.disease}`;
      if (advisoriesMap.has(key)) continue;
      const measures = getPreventiveMeasures(h.disease);
      advisoriesMap.set(key, {
        id: String(h._id),
        title: `Health Advisory: ${h.disease} activity`,
        message: `Health Advisory: Increased ${h.disease.toLowerCase()} activity has been reported in ${h.approximateAreaName}. ${measures[0] || ''}`.trim(),
        approximateAreaName: h.approximateAreaName,
        disease: h.disease,
        severity: h.severity,
        trend: h.trend,
        caseCountRange: h.caseCountRange,
        preventiveMeasures: measures,
        lastUpdatedAt: h.lastUpdatedAt,
        isSampleData: Boolean(h.isSampleData),
      });
    }

    return res.json({
      status: 'success',
      data: Array.from(advisoriesMap.values()),
      preferences: prefs,
      disclaimer: HOTSPOT_DISCLAIMER,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jagruti/preferences
 */
export async function getAlertPreferences(req, res, next) {
  try {
    const userDoc = await User.findById(req.user.userId).select('alertPreferences').lean();
    return res.json({
      status: 'success',
      data: userDoc?.alertPreferences || {
        enabled: true,
        minSeverity: 'moderate',
        diseases: [],
        radiusKm: 25,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/jagruti/preferences
 */
export async function updateAlertPreferences(req, res, next) {
  try {
    const { enabled, minSeverity, diseases, radiusKm } = req.body || {};
    const update = {};

    if (typeof enabled === 'boolean') {
      update['alertPreferences.enabled'] = enabled;
    }
    if (['low', 'moderate', 'high'].includes(minSeverity)) {
      update['alertPreferences.minSeverity'] = minSeverity;
    }
    if (Array.isArray(diseases)) {
      update['alertPreferences.diseases'] = diseases.map((d) => String(d).trim()).filter(Boolean);
    }
    if (Number.isFinite(Number(radiusKm)) && Number(radiusKm) >= 5 && Number(radiusKm) <= 100) {
      update['alertPreferences.radiusKm'] = Number(radiusKm);
    }

    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: update },
      { new: true, select: 'alertPreferences' }
    ).lean();

    return res.json({
      status: 'success',
      message: 'Notification preferences updated.',
      data: updated?.alertPreferences,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/jagruti/reports
 * Records a symptom report for privacy-preserving H3 hotspot aggregation.
 */
export async function submitHealthReport(req, res, next) {
  try {
    const userId = req.user?.userId;
    const { rawSymptoms = [], severity = 'moderate', notes = '', area = {} } = req.body;

    if (!Array.isArray(rawSymptoms) || rawSymptoms.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide at least one symptom or health complaint.',
      });
    }

    let locality = area.locality || '';
    let city = area.city || '';
    let state = area.state || '';
    const country = area.country || 'India';
    let postalCode = area.postalCode || '';
    let coordinates =
      area.latitude && area.longitude
        ? [Number(area.longitude), Number(area.latitude)]
        : undefined;

    if (!city || !postalCode || !coordinates) {
      const userDoc = await User.findById(userId).select('location').lean();
      if (userDoc?.location) {
        if (!city && userDoc.location.city) city = userDoc.location.city;
        if (!locality && userDoc.location.address) locality = userDoc.location.address;
        if (!state && userDoc.location.state) state = userDoc.location.state;
        if (!postalCode && userDoc.location.postalCode) postalCode = userDoc.location.postalCode;
        if (!coordinates && userDoc.location.latitude && userDoc.location.longitude) {
          coordinates = [Number(userDoc.location.longitude), Number(userDoc.location.latitude)];
        }
      }
    }

    const cleanArea = {
      locality: locality.trim(),
      city: city.trim() || 'Local Area',
      state: state.trim(),
      country: country.trim(),
      postalCode: postalCode.trim(),
    };

    const reportData = {
      userId,
      rawSymptoms: rawSymptoms.map((s) => String(s).trim()).filter(Boolean),
      normalizedCategories: normalizeSymptoms(rawSymptoms),
      severity,
      notes: notes.trim(),
      area: cleanArea,
      areaKey: buildAreaKey(cleanArea),
      reportedAt: new Date(),
      status: 'active',
    };

    if (coordinates) {
      reportData.location = { type: 'Point', coordinates };
    }

    const report = await HealthReport.create(reportData);

    refreshHotspots('7d').catch((err) =>
      console.warn('[Hotspot] Background refresh warning:', err.message)
    );

    return res.status(201).json({
      status: 'success',
      message: 'Health symptoms submitted successfully.',
      data: {
        reportId: report._id,
        normalizedCategories: report.normalizedCategories,
        severity: report.severity,
        reportedAt: report.reportedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Passively extracts symptoms from Aarogya AI chat messages for H3 hotspot aggregation.
 */
export async function recordSymptomFromChat({ userId, message, preferredLanguage }) {
  try {
    if (!userId || !message || typeof message !== 'string') return null;

    const extraction = extractSymptomsFromText(message);
    if (!extraction.hasSymptoms || extraction.matchedCategories.length === 0) {
      return null;
    }

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const recentReport = await HealthReport.findOne({
      userId,
      reportedAt: { $gte: twelveHoursAgo },
      normalizedCategories: { $in: extraction.matchedCategories },
    });

    if (recentReport) return null;

    const userDoc = await User.findById(userId).select('location').lean();
    const loc = userDoc?.location || {};
    const cleanArea = {
      locality: loc.address || loc.city || '',
      city: loc.city || 'Local Area',
      state: loc.state || '',
      country: loc.country || 'India',
      postalCode: loc.postalCode || '',
    };

    const reportData = {
      userId,
      rawSymptoms: extraction.matchedKeywords,
      normalizedCategories: extraction.matchedCategories,
      severity: extraction.estimatedSeverity,
      notes: `Extracted automatically from Aarogya AI chat conversation (${preferredLanguage || 'Indic/English'})`,
      area: cleanArea,
      areaKey: buildAreaKey(cleanArea),
      reportedAt: new Date(),
      status: 'active',
    };

    if (loc.longitude && loc.latitude) {
      reportData.location = {
        type: 'Point',
        coordinates: [Number(loc.longitude), Number(loc.latitude)],
      };
    }

    const report = await HealthReport.create(reportData);

    refreshHotspots('7d').catch((err) =>
      console.warn('[Hotspot] Background refresh warning:', err.message)
    );

    return report;
  } catch (error) {
    console.warn('[Hotspot] Failed to record symptom from chat:', error.message);
    return null;
  }
}
