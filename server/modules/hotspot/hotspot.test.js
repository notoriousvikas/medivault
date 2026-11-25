import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../../config/db.js';
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
  quantizeBoundingBox,
  sanitizeHotspotForPublic,
} from './hotspot.privacy.js';
import { aggregateHotspotsToH3 } from './hotspot.aggregation.js';
import {
  getHotspots,
  getHotspotById,
  getHotspotSummary,
  invalidateHotspotCache,
} from './hotspot.service.js';

async function runHotspotTests() {
  console.log('--- Starting AyuRaksha Jagruti H3 Hotspot & Privacy Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. H3 & Privacy Unit Tests
    console.log('\n[1] Testing H3 Spatial Indexing & Privacy Functions...');
    const h3Res7 = coordsToH3Cell(32.7266, 74.857, 7);
    assert(typeof h3Res7 === 'string' && h3Res7.length > 10, `Generated valid H3 res-7 index: ${h3Res7}`);

    const geom = getH3Geometry(h3Res7);
    assert(
      geom.centroid.type === 'Point' && geom.hexBoundary.type === 'Polygon',
      'Generated GeoJSON Point centroid and Polygon hexBoundary from H3 cell'
    );
    assert(
      geom.centroid.coordinates[0] !== 74.857 || geom.centroid.coordinates[1] !== 32.7266,
      'Cell centroid differs from exact patient input coordinate'
    );

    const parentRes5 = getCoarserH3Cell(h3Res7, 5);
    assert(parentRes5 && parentRes5 !== h3Res7, `Coarsened H3 cell to res-5: ${parentRes5}`);

    assert(toCaseCountRange(3) === 'Insufficient Data', 'Count < k (3) returns Insufficient Data');
    assert(toCaseCountRange(5) === '5–10', 'Count 5 returns range 5–10');
    assert(toCaseCountRange(15) === '11–20', 'Count 15 returns range 11–20');

    assert(
      classifyHotspotSeverity(2, 100) === 'insufficient_data',
      'Area below k=5 is classified as insufficient_data (never disease-free)'
    );
    assert(classifyHotspotSeverity(14, 30) === 'moderate', '14 cases with +30% growth classified as moderate');
    assert(classifyHotspotSeverity(24, 10) === 'high', '24 cases classified as high');

    assert(classifyTrend(15, 10) === 'increasing', '10 -> 15 classified as increasing');
    assert(classifyTrend(8, 12) === 'decreasing', '12 -> 8 classified as decreasing');
    assert(classifyTrend(10, 10) === 'stable', '10 -> 10 classified as stable');

    const qBbox = quantizeBoundingBox([74.8123, 32.6891, 74.9345, 32.7891]);
    assert(
      qBbox[0] === 74.8 && qBbox[1] === 32.6 && qBbox[2] === 75.0 && qBbox[3] === 32.8,
      'Bounding box quantized to 0.1 degree grid to prevent differencing attacks'
    );

    const suppressedDoc = sanitizeHotspotForPublic({ h3Index: h3Res7, isSuppressed: true });
    assert(suppressedDoc === null, 'Suppressed hotspot returns null from public sanitizer');

    const publicDoc = sanitizeHotspotForPublic({
      _id: new mongoose.Types.ObjectId(),
      h3Index: h3Res7,
      resolution: 7,
      disease: 'Dengue',
      timeWindow: '7d',
      approximateAreaName: 'Jammu – Approximate Region',
      city: 'Jammu',
      caseCountRange: '11–20',
      severity: 'moderate',
      trend: 'increasing',
      centroid: geom.centroid,
      hexBoundary: geom.hexBoundary,
      isSuppressed: false,
      userId: 'SECRET_USER_ID',
      rawCoordinates: [74.857, 32.7266],
      uniqueUserCount: 14,
    });
    assert(
      publicDoc &&
        !('userId' in publicDoc) &&
        !('rawCoordinates' in publicDoc) &&
        !('uniqueUserCount' in publicDoc),
      'Sanitizer strips userId, rawCoordinates, and exact uniqueUserCount'
    );

    // 2. Database Integration Tests
    console.log('\n[2] Connecting to MongoDB for H3 Aggregation & Privacy Integration Tests...');
    await connectDB();

    const testCity = 'TestH3City';
    const testAreaKey = 'testh3city:testzone';
    await HealthReport.deleteMany({ areaKey: testAreaKey });
    await AggregatedHotspot.deleteMany({ city: testCity });

    // Eligible timestamp (12 hours ago, past the 6h reporting delay)
    const eligibleTime = new Date(Date.now() - 12 * 60 * 60 * 1000);
    // Too recent timestamp (1 hour ago, should be excluded by 6h reporting delay)
    const tooRecentTime = new Date(Date.now() - 1 * 60 * 60 * 1000);

    // Seed 6 distinct users in Jammu-like coords for Dengue (meets k=5)
    const dengueUsers = Array.from({ length: 6 }, () => new mongoose.Types.ObjectId());
    await HealthReport.insertMany(
      dengueUsers.map((uid, idx) => ({
        userId: uid,
        rawSymptoms: ['fever', 'rash'],
        normalizedCategories: ['Dengue'],
        area: { city: testCity, state: 'TestState', locality: 'Zone A' },
        areaKey: testAreaKey,
        location: { type: 'Point', coordinates: [76.501 + idx * 0.0005, 30.501 + idx * 0.0005] },
        reportedAt: eligibleTime,
      }))
    );

    // Seed 2 distinct users for Malaria (below k=5, must be suppressed!)
    // Also add 4 recent Malaria reports within 1h (should be excluded by reporting delay -> still < 5)
    const malariaUsers = Array.from({ length: 6 }, () => new mongoose.Types.ObjectId());
    await HealthReport.insertMany(
      malariaUsers.map((uid, idx) => ({
        userId: uid,
        rawSymptoms: ['chills'],
        normalizedCategories: ['Malaria'],
        area: { city: testCity, state: 'TestState', locality: 'Zone B' },
        areaKey: testAreaKey,
        location: { type: 'Point', coordinates: [76.901, 30.901] },
        reportedAt: idx < 2 ? eligibleTime : tooRecentTime,
      }))
    );

    const aggStats = await aggregateHotspotsToH3('7d', {
      kThreshold: 5,
      reportingDelayHours: 6,
      syncAlerts: true,
    });
    assert(aggStats.publishedCount >= 1, `Published ${aggStats.publishedCount} k-anonymous H3 hotspot(s)`);
    assert(aggStats.suppressedCount >= 1, `Suppressed ${aggStats.suppressedCount} below-threshold H3 cell(s)`);

    // Verify Dengue hotspot is published & Malaria (<5 eligible) is suppressed
    invalidateHotspotCache();
    const res1 = await getHotspots({ area: testCity, timeWindow: '7d' });
    assert(res1.cacheHit === false, 'First query is a cache miss');
    assert(
      res1.hotspots.some((h) => h.disease === 'Dengue' && h.caseCountRange === '5–10'),
      'Dengue hotspot published with privacy range 5–10'
    );
    assert(
      !res1.hotspots.some((h) => h.disease === 'Malaria'),
      'Malaria cell (<5 eligible due to reporting delay + k=5) is suppressed'
    );

    // Verify Cache Hit on second identical query
    const res2 = await getHotspots({ area: testCity, timeWindow: '7d' });
    assert(res2.cacheHit === true, 'Second identical query served from TTL cache');

    // Verify getHotspotById & getHotspotSummary
    const targetId = res1.hotspots.find((h) => h.disease === 'Dengue')?.id;
    const detail = await getHotspotById(targetId);
    assert(detail && detail.disease === 'Dengue', 'getHotspotById returns sanitized hotspot detail');

    const summary = await getHotspotSummary({ area: testCity, timeWindow: '7d' });
    assert(summary.totalHotspots >= 1, 'getHotspotSummary returns aggregated regional stats');

    // Clean up test data
    await HealthReport.deleteMany({ areaKey: testAreaKey });
    await AggregatedHotspot.deleteMany({ city: testCity });
    invalidateHotspotCache();

    console.log(`\n========================================`);
    console.log(`Hotspot Tests Completed: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Hotspot test error:', err);
    process.exit(1);
  }
}

runHotspotTests();
