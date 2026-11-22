import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../../config/db.js';
import { normalizeSymptoms, extractSymptomsFromText } from './symptom-taxonomy.js';
import { buildAreaKey, detectHealthClusters } from './health-cluster.service.js';
import { calculateClusterRisk, DEFAULT_RISK_CONFIG } from './risk-scoring.service.js';
import { HealthReport } from './health-report.model.js';
import { AreaAlert } from './area-alert.model.js';
import { evaluateAndSyncAlerts, updateAlertReviewStatus } from './area-alert.service.js';
import { recordSymptomFromChat } from './health-risk.controller.js';

async function runTests() {
  console.log('--- Starting Area Health Risk Detection Unit & Integration Tests ---');
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
    // 1. Symptom Normalization Tests
    console.log('\n[1] Testing Symptom Normalization Taxonomy...');
    const norm1 = normalizeSymptoms(['high temperature', 'feverish']);
    assert(norm1.includes('Fever'), 'High temperature and feverish normalized to Fever');

    const norm2 = normalizeSymptoms(['body ache', 'muscle pain', 'tiredness']);
    assert(
      norm2.includes('Body Pain / Fatigue'),
      'Body ache and muscle pain normalized to Body Pain / Fatigue'
    );

    const norm3 = normalizeSymptoms(['dry cough', 'throat pain', 'chest congestion']);
    assert(
      norm3.includes('Respiratory / Cough'),
      'Dry cough and sore throat normalized to Respiratory / Cough'
    );

    const norm4 = normalizeSymptoms(['diarrhea', 'vomiting']);
    assert(
      norm4.includes('Gastrointestinal'),
      'Diarrhea and vomiting normalized to Gastrointestinal'
    );

    // 1B. Conversational Chat Symptom Extraction Tests
    console.log('\n[1B] Testing Conversational Chat Symptom Extraction (English & Indic)...');
    const chatMsg1 = 'Doctor, I have high fever and severe headache since yesterday.';
    const chatExt1 = extractSymptomsFromText(chatMsg1);
    assert(chatExt1.hasSymptoms, 'Detected symptoms in English conversational message');
    assert(chatExt1.matchedCategories.includes('Fever'), 'Extracted Fever from chat');
    assert(chatExt1.matchedCategories.includes('Headache'), 'Extracted Headache from chat');
    assert(chatExt1.estimatedSeverity === 'severe', 'Identified severe intensity from context');

    const chatMsg2 = 'Mujhe kal raat se bohot tez bukhar aur sardi khansi ho rahi hai';
    const chatExt2 = extractSymptomsFromText(chatMsg2);
    assert(chatExt2.hasSymptoms, 'Detected symptoms in Hinglish conversational message');
    assert(chatExt2.matchedCategories.includes('Fever'), 'Extracted bukhar as Fever');
    assert(chatExt2.matchedCategories.includes('Respiratory / Cough'), 'Extracted khansi as Respiratory / Cough');

    const chatMsg3 = 'Can you show me my uploaded blood test report from last month?';
    const chatExt3 = extractSymptomsFromText(chatMsg3);
    assert(!chatExt3.hasSymptoms, 'General health question correctly identified as non-symptom');

    // 2. Area Key Normalization Tests
    console.log('\n[2] Testing Area Key Normalization...');
    const key1 = buildAreaKey({ city: 'Mumbai', locality: 'Andheri West' });
    assert(key1 === 'mumbai:andheri_west', 'Correctly generated mumbai:andheri_west');

    const key2 = buildAreaKey({ city: 'Bengaluru', postalCode: '560034' });
    assert(key2 === 'bengaluru:560034', 'Correctly generated postal code key bengaluru:560034');

    // 3. Risk Scoring Engine Tests
    console.log('\n[3] Testing Configurable Risk Scoring Engine...');
    const normalCluster = {
      uniqueUserCount: 2,
      growthRate: 0,
      primarySymptomCategories: [{ category: 'Fever', count: 2, percentage: 50 }],
      timeWindow: '7d',
    };
    const normalRisk = calculateClusterRisk(normalCluster);
    assert(normalRisk.severity === 'normal', `2 reports categorized as ${normalRisk.severity} (score: ${normalRisk.riskScore})`);

    const watchCluster = {
      uniqueUserCount: 7,
      growthRate: 20,
      primarySymptomCategories: [{ category: 'Fever', count: 6, percentage: 85 }],
      timeWindow: '7d',
    };
    const watchRisk = calculateClusterRisk(watchCluster);
    assert(
      watchRisk.severity === 'watch' || watchRisk.severity === 'elevated',
      `7 reports with high concentration categorized as ${watchRisk.severity} (score: ${watchRisk.riskScore})`
    );

    const criticalCluster = {
      uniqueUserCount: 28,
      growthRate: 150,
      primarySymptomCategories: [{ category: 'Fever', count: 25, percentage: 89 }],
      timeWindow: '7d',
    };
    const critRisk = calculateClusterRisk(criticalCluster);
    assert(critRisk.severity === 'critical', `28 reports with spike categorized as critical (score: ${critRisk.riskScore})`);

    // 4. Database Integration & Clustering Tests
    console.log('\n[4] Connecting to Database for Integration Tests...');
    await connectDB();

    const testAreaKey = 'test_city:test_locality';
    // Clean up any previous test records
    await HealthReport.deleteMany({ areaKey: testAreaKey });
    await AreaAlert.deleteMany({ areaKey: testAreaKey });

    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    const userC = new mongoose.Types.ObjectId();

    console.log('\n[5] Testing User Deduplication (Same user submitting multiple times)...');
    // User A reports twice within the same day
    await HealthReport.create([
      {
        userId: userA,
        rawSymptoms: ['fever', 'high temp'],
        normalizedCategories: ['Fever'],
        area: { city: 'Test City', locality: 'Test Locality' },
        areaKey: testAreaKey,
        reportedAt: new Date(),
      },
      {
        userId: userA, // repeat submission by same user
        rawSymptoms: ['headache', 'fever'],
        normalizedCategories: ['Fever', 'Headache'],
        area: { city: 'Test City', locality: 'Test Locality' },
        areaKey: testAreaKey,
        reportedAt: new Date(),
      },
      {
        userId: userB,
        rawSymptoms: ['fever', 'shivering'],
        normalizedCategories: ['Fever'],
        area: { city: 'Test City', locality: 'Test Locality' },
        areaKey: testAreaKey,
        reportedAt: new Date(),
      },
    ]);

    const clusters = await detectHealthClusters('7d');
    const targetCluster = clusters.find((c) => c.areaKey === testAreaKey);
    assert(Boolean(targetCluster), 'Target test cluster found in aggregation');
    assert(
      targetCluster?.uniqueUserCount === 2,
      `Unique user count correctly deduplicated to 2 (total reports: ${targetCluster?.totalReportCount})`
    );

    console.log('\n[5B] Testing Automated Background Chat Symptom Recording...');
    const userChatDoc = await recordSymptomFromChat({
      userId: userC,
      message: 'I am shivering with fever and fatigue since 2 days',
      preferredLanguage: 'en-IN',
    });
    assert(Boolean(userChatDoc), 'recordSymptomFromChat successfully recorded report from chat message');
    assert(
      userChatDoc?.normalizedCategories?.includes('Fever'),
      'Saved report contains extracted Fever'
    );

    // Submitting again in same session should be deduplicated
    const dupChatDoc = await recordSymptomFromChat({
      userId: userC,
      message: 'Also my fever is getting higher',
      preferredLanguage: 'en-IN',
    });
    assert(dupChatDoc === null, 'Deduplication prevented redundant report within 12h session');

    console.log('\n[6] Testing Duplicate Alert Prevention & Alert Updates...');
    // Seed enough distinct users to cross the watch threshold (e.g., 6 users)
    const extraUsers = Array.from({ length: 7 }, () => new mongoose.Types.ObjectId());
    await HealthReport.insertMany(
      extraUsers.map((uid) => ({
        userId: uid,
        rawSymptoms: ['fever', 'cough'],
        normalizedCategories: ['Fever', 'Respiratory / Cough'],
        area: { city: 'Test City', locality: 'Test Locality' },
        areaKey: testAreaKey,
        reportedAt: new Date(),
      }))
    );

    // First scan creates alert
    const syncResult1 = await evaluateAndSyncAlerts('7d');
    assert(syncResult1.created >= 1 || syncResult1.updated >= 1, 'evaluateAndSyncAlerts generated/updated alert');

    const alertDoc1 = await AreaAlert.findOne({ areaKey: testAreaKey, timeWindow: '7d' });
    assert(Boolean(alertDoc1), 'AreaAlert document successfully persisted');
    const firstAlertId = alertDoc1?._id?.toString();

    // Second scan must update the SAME alert and NOT create a duplicate
    const syncResult2 = await evaluateAndSyncAlerts('7d');
    const allAlertsForArea = await AreaAlert.find({ areaKey: testAreaKey, timeWindow: '7d' });
    assert(
      allAlertsForArea.length === 1,
      `Duplicate alert prevented: Exactly 1 alert exists for areaKey (found: ${allAlertsForArea.length})`
    );
    assert(
      allAlertsForArea[0]._id.toString() === firstAlertId,
      'Same alert document updated with latest metrics'
    );

    console.log('\n[7] Testing Reviewer Audit Actions (Doctor / Admin)...');
    const doctorReviewer = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Dr. Sharma',
      role: 'doctor',
    };

    const reviewedAlert = await updateAlertReviewStatus(
      alertDoc1._id,
      doctorReviewer,
      'under_review',
      'Clinical team deployed to investigate viral pattern.'
    );

    assert(reviewedAlert.status === 'under_review', 'Alert status transitioned to under_review');
    assert(
      reviewedAlert.reviewHistory.length === 1,
      'Audit log recorded in reviewHistory'
    );
    assert(
      reviewedAlert.reviewHistory[0].reviewerName === 'Dr. Sharma',
      'Reviewer name accurately logged'
    );

    // Clean up test data
    console.log('\n[8] Cleaning up test data...');
    await HealthReport.deleteMany({ areaKey: testAreaKey });
    await AreaAlert.deleteMany({ areaKey: testAreaKey });
    console.log('Test cleanup complete.');

    console.log(`\n========================================`);
    console.log(`Tests Completed: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runTests();
