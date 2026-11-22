import { HealthReport } from './health-report.model.js';
import { User } from '../users/user.model.js';
import {
  normalizeSymptoms,
  SYMPTOM_TAXONOMY,
  extractSymptomsFromText,
} from './symptom-taxonomy.js';
import { buildAreaKey, detectHealthClusters } from './health-cluster.service.js';
import {
  evaluateAndSyncAlerts,
  getAreaAlerts,
  getHealthRiskOverview,
  updateAlertReviewStatus,
} from './area-alert.service.js';

/**
 * Patient submits an anonymous or authenticated symptom report.
 * POST /api/health-risk/reports
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

    // Hydrate location from user profile if not passed in request
    let locality = area.locality || '';
    let city = area.city || '';
    let state = area.state || '';
    let country = area.country || 'India';
    let postalCode = area.postalCode || '';
    let coordinates = undefined;

    if (area.latitude && area.longitude) {
      coordinates = [Number(area.longitude), Number(area.latitude)];
    }

    if (!city || !postalCode) {
      const userDoc = await User.findById(userId).select('location').lean();
      if (userDoc?.location) {
        if (!city && userDoc.location.city) city = userDoc.location.city;
        if (!locality && userDoc.location.address) locality = userDoc.location.address;
        if (!state && userDoc.location.state) state = userDoc.location.state;
        if (!postalCode && userDoc.location.postalCode) postalCode = userDoc.location.postalCode;
        if (!coordinates && userDoc.location.latitude && userDoc.location.longitude) {
          coordinates = [userDoc.location.longitude, userDoc.location.latitude];
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

    const areaKey = buildAreaKey(cleanArea);
    const normalizedCategories = normalizeSymptoms(rawSymptoms);

    const reportData = {
      userId,
      rawSymptoms: rawSymptoms.map((s) => String(s).trim()).filter(Boolean),
      normalizedCategories,
      severity,
      notes: notes.trim(),
      area: cleanArea,
      areaKey,
      reportedAt: new Date(),
      status: 'active',
    };

    if (coordinates) {
      reportData.location = {
        type: 'Point',
        coordinates,
      };
    }

    const report = await HealthReport.create(reportData);

    // Asynchronously trigger cluster evaluation for the 7d window
    // (non-blocking to ensure fast response time)
    evaluateAndSyncAlerts('7d').catch((err) =>
      console.warn('[AreaHealthAlert] Background evaluation warning:', err.message)
    );

    return res.status(201).json({
      status: 'success',
      message: 'Health symptoms submitted successfully.',
      data: {
        reportId: report._id,
        areaKey: report.areaKey,
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
 * Patient retrieves their own submitted reports.
 * GET /api/health-risk/reports/my
 */
export async function getMyHealthReports(req, res, next) {
  try {
    const userId = req.user.userId;
    const reports = await HealthReport.find({ userId })
      .sort({ reportedAt: -1 })
      .limit(30)
      .lean();

    return res.json({
      status: 'success',
      data: reports,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves area health alerts with filtering.
 * GET /api/health-risk/alerts
 */
export async function listAreaAlerts(req, res, next) {
  try {
    const result = await getAreaAlerts(req.query);
    return res.json({
      status: 'success',
      data: result.alerts,
      meta: {
        total: result.totalCount,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns summary statistics for dashboard widgets.
 * GET /api/health-risk/overview
 */
export async function getOverview(req, res, next) {
  try {
    const overview = await getHealthRiskOverview();
    return res.json({
      status: 'success',
      data: overview,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns raw aggregated cluster data across active windows.
 * GET /api/health-risk/clusters
 */
export async function listClusters(req, res, next) {
  try {
    const timeWindow = req.query.timeWindow || '7d';
    const clusters = await detectHealthClusters(timeWindow);
    return res.json({
      status: 'success',
      data: clusters,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Medical staff or Admin updates review status of an area alert.
 * PATCH /api/health-risk/alerts/:id/status
 */
export async function updateAlertStatus(req, res, next) {
  try {
    const alertId = req.params.id;
    const { status, notes = '' } = req.body;
    const reviewerUser = req.user;

    const reviewerDoc = await User.findById(reviewerUser.userId).select('name role').lean();
    const reviewer = {
      _id: reviewerUser.userId,
      name: reviewerDoc?.name || 'Authorized Reviewer',
      role: reviewerUser.role,
    };

    const updatedAlert = await updateAlertReviewStatus(alertId, reviewer, status, notes);

    return res.json({
      status: 'success',
      message: `Alert marked as ${status}.`,
      data: updatedAlert,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manual trigger to evaluate clusters on-demand.
 * POST /api/health-risk/scan
 */
export async function triggerClusterScan(req, res, next) {
  try {
    const timeWindow = req.body.timeWindow || '7d';
    const summary = await evaluateAndSyncAlerts(timeWindow);
    return res.json({
      status: 'success',
      message: 'Cluster scan completed.',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns the controlled symptom taxonomy for frontend autocomplete.
 * GET /api/health-risk/taxonomy
 */
export function getTaxonomy(req, res) {
  return res.json({
    status: 'success',
    data: SYMPTOM_TAXONOMY,
  });
}

/**
 * Automatically extracts symptoms from a user's conversational chat message (text or voice)
 * and seamlessly records a HealthReport in the background without manual forms.
 *
 * @param {{ userId: string, message: string, preferredLanguage?: string }} params
 * @returns {Promise<object|null>}
 */
export async function recordSymptomFromChat({ userId, message, preferredLanguage }) {
  try {
    if (!userId || !message || typeof message !== 'string') return null;

    // 1. Extract symptoms from conversational text
    const extraction = extractSymptomsFromText(message);
    if (!extraction.hasSymptoms || extraction.matchedCategories.length === 0) {
      return null;
    }

    // 2. Prevent spamming from multiple messages in the same conversation session:
    // Check if user already had a HealthReport recorded in the last 12 hours with overlapping categories
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const recentReport = await HealthReport.findOne({
      userId,
      reportedAt: { $gte: twelveHoursAgo },
      normalizedCategories: { $in: extraction.matchedCategories },
    });

    if (recentReport) {
      // Already logged this symptom cluster for this patient recently
      return null;
    }

    // 3. Hydrate user's location from profile
    const userDoc = await User.findById(userId).select('location').lean();
    const loc = userDoc?.location || {};

    const cleanArea = {
      locality: loc.address || loc.city || '',
      city: loc.city || 'Local Area',
      state: loc.state || '',
      country: loc.country || 'India',
      postalCode: loc.postalCode || '',
    };

    const areaKey = buildAreaKey(cleanArea);

    const reportData = {
      userId,
      rawSymptoms: extraction.matchedKeywords,
      normalizedCategories: extraction.matchedCategories,
      severity: extraction.estimatedSeverity,
      notes: `Extracted automatically from Aarogya AI chat conversation (${preferredLanguage || 'Indic/English'})`,
      area: cleanArea,
      areaKey,
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

    // Asynchronously trigger cluster evaluation for the 7d window
    evaluateAndSyncAlerts('7d').catch((err) =>
      console.warn('[AreaHealthAlert] Background evaluation warning:', err.message)
    );

    console.log(
      `[HealthRisk] Automatically captured symptom cluster from AI chat for user ${userId} in ${areaKey}:`,
      extraction.matchedCategories
    );

    return report;
  } catch (error) {
    console.warn('[HealthRisk] Failed to record symptom from chat:', error.message);
    return null;
  }
}

