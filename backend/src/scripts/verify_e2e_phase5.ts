import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { Message } from '../models/Message';
import { TriageDecision } from '../models/TriageDecision';
import { GroundTruth } from '../models/GroundTruth';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function runE2EPhase5() {
  console.log('=== STARTING E2E REST API PHASE 5 VERIFICATION ===\n');

  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/frontline_sentinel';
  console.log(`Connecting to MongoDB to check database state: ${dbUri}`);
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB.\n');

  const results: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];
  let seededMessages: any[] = [];

  const assertTest = (name: string, assertion: boolean, details?: string) => {
    if (assertion) {
      results.push({ test: name, status: 'PASS', details });
      console.log(`[PASS] - ${name}`);
    } else {
      results.push({ test: name, status: 'FAIL', details });
      console.log(`[FAIL] - ${name} - ${details || 'Assertion failed'}`);
    }
  };

  try {
    // 1. Check Health Endpoint
    console.log('Checking health endpoint...');
    const healthRes = await fetch(`${API_BASE}/health`);
    const health = await healthRes.json() as any;
    assertTest(
      'API: Health check is online',
      healthRes.ok && health.status === 'ok' && health.database === 'connected'
    );

    // Clean up old evaluation ground truths to start fresh
    console.log('Cleaning up existing ground truths for clean E2E test...');
    await GroundTruth.deleteMany({});
    console.log('Ground truths cleaned.\n');

    // 2. Seed Dataset via API
    console.log('Seeding challenge dataset via POST /api/evaluations/seed...');
    const seedRes = await fetch(`${API_BASE}/evaluations/seed`, { method: 'POST' });
    const seedResult = await seedRes.json() as any;
    assertTest(
      'API: Seed dataset endpoint returns success status',
      seedRes.ok && seedResult.status === 'success'
    );

    // Verify messages exist in MongoDB
    seededMessages = await Message.find({ externalId: { $regex: /^eval-/ } }).sort({ externalId: 1 });
    assertTest('DB: 10 challenge messages verified in database', seededMessages.length === 10);

    // 3. Trigger Bulk Triage & Poll for Completion
    console.log('\nTriggering bulk triage for seeded tickets via POST /api/triage/bulk...');
    const bulkStartRes = await fetch(`${API_BASE}/triage/bulk`, { method: 'POST' });
    assertTest('API: Bulk triage started successfully', bulkStartRes.ok);

    console.log('Waiting for sequential bulk triage to complete (polling status)...');
    let statusText = 'running';
    let attempts = 0;
    const maxAttempts = 70; // 105 seconds timeout

    while (statusText === 'running' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const statusRes = await fetch(`${API_BASE}/triage/bulk/status`);
      const statusData = await statusRes.json() as any;
      statusText = statusData.status;
      console.log(`Polling status: ${statusText} | Processed: ${statusData.processed}/${statusData.total}`);
      attempts++;
    }

    assertTest(
      'API: Sequential bulk triage completed processing',
      statusText === 'completed' || statusText === 'idle'
    );

    // Fetch decisions from DB to make sure they exist
    const messageIds = seededMessages.map((m: any) => m._id);
    const decisionsCount = await TriageDecision.countDocuments({ messageId: { $in: messageIds } });
    console.log(`Triage decisions in MongoDB for seeded messages: ${decisionsCount}/10`);
    assertTest(
      'DB: AI Triage decisions stored in MongoDB',
      decisionsCount > 0
    );

    // 4. Create Ground Truth Records via POST /api/evaluations
    console.log('\nPosting Ground Truth labels for the seeded tickets...');
    
    // We will construct deterministic ground truths for whatever decisions the AI made
    const loadedDecisions = await TriageDecision.find({ messageId: { $in: messageIds } }).lean() as any[];
    const decisionsMap = new Map(loadedDecisions.map(d => [d.messageId.toString(), d]));

    // Deterministic test fixtures for ground truths
    // To check metrics, we will deliberately match some and mismatch others
    // We will save ground truth Category, Priority, and NeedsHuman review
    let labelCount = 0;
    for (const msg of seededMessages) {
      const decision = decisionsMap.get(msg._id.toString());
      if (!decision) continue;

      // Deterministic classification choices
      let gtCategory = decision.category;
      let gtPriority = decision.priority;
      let gtNeedsHuman = decision.needsHuman;
      let notes = `E2E verification fixture label. AI category was ${decision.category}`;

      if (msg.externalId === 'eval-04') {
        gtCategory = 'billing';
        gtNeedsHuman = !decision.needsHuman;
        notes += ' | Category mismatch fixture';
      } else if (msg.externalId === 'eval-05') {
        gtPriority = decision.priority === 'P0' ? 'P1' : 'P0';
        notes += ' | Priority mismatch fixture';
      } else if (msg.externalId === 'eval-06') {
        gtNeedsHuman = true; // force needsHuman=true
        notes += ' | False negative escalation trigger fixture';
      } else if (msg.externalId === 'eval-10') {
        gtNeedsHuman = false; // force needsHuman=false
        notes += ' | False positive escalation trigger fixture';
      }

      const saveGTRes = await fetch(`${API_BASE}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: msg._id.toString(),
          groundTruthCategory: gtCategory,
          groundTruthPriority: gtPriority,
          groundTruthNeedsHuman: gtNeedsHuman,
          notes
        })
      });

      if (saveGTRes.ok) labelCount++;
    }

    assertTest('API: Ground truth labels saved for all active decisions', labelCount === decisionsCount);

    // Verify Ground Truth is stored in MongoDB separately and matches what was saved
    const savedGTCount = await GroundTruth.countDocuments({ messageId: { $in: messageIds } });
    assertTest('DB: Ground Truth documents persisted in MongoDB', savedGTCount === labelCount);

    // Retrieve original decisions and verify they remain unmodified (Independence)
    const afterDecisions = await TriageDecision.find({ messageId: { $in: messageIds } }).lean() as any[];
    let preserved = true;
    afterDecisions.forEach((d) => {
      const orig = decisionsMap.get(d.messageId.toString());
      if (orig && (orig.category !== d.category || orig.priority !== d.priority || orig.needsHuman !== d.needsHuman)) {
        preserved = false;
      }
    });
    assertTest('DB: Production AI decisions preserved and unmodified', preserved);

    // 5. Retrieve Individual Evaluation Details
    console.log(`\nRetrieving evaluation detail for message: ${seededMessages[0]._id}...`);
    const detailRes = await fetch(`${API_BASE}/evaluations/${seededMessages[0]._id}`);
    const details = await detailRes.json() as any;
    assertTest(
      'API: Individual evaluation retrieval returned correct structure',
      detailRes.ok && 
      details.messageId === seededMessages[0]._id.toString() &&
      details.aiDecision !== undefined &&
      details.groundTruth !== undefined &&
      details.comparison !== undefined
    );

    // 6. Retrieve Metrics & Verify Calculations
    console.log('\nRetrieving computed evaluation metrics via GET /api/evaluations/metrics...');
    const metricsRes = await fetch(`${API_BASE}/evaluations/metrics`);
    const metricsResult = await metricsRes.json() as any;
    const m = metricsResult.metrics;

    assertTest(
      'API: Metrics retrieval returned successfully',
      metricsRes.ok && m !== undefined && metricsResult.modelInfo !== undefined
    );

    console.log('\n--- CALCULATED METRICS DETAILS ---');
    console.log(`Evaluated count: ${m.evaluatedCount}`);
    console.log(`Category Agreement: ${Math.round(m.categoryAgreement * 100)}% (${m.categoryCorrect}/${m.evaluatedCount})`);
    console.log(`Priority Agreement: ${Math.round(m.priorityAgreement * 100)}% (${m.priorityCorrect}/${m.evaluatedCount})`);
    console.log(`Human Escalation Agreement: ${Math.round(m.humanEscalationAgreement * 100)}% (${m.humanEscalationCorrect}/${m.evaluatedCount})`);
    console.log(`Human Escalation Recall: ${m.humanEscalationRecall}`);
    console.log(`Overall Agreement: ${Math.round(m.overallAgreement * 100)}% (${m.overallCorrect}/${m.evaluatedCount})`);
    console.log(`False Positives: ${m.falsePositiveHumanEscalations}`);
    console.log(`False Negatives: ${m.falseNegativeHumanEscalations}`);
    console.log(`Latency average: ${m.averageLatency.toFixed(1)}ms | min: ${m.minLatency}ms | max: ${m.maxLatency}ms | median: ${m.medianLatency}ms`);
    console.log(`Tokens average input: ${m.averageInputTokens} | output: ${m.averageOutputTokens}`);
    console.log(`Pricing Cost Configured: ${m.pricingConfigured} | Total Cost: ${m.totalCost}`);
    console.log('----------------------------------\n');

    assertTest('Metrics: Evaluated count matches labeled count', m.evaluatedCount === labelCount);
    assertTest('Metrics: Latency calculations are present and non-zero', m.averageLatency > 0);
    assertTest('Metrics: Model details are populated and correct', metricsResult.modelInfo.provider === 'Gemini');

    // 7. Test Empty-Evaluation metrics behavior (Delete GTs temporarily)
    console.log('Testing Empty evaluation metrics behavior...');
    await GroundTruth.deleteMany({});
    const emptyMetricsRes = await fetch(`${API_BASE}/evaluations/metrics`);
    const emptyMetricsResult = await emptyMetricsRes.json() as any;
    const em = emptyMetricsResult.metrics;

    assertTest(
      'Empty Set: returns zero and N/A values cleanly without NaN/division-by-zero errors',
      emptyMetricsRes.ok &&
      em.evaluatedCount === 0 &&
      em.categoryAgreement === 0 &&
      em.overallAgreement === 0 &&
      typeof em.humanEscalationRecall === 'string' &&
      em.humanEscalationRecall.includes('N/A')
    );

    // 8. Test Schema Error handling
    console.log('\nTesting Schema validation error handling for ground-truth saves...');
    
    // 8.1 Invalid Category
    const errRes1 = await fetch(`${API_BASE}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: seededMessages[0]._id.toString(),
        groundTruthCategory: 'not-a-category-abc',
        groundTruthPriority: 'P2',
        groundTruthNeedsHuman: false
      })
    });
    assertTest('Validation: rejects invalid category with HTTP 400', errRes1.status === 400);

    // 8.2 Invalid Priority
    const errRes2 = await fetch(`${API_BASE}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: seededMessages[0]._id.toString(),
        groundTruthCategory: 'billing',
        groundTruthPriority: 'P99',
        groundTruthNeedsHuman: false
      })
    });
    assertTest('Validation: rejects invalid priority with HTTP 400', errRes2.status === 400);

    // 8.3 Missing Required Field
    const errRes3 = await fetch(`${API_BASE}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: seededMessages[0]._id.toString(),
        groundTruthCategory: 'billing',
        groundTruthPriority: 'P2'
        // omitted groundTruthNeedsHuman
      })
    });
    assertTest('Validation: rejects missing fields with HTTP 400', errRes3.status === 400);

  } catch (err: any) {
    console.error('❌ E2E VERIFICATION ERROR:', err.message || err);
    assertTest('E2E execution completed cleanly', false, err.message);
  } finally {
    if (seededMessages && seededMessages.length > 0) {
      console.log('Restoring ground truth labels for the live demo...');
      const messageIds = seededMessages.map((m: any) => m._id);
      const loadedDecisions = await TriageDecision.find({ messageId: { $in: messageIds } }).lean() as any[];
      const decisionsMap = new Map(loadedDecisions.map(d => [d.messageId.toString(), d]));
      
      for (const msg of seededMessages) {
        const decision = decisionsMap.get(msg._id.toString());
        if (!decision) continue;

        let gtCategory = decision.category;
        let gtPriority = decision.priority;
        let gtNeedsHuman = decision.needsHuman;
        let notes = `Restored verification label. AI category was ${decision.category}`;

        if (msg.externalId === 'eval-04') {
          gtCategory = 'billing';
          gtNeedsHuman = !decision.needsHuman;
          notes += ' | Category mismatch';
        } else if (msg.externalId === 'eval-05') {
          gtPriority = decision.priority === 'P0' ? 'P1' : 'P0';
          notes += ' | Priority mismatch';
        } else if (msg.externalId === 'eval-06') {
          gtNeedsHuman = true;
          notes += ' | False negative escalation';
        } else if (msg.externalId === 'eval-10') {
          gtNeedsHuman = false;
          notes += ' | False positive escalation';
        }

        await GroundTruth.create({
          messageId: msg._id,
          groundTruthCategory: gtCategory,
          groundTruthPriority: gtPriority,
          groundTruthNeedsHuman: gtNeedsHuman,
          notes
        }).catch(() => {});
      }
    }

    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
  }

  console.log('\n=== E2E VERIFICATION RESULTS SUMMARY ===');
  console.table(results);

  const failedCount = results.filter((r) => r.status === 'FAIL').length;
  if (failedCount > 0) {
    console.log(`\n❌ E2E VERIFICATION FAILED: ${failedCount} tests failed.`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL E2E ENDPOINT VERIFICATIONS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runE2EPhase5();
