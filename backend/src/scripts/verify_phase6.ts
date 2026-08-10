import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import apiRouter from '../routes/api';
import { errorHandler } from '../middleware/error.middleware';
import { Message } from '../models/Message';
import { TriageDecision } from '../models/TriageDecision';
import { Review } from '../models/Review';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = 5006;
const API_BASE = `http://127.0.0.1:${PORT}/api`;

async function runPhase6Tests() {
  console.log('=== STARTING FRONTLINE SENTINEL PHASE 6 AUTOMATED TESTS ===\n');

  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/frontline_sentinel';
  console.log(`Connecting to database: ${dbUri}`);
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB.\n');

  const results: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];

  const assertTest = (name: string, assertion: boolean, details?: string) => {
    if (assertion) {
      results.push({ test: name, status: 'PASS', details });
      console.log(`[PASS] - ${name}`);
    } else {
      results.push({ test: name, status: 'FAIL', details });
      console.log(`[FAIL] - ${name} - ${details || 'Assertion failed'}`);
    }
  };

  // Start express server programmatically for testing endpoints
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  app.use(errorHandler);
  const server = app.listen(PORT);
  console.log(`Programmatic server listening on ${API_BASE}\n`);

  try {
    // -------------------------------------------------------------
    // Clean up database collections first
    // -------------------------------------------------------------
    await Message.deleteMany({});
    await TriageDecision.deleteMany({});
    await Review.deleteMany({});

    // -------------------------------------------------------------
    // 1. SETUP TEST CASE
    // -------------------------------------------------------------
    const testMessageId = new mongoose.Types.ObjectId();
    const testDecisionId = new mongoose.Types.ObjectId();

    // Create Message
    const msg = await Message.create({
      _id: testMessageId,
      rawText: 'This is a test payment problem case.',
      status: 'human_review',
    });

    // Create original TriageDecision (immutability check)
    const decision = await TriageDecision.create({
      _id: testDecisionId,
      messageId: testMessageId,
      category: 'billing',
      priority: 'P1',
      summary: 'Test payment problem',
      suggestedAction: 'Escalate to billing support.',
      needsHuman: true,
      confidence: 0.72,
      humanReason: 'Payment issue detected.',
      model: 'gemini-3.5-flash',
      promptVersion: 'v2',
      latencyMs: 1200,
    });

    assertTest('Setup: Test message and decision created', !!msg && !!decision);

    // -------------------------------------------------------------
    // 2. TEST NOTE VALIDATION (FAIL ON NO NOTE ON OVERRIDE)
    // -------------------------------------------------------------
    console.log('\n--- Running Zod Note Override Validation Tests ---');
    const badOverridePayload = {
      decision: 'overridden',
      finalCategory: 'account',
      finalPriority: 'P0',
      finalAction: 'Immediate root intervention required.',
      finalNeedsHuman: false,
      notes: '', // missing/empty note
    };

    const badOverrideRes = await fetch(`${API_BASE}/reviews/${testMessageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(badOverridePayload),
    });

    assertTest(
      'Validation: Override fails with HTTP 400 when note is empty',
      badOverrideRes.status === 400
    );
    const badResBody = await badOverrideRes.json() as any;
    assertTest(
      'Validation: Error message matches note requirement',
      badResBody.errors?.[0]?.message.includes('note is required')
    );

    // -------------------------------------------------------------
    // 3. TEST OVERRIDE DECISION (SUCCESS & STATUS UPDATE)
    // -------------------------------------------------------------
    console.log('\n--- Running Override Decision Tests ---');
    const goodOverridePayload = {
      decision: 'overridden',
      finalCategory: 'security_abuse',
      finalPriority: 'P0',
      finalAction: 'Security override protocol active.',
      finalNeedsHuman: false,
      notes: 'Customer card has been flagged as stolen.',
    };

    const goodOverrideRes = await fetch(`${API_BASE}/reviews/${testMessageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goodOverridePayload),
    });

    assertTest('API: Good override returns HTTP 201 Created', goodOverrideRes.status === 201);
    
    // Check if message status updated to 'completed' since finalNeedsHuman is false
    const updatedMsg = await Message.findById(testMessageId);
    assertTest(
      'Status: Message status updated to "completed" since needsHuman is overridden to false',
      updatedMsg?.status === 'completed'
    );

    // Check if review document is stored correctly
    const reviewDoc = await Review.findOne({ messageId: testMessageId });
    assertTest('DB: Review document saved successfully', !!reviewDoc);
    assertTest('DB: Review decision is overridden', reviewDoc?.decision === 'overridden');
    assertTest('DB: Review notes match', reviewDoc?.notes === goodOverridePayload.notes);

    // Check original TriageDecision immutability
    const unchangedDecision = await TriageDecision.findById(testDecisionId);
    assertTest(
      'Immutability: Original AI Category is unmodified',
      unchangedDecision?.category === 'billing'
    );
    assertTest(
      'Immutability: Original AI Priority is unmodified',
      unchangedDecision?.priority === 'P1'
    );
    assertTest(
      'Immutability: Original AI NeedsHuman is unmodified',
      unchangedDecision?.needsHuman === true
    );

    // -------------------------------------------------------------
    // 4. TEST ACCEPT DECISION (SUCCESS & STATUS UPDATE)
    // -------------------------------------------------------------
    console.log('\n--- Running Accept Decision Tests ---');
    // Clear review document first
    await Review.deleteMany({});
    
    // Reset message status to human_review
    await Message.findByIdAndUpdate(testMessageId, { status: 'human_review' });

    const acceptPayload = {
      decision: 'accepted',
      finalCategory: 'billing',
      finalPriority: 'P1',
      finalAction: 'Escalate to billing support.',
      finalNeedsHuman: true, // keeping it needsHuman = true
      notes: 'AI decision matches payment protocols.',
    };

    const acceptRes = await fetch(`${API_BASE}/reviews/${testMessageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(acceptPayload),
    });

    assertTest('API: Accept returns HTTP 201 Created', acceptRes.status === 201);

    const afterAcceptMsg = await Message.findById(testMessageId);
    assertTest(
      'Status: Message status remains "human_review" since needsHuman is true',
      afterAcceptMsg?.status === 'human_review'
    );

    const acceptReviewDoc = await Review.findOne({ messageId: testMessageId });
    assertTest('DB: Review decision is accepted', acceptReviewDoc?.decision === 'accepted');

    // -------------------------------------------------------------
    // 5. TEST GET REVIEWS LIST API
    // -------------------------------------------------------------
    console.log('\n--- Running GET /api/reviews Queue Tests ---');
    const queueRes = await fetch(`${API_BASE}/reviews?status=reviewed`);
    assertTest('API: GET /api/reviews returns HTTP 200', queueRes.ok);
    const queueBody = await queueRes.json() as any;
    assertTest('API: GET /api/reviews returns cases array', Array.isArray(queueBody.cases));
    assertTest('API: GET /api/reviews returns 1 reviewed case', queueBody.cases.length === 1);
    assertTest(
      'API: GET /api/reviews cases joined with message details',
      queueBody.cases[0]?.message?.rawText === 'This is a test payment problem case.'
    );

    // -------------------------------------------------------------
    // 6. TEST DASHBOARD STATS APIS
    // -------------------------------------------------------------
    console.log('\n--- Running Dashboard Stats APIs Tests ---');
    const statsRes = await fetch(`${API_BASE}/messages/stats`);
    assertTest('API: GET /api/messages/stats returns HTTP 200', statsRes.ok);
    const statsBody = await statsRes.json() as any;
    assertTest('Stats: Total count is 1', statsBody.total === 1);
    assertTest('Stats: HumanReview count is 1', statsBody.humanReview === 1);
    assertTest('Stats: Automated count is 0', statsBody.automated === 0);
    assertTest('Stats: High Priority count is 1', statsBody.highPriority === 1); // P1 is high priority

  } catch (err: any) {
    console.error('Test execution failed with error:', err.message || err);
  } finally {
    // Clean up database collections after tests
    await Message.deleteMany({});
    await TriageDecision.deleteMany({});
    await Review.deleteMany({});

    server.close();
    await mongoose.disconnect();
    console.log('\nDatabase connection and programmatic server closed.');
  }

  console.log('\n=== PHASE 6 TEST RESULTS SUMMARY ===');
  console.table(results);

  const failedCount = results.filter((r) => r.status === 'FAIL').length;
  if (failedCount > 0) {
    console.log(`\n❌ PHASE 6 TESTS FAILED: ${failedCount} tests failed.`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL PHASE 6 AUTOMATED TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runPhase6Tests();
