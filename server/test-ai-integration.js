import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { checkAiServiceHealth, analyzeChestXRay } from './services/ai.service.js';

async function runIntegrationTest() {
  console.log('--- 1. Testing checkAiServiceHealth() ---');
  const health = await checkAiServiceHealth();
  console.log('AI Service Health Check Result:', JSON.stringify(health, null, 2));

  if (!health.available || !health.modelLoaded) {
    throw new Error('AI Service is not ready or model is not loaded.');
  }

  console.log('\n--- 2. Testing analyzeChestXRay() with sample_xray.png ---');
  const samplePath = path.resolve('scratch', 'sample_xray.png');
  const fileBuffer = fs.readFileSync(samplePath);

  const analysis = await analyzeChestXRay({
    fileBuffer,
    filename: 'sample_xray.png',
    contentType: 'image/png',
    scanId: 'TEST-SCAN-12345',
  });

  console.log('Inference Successful!');
  console.log('Status:', analysis.status);
  console.log('Scan ID:', analysis.scan_id);
  console.log('Model:', analysis.model_name, `(${analysis.model_version})`);
  console.log('Device:', analysis.device);
  console.log('Execution Time:', analysis.execution_time_ms, 'ms');
  console.log('Total Findings Detected:', analysis.findings.length);
  console.log('\nTop 5 Pathology Scores:');
  const sorted = [...analysis.findings].sort((a, b) => b.raw_score - a.raw_score);
  for (const item of sorted.slice(0, 5)) {
    console.log(`  - ${item.label.padEnd(20)} : ${item.raw_score.toFixed(4)}`);
  }
  console.log('\nDisclaimer Present:', Boolean(analysis.clinical_disclaimer));
  console.log('\n>>> Python AI-Microservice to Express Backend Integration: 100% OPERATIONAL! <<<');
}

runIntegrationTest().catch((err) => {
  console.error('Integration Test Failed:', err);
  process.exit(1);
});
