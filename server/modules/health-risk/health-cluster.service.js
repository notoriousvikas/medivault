import { HealthReport } from './health-report.model.js';

/**
 * Calculates date boundaries for a given time window string.
 *
 * @param {'24h' | '7d' | '30d'} windowStr
 * @returns {{ currentStart: Date, priorStart: Date, now: Date }}
 */
export function getTimeWindowDates(windowStr = '7d') {
  const now = new Date();
  let durationMs = 7 * 24 * 60 * 60 * 1000;

  if (windowStr === '24h') {
    durationMs = 24 * 60 * 60 * 1000;
  } else if (windowStr === '30d') {
    durationMs = 30 * 24 * 60 * 60 * 1000;
  }

  const currentStart = new Date(now.getTime() - durationMs);
  const priorStart = new Date(now.getTime() - durationMs * 2);

  return { currentStart, priorStart, now };
}

/**
 * Generates a clean, normalized areaKey from locality, city, and postalCode.
 *
 * @param {{ locality?: string, city?: string, postalCode?: string }} area
 * @returns {string} e.g. "bengaluru:koramangala" or "delhi:110001"
 */
export function buildAreaKey(area = {}) {
  const city = (area.city || 'general').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const locality = (area.locality || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const postalCode = (area.postalCode || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (locality && locality !== 'unknown') {
    return `${city}:${locality}`;
  }
  if (postalCode) {
    return `${city}:${postalCode}`;
  }
  return `${city}:central`;
}

/**
 * Runs a cluster analysis across health reports for a given time window.
 * Groups by areaKey, deduplicates unique patients, and computes symptom distributions.
 *
 * @param {'24h' | '7d' | '30d'} timeWindow
 * @returns {Promise<Array>} List of detected area clusters with raw metrics
 */
export async function detectHealthClusters(timeWindow = '7d') {
  const { currentStart, priorStart, now } = getTimeWindowDates(timeWindow);

  // 1. Current Window Aggregation (Deduplicating unique users per area)
  const currentClusters = await HealthReport.aggregate([
    {
      $match: {
        reportedAt: { $gte: currentStart, $lte: now },
        status: { $ne: 'dismissed' },
      },
    },
    {
      $unwind: '$normalizedCategories',
    },
    {
      $group: {
        _id: {
          areaKey: '$areaKey',
          category: '$normalizedCategories',
        },
        categoryCount: { $sum: 1 },
        uniqueUsersForCat: { $addToSet: '$userId' },
        areaInfo: { $first: '$area' },
        coords: { $push: '$location.coordinates' },
        totalReports: { $addToSet: '$_id' },
      },
    },
    {
      $group: {
        _id: '$_id.areaKey',
        areaInfo: { $first: '$areaInfo' },
        allReports: { $push: '$totalReports' },
        allCoords: { $push: '$coords' },
        symptomBreakdown: {
          $push: {
            category: '$_id.category',
            count: '$categoryCount',
            uniqueUsersCount: { $size: '$uniqueUsersForCat' },
          },
        },
      },
    },
  ]);

  if (!currentClusters || currentClusters.length === 0) {
    return [];
  }

  // 2. Also aggregate overall unique users and total reports per area
  const userTotals = await HealthReport.aggregate([
    {
      $match: {
        reportedAt: { $gte: currentStart, $lte: now },
        status: { $ne: 'dismissed' },
      },
    },
    {
      $group: {
        _id: '$areaKey',
        uniqueUsers: { $addToSet: '$userId' },
        totalReports: { $sum: 1 },
      },
    },
  ]);

  const userTotalsMap = new Map();
  userTotals.forEach((u) => {
    userTotalsMap.set(u._id, {
      uniqueUserCount: u.uniqueUsers.length,
      totalReportCount: u.totalReports,
    });
  });

  // 3. Prior window counts to calculate velocity / growth rate
  const priorTotals = await HealthReport.aggregate([
    {
      $match: {
        reportedAt: { $gte: priorStart, $lt: currentStart },
        status: { $ne: 'dismissed' },
      },
    },
    {
      $group: {
        _id: '$areaKey',
        uniqueUsers: { $addToSet: '$userId' },
        totalReports: { $sum: 1 },
      },
    },
  ]);

  const priorTotalsMap = new Map();
  priorTotals.forEach((p) => {
    priorTotalsMap.set(p._id, {
      uniqueUserCount: p.uniqueUsers.length,
      totalReportCount: p.totalReports,
    });
  });

  // 4. Transform and merge
  const clusters = currentClusters.map((cluster) => {
    const areaKey = cluster._id;
    const totals = userTotalsMap.get(areaKey) || { uniqueUserCount: 1, totalReportCount: 1 };
    const prior = priorTotalsMap.get(areaKey) || { uniqueUserCount: 0, totalReportCount: 0 };

    // Calculate growth rate percentage
    let growthRate = 0;
    if (prior.uniqueUserCount === 0) {
      growthRate = totals.uniqueUserCount > 0 ? 100 : 0;
    } else {
      growthRate = Math.round(
        ((totals.uniqueUserCount - prior.uniqueUserCount) / prior.uniqueUserCount) * 100
      );
    }

    // Sort symptom categories descending
    const sortedSymptoms = cluster.symptomBreakdown
      .sort((a, b) => b.count - a.count)
      .map((s) => ({
        category: s.category,
        count: s.count,
        percentage: Math.round((s.count / totals.totalReportCount) * 100) || 0,
      }));

    // Compute approximate centroid from coordinates (if available)
    let centroid = undefined;
    const flatCoords = (cluster.allCoords || []).flat(2).filter((c) => Array.isArray(c) && c.length === 2);
    if (flatCoords.length > 0) {
      const avgLng = flatCoords.reduce((acc, curr) => acc + curr[0], 0) / flatCoords.length;
      const avgLat = flatCoords.reduce((acc, curr) => acc + curr[1], 0) / flatCoords.length;
      centroid = {
        type: 'Point',
        coordinates: [Number(avgLng.toFixed(5)), Number(avgLat.toFixed(5))],
      };
    }

    const areaName =
      cluster.areaInfo?.locality
        ? `${cluster.areaInfo.locality}, ${cluster.areaInfo.city || ''}`.trim()
        : cluster.areaInfo?.postalCode
        ? `PIN ${cluster.areaInfo.postalCode}, ${cluster.areaInfo.city || ''}`.trim()
        : cluster.areaInfo?.city || 'Local Area';

    return {
      areaKey,
      areaName,
      city: cluster.areaInfo?.city || 'Unknown City',
      state: cluster.areaInfo?.state || '',
      postalCode: cluster.areaInfo?.postalCode || '',
      centroid,
      timeWindow,
      uniqueUserCount: totals.uniqueUserCount,
      totalReportCount: totals.totalReportCount,
      priorUniqueUserCount: prior.uniqueUserCount,
      growthRate,
      primarySymptomCategories: sortedSymptoms,
      evaluatedAt: now,
    };
  });

  return clusters;
}
