import { AreaAlert } from './area-alert.model.js';
import { detectHealthClusters } from './health-cluster.service.js';
import { calculateClusterRisk } from './risk-scoring.service.js';

/**
 * Evaluates clusters for a time window, creates new alerts, and updates existing ones without duplication.
 *
 * @param {'24h' | '7d' | '30d'} timeWindow
 * @returns {Promise<{ created: number, updated: number, autoResolved: number, totalEvaluated: number }>}
 */
export async function evaluateAndSyncAlerts(timeWindow = '7d') {
  const clusters = await detectHealthClusters(timeWindow);
  let created = 0;
  let updated = 0;
  let autoResolved = 0;

  const activeAreaKeysInScan = new Set();

  for (const cluster of clusters) {
    activeAreaKeysInScan.add(cluster.areaKey);
    const risk = calculateClusterRisk(cluster);

    if (risk.severity !== 'normal') {
      // Find existing active or under_review alert for this area
      const existingAlert = await AreaAlert.findOne({
        areaKey: cluster.areaKey,
        timeWindow,
        status: { $in: ['active', 'under_review'] },
      });

      if (existingAlert) {
        // Update existing alert to avoid duplicate creation
        existingAlert.severity = risk.severity;
        existingAlert.riskScore = risk.riskScore;
        existingAlert.uniqueUserCount = cluster.uniqueUserCount;
        existingAlert.totalReportCount = cluster.totalReportCount;
        existingAlert.growthRate = cluster.growthRate;
        existingAlert.primarySymptomCategories = cluster.primarySymptomCategories;
        existingAlert.summaryNote = risk.summaryNote;
        existingAlert.lastEvaluatedAt = new Date();
        if (cluster.centroid) existingAlert.centroid = cluster.centroid;

        await existingAlert.save();
        updated++;
      } else {
        // Create new alert
        await AreaAlert.create({
          areaKey: cluster.areaKey,
          areaName: cluster.areaName,
          city: cluster.city,
          state: cluster.state,
          postalCode: cluster.postalCode,
          centroid: cluster.centroid,
          severity: risk.severity,
          status: 'active',
          riskScore: risk.riskScore,
          timeWindow,
          uniqueUserCount: cluster.uniqueUserCount,
          totalReportCount: cluster.totalReportCount,
          growthRate: cluster.growthRate,
          primarySymptomCategories: cluster.primarySymptomCategories,
          summaryNote: risk.summaryNote,
          alertTriggeredAt: new Date(),
          lastEvaluatedAt: new Date(),
          reviewHistory: [],
        });
        created++;
      }
    } else {
      // If risk is normal, check if an existing active alert can be auto-resolved
      const activeAlert = await AreaAlert.findOne({
        areaKey: cluster.areaKey,
        timeWindow,
        status: { $in: ['active', 'under_review'] },
      });

      if (activeAlert) {
        activeAlert.status = 'resolved';
        activeAlert.lastEvaluatedAt = new Date();
        activeAlert.reviewHistory.push({
          reviewerId: activeAlert._id, // system id
          reviewerName: 'System Health Monitor',
          reviewerRole: 'admin',
          action: 'resolved',
          notes: 'Auto-resolved: Incident count returned to safe baseline.',
          timestamp: new Date(),
        });
        await activeAlert.save();
        autoResolved++;
      }
    }
  }

  return {
    totalEvaluated: clusters.length,
    created,
    updated,
    autoResolved,
  };
}

/**
 * Allows authorized medical staff or administrators to review, investigate, resolve, or dismiss an alert.
 *
 * @param {string} alertId
 * @param {{ _id: string, name: string, role: string }} reviewer
 * @param {'under_review' | 'resolved' | 'dismissed'} newStatus
 * @param {string} notes
 */
export async function updateAlertReviewStatus(alertId, reviewer, newStatus, notes = '') {
  const alert = await AreaAlert.findById(alertId);
  if (!alert) {
    throw new Error('Area alert not found.');
  }

  const validStatuses = ['active', 'under_review', 'resolved', 'dismissed'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  alert.status = newStatus;
  alert.lastEvaluatedAt = new Date();

  alert.reviewHistory.push({
    reviewerId: reviewer._id || reviewer.userId,
    reviewerName: reviewer.name || 'Medical Officer',
    reviewerRole: reviewer.role || 'doctor',
    action: newStatus === 'under_review' ? 'investigating' : newStatus,
    notes: notes.trim() || `Status updated to ${newStatus}`,
    timestamp: new Date(),
  });

  await alert.save();
  return alert;
}

/**
 * Queries area alerts with filtering and pagination.
 */
export async function getAreaAlerts(query = {}) {
  const {
    severity,
    status = 'active',
    city,
    timeWindow,
    limit = 50,
    page = 1,
  } = query;

  const filter = {};

  if (severity && severity !== 'all') {
    filter.severity = severity;
  }

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (city && city !== 'all') {
    filter.city = new RegExp(city.trim(), 'i');
  }

  if (timeWindow && timeWindow !== 'all') {
    filter.timeWindow = timeWindow;
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [alerts, totalCount] = await Promise.all([
    AreaAlert.find(filter)
      .sort({ riskScore: -1, lastEvaluatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AreaAlert.countDocuments(filter),
  ]);

  return {
    alerts,
    totalCount,
    page: Number(page),
    limit: Number(limit),
  };
}

/**
 * Returns a high-level summary overview for dashboard cards.
 */
export async function getHealthRiskOverview() {
  const [activeAlertsCount, criticalCount, elevatedCount, watchCount, distinctLocalities] =
    await Promise.all([
      AreaAlert.countDocuments({ status: { $in: ['active', 'under_review'] } }),
      AreaAlert.countDocuments({
        status: { $in: ['active', 'under_review'] },
        severity: 'critical',
      }),
      AreaAlert.countDocuments({
        status: { $in: ['active', 'under_review'] },
        severity: 'elevated',
      }),
      AreaAlert.countDocuments({
        status: { $in: ['active', 'under_review'] },
        severity: 'watch',
      }),
      AreaAlert.distinct('areaKey', { status: { $in: ['active', 'under_review'] } }),
    ]);

  return {
    activeAlertsCount,
    criticalCount,
    elevatedCount,
    watchCount,
    monitoredLocalitiesCount: distinctLocalities.length,
    lastScannedAt: new Date(),
  };
}
