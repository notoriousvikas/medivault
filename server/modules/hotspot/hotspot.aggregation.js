import { HealthReport } from './health-report.model.js';
import { AggregatedHotspot } from './hotspot.model.js';
import {
  PRIVACY_CONFIG,
  coordsToH3Cell,
  getCoarserH3Cell,
  getH3Geometry,
  toCaseCountRange,
  classifyHotspotSeverity,
  classifyTrend,
  getPreventiveMeasures,
  formatApproximateAreaName,
} from './hotspot.privacy.js';

const WINDOW_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/**
 * Computes reporting period boundaries with a privacy reporting delay.
 */
export function getHotspotWindowBounds(
  timeWindow = '7d',
  delayHours = PRIVACY_CONFIG.REPORTING_DELAY_HOURS
) {
  const days = WINDOW_DAYS[timeWindow] || 7;
  const now = new Date();
  const delayMs = Math.max(0, Number(delayHours)) * 60 * 60 * 1000;
  const durationMs = days * 24 * 60 * 60 * 1000;

  const periodEnd = new Date(now.getTime() - delayMs);
  const periodStart = new Date(periodEnd.getTime() - durationMs);
  const priorStart = new Date(periodStart.getTime() - durationMs);

  return { periodStart, periodEnd, priorStart, now };
}

/**
 * Groups raw reports into H3 cells at a given resolution, deduplicating by userId.
 */
function bucketReportsByH3(reports, resolution) {
  const buckets = new Map(); // key: `${h3Index}::${disease}`

  for (const r of reports) {
    const coords = r.location?.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) continue;
    const [lng, lat] = coords;
    const h3Index = coordsToH3Cell(lat, lng, resolution);
    if (!h3Index) continue;

    const categories =
      Array.isArray(r.normalizedCategories) && r.normalizedCategories.length > 0
        ? r.normalizedCategories
        : ['Fever'];

    const uid = String(r.userId);
    for (const disease of categories) {
      const key = `${h3Index}::${disease}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          h3Index,
          resolution,
          disease,
          userIds: new Set(),
          cityCounts: new Map(),
          state: r.area?.state || '',
        });
      }
      const b = buckets.get(key);
      b.userIds.add(uid);
      const city = (r.area?.city || '').trim();
      if (city && city !== 'Unknown City') {
        b.cityCounts.set(city, (b.cityCounts.get(city) || 0) + 1);
      }
      if (!b.state && r.area?.state) {
        b.state = r.area.state;
      }
    }
  }

  return buckets;
}

/**
 * Picks the most frequent city name in a bucket without exposing locality/street details.
 */
function resolveBucketCity(cityCounts) {
  let bestCity = 'Regional Zone';
  let maxCount = 0;
  for (const [city, count] of cityCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      bestCity = city;
    }
  }
  return bestCity;
}

/**
 * Merges a set of fine-resolution buckets into a coarser H3 resolution.
 */
function coarsenBuckets(fineBuckets, targetResolution) {
  const coarse = new Map();

  for (const bucket of fineBuckets) {
    const parentH3 = getCoarserH3Cell(bucket.h3Index, targetResolution);
    const key = `${parentH3}::${bucket.disease}`;
    if (!coarse.has(key)) {
      coarse.set(key, {
        h3Index: parentH3,
        resolution: targetResolution,
        disease: bucket.disease,
        userIds: new Set(),
        cityCounts: new Map(),
        state: bucket.state,
      });
    }
    const target = coarse.get(key);
    for (const uid of bucket.userIds) target.userIds.add(uid);
    for (const [city, cnt] of bucket.cityCounts.entries()) {
      target.cityCounts.set(city, (target.cityCounts.get(city) || 0) + cnt);
    }
    if (!target.state && bucket.state) target.state = bucket.state;
  }

  return coarse;
}

/**
 * Runs the H3 spatial aggregation & privacy-filtering pipeline for a timeWindow.
 * Persists only anonymized AggregatedHotspot documents.
 *
 * @param {'7d' | '30d' | '90d'} timeWindow
 * @param {{ kThreshold?: number, reportingDelayHours?: number, syncAlerts?: boolean }} options
 */
export async function aggregateHotspotsToH3(timeWindow = '7d', options = {}) {
  const k = options.kThreshold ?? PRIVACY_CONFIG.MIN_K_THRESHOLD;
  const delayHours = options.reportingDelayHours ?? PRIVACY_CONFIG.REPORTING_DELAY_HOURS;
  const syncAlerts = options.syncAlerts !== false;

  const { periodStart, periodEnd, priorStart, now } = getHotspotWindowBounds(timeWindow, delayHours);

  // Fetch only minimal fields needed for H3 aggregation; never select notes or PII
  const [currentReports, priorReports] = await Promise.all([
    HealthReport.find({
      reportedAt: { $gte: periodStart, $lte: periodEnd },
      status: { $ne: 'dismissed' },
      'location.coordinates.0': { $exists: true },
    })
      .select('userId normalizedCategories area.city area.state location.coordinates')
      .lean(),
    HealthReport.find({
      reportedAt: { $gte: priorStart, $lt: periodStart },
      status: { $ne: 'dismissed' },
      'location.coordinates.0': { $exists: true },
    })
      .select('userId normalizedCategories location.coordinates')
      .lean(),
  ]);

  // Bucket current & prior reports at resolution 7
  const res7Buckets = bucketReportsByH3(currentReports, PRIVACY_CONFIG.DEFAULT_H3_RESOLUTION);
  const priorRes7 = bucketReportsByH3(priorReports, PRIVACY_CONFIG.DEFAULT_H3_RESOLUTION);
  const priorRes6 = bucketReportsByH3(priorReports, PRIVACY_CONFIG.INTERMEDIATE_H3_RESOLUTION);
  const priorRes5 = bucketReportsByH3(priorReports, PRIVACY_CONFIG.COARSE_H3_RESOLUTION);

  const publishedBuckets = [];
  const belowThresholdRes7 = [];

  for (const bucket of res7Buckets.values()) {
    if (bucket.userIds.size >= k) {
      publishedBuckets.push(bucket);
    } else {
      belowThresholdRes7.push(bucket);
    }
  }

  // Coarsen low-density cells to resolution 6
  const res6Buckets = coarsenBuckets(belowThresholdRes7, PRIVACY_CONFIG.INTERMEDIATE_H3_RESOLUTION);
  const belowThresholdRes6 = [];
  for (const bucket of res6Buckets.values()) {
    if (bucket.userIds.size >= k) {
      publishedBuckets.push(bucket);
    } else {
      belowThresholdRes6.push(bucket);
    }
  }

  // Coarsen remaining low-density cells to resolution 5 (~253 km^2)
  const res5Buckets = coarsenBuckets(belowThresholdRes6, PRIVACY_CONFIG.COARSE_H3_RESOLUTION);
  const suppressedBuckets = [];
  for (const bucket of res5Buckets.values()) {
    if (bucket.userIds.size >= k) {
      publishedBuckets.push(bucket);
    } else {
      suppressedBuckets.push(bucket);
    }
  }

  const bulkOps = [];
  const activeKeys = [];
  let alertsSynced = 0;

  const getPriorCount = (h3Index, resolution, disease) => {
    const key = `${h3Index}::${disease}`;
    if (resolution === PRIVACY_CONFIG.DEFAULT_H3_RESOLUTION) {
      return priorRes7.get(key)?.userIds.size || 0;
    }
    if (resolution === PRIVACY_CONFIG.INTERMEDIATE_H3_RESOLUTION) {
      return priorRes6.get(key)?.userIds.size || 0;
    }
    return priorRes5.get(key)?.userIds.size || 0;
  };

  for (const bucket of publishedBuckets) {
    const uniqueCount = bucket.userIds.size;
    const priorCount = getPriorCount(bucket.h3Index, bucket.resolution, bucket.disease);
    const growthRate =
      priorCount > 0 ? Math.round(((uniqueCount - priorCount) / priorCount) * 100) : uniqueCount >= 8 ? 100 : 0;

    const severity = classifyHotspotSeverity(uniqueCount, growthRate, k);
    const trend = classifyTrend(uniqueCount, priorCount, k);
    const caseCountRange = toCaseCountRange(uniqueCount, k);
    const city = resolveBucketCity(bucket.cityCounts);
    const approximateAreaName = formatApproximateAreaName(city, bucket.state);
    const { centroid, hexBoundary } = getH3Geometry(bucket.h3Index);
    const preventiveMeasures = getPreventiveMeasures(bucket.disease);

    activeKeys.push({ h3Index: bucket.h3Index, disease: bucket.disease });

    bulkOps.push({
      updateOne: {
        filter: { h3Index: bucket.h3Index, disease: bucket.disease, timeWindow },
        update: {
          $set: {
            resolution: bucket.resolution,
            approximateAreaName,
            city,
            state: bucket.state,
            caseCountRange,
            severity,
            trend,
            centroid,
            hexBoundary,
            preventiveMeasures,
            isSuppressed: false,
            isSampleData: false,
            periodStart,
            periodEnd,
            lastUpdatedAt: now,
          },
        },
        upsert: true,
      },
    });

    // Smart Jagruti Alert counter (elevated/high k-anonymous hotspots)
    if (syncAlerts && (severity === 'high' || (severity === 'moderate' && trend === 'increasing'))) {
      alertsSynced++;
    }
  }

  if (bulkOps.length > 0) {
    await AggregatedHotspot.bulkWrite(bulkOps);
  }

  // Remove stale non-sample hotspots for this timeWindow that no longer qualify
  if (activeKeys.length > 0) {
    await AggregatedHotspot.deleteMany({
      timeWindow,
      isSampleData: false,
      $nor: activeKeys.map((kObj) => ({
        h3Index: kObj.h3Index,
        disease: kObj.disease,
      })),
    });
  } else {
    await AggregatedHotspot.deleteMany({ timeWindow, isSampleData: false });
  }

  return {
    timeWindow,
    publishedCount: publishedBuckets.length,
    suppressedCount: suppressedBuckets.length,
    alertsSynced,
    evaluatedAt: now,
  };
}
