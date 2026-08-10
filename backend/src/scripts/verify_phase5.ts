import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { GroundTruth } from '../models/GroundTruth';
import { Message } from '../models/Message';
import { TriageDecision } from '../models/TriageDecision';
import { evaluationService } from '../services/evaluation.service';
import { saveGroundTruthSchema } from '../validators/evaluation.validator';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runPhase5Tests() {
  console.log('=== STARTING FRONTLINE SENTINEL PHASE 5 AUTOMATED TESTS ===\n');

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

  try {
    // -------------------------------------------------------------
    // 1. SCHEMA VALIDATION TESTS
    // -------------------------------------------------------------
    console.log('--- Running Schema & Validator Tests ---');

    // Test 1.1: Valid Ground Truth Zod Input
    const validGT = {
      messageId: '60c72b2f9b1d8b2bad000001',
      groundTruthCategory: 'billing',
      groundTruthPriority: 'P2',
      groundTruthNeedsHuman: false,
      notes: 'This is correct.',
    };
    const checkValid = saveGroundTruthSchema.safeParse(validGT);
    assertTest('Schema: accepts valid fields', checkValid.success);

    // Test 1.2: Invalid Category Zod Input
    const invalidCatGT = {
      messageId: '60c72b2f9b1d8b2bad000001',
      groundTruthCategory: 'invalid-category-abc',
      groundTruthPriority: 'P2',
      groundTruthNeedsHuman: false,
      notes: 'Notes',
    };
    const checkInvalidCat = saveGroundTruthSchema.safeParse(invalidCatGT);
    assertTest('Schema: rejects invalid category name', !checkInvalidCat.success);

    // Test 1.3: Invalid Priority Zod Input
    const invalidPriGT = {
      messageId: '60c72b2f9b1d8b2bad000001',
      groundTruthCategory: 'billing',
      groundTruthPriority: 'P99',
      groundTruthNeedsHuman: false,
      notes: 'Notes',
    };
    const checkInvalidPri = saveGroundTruthSchema.safeParse(invalidPriGT);
    assertTest('Schema: rejects invalid priority value', !checkInvalidPri.success);

    // Test 1.4: Missing Required Field
    const missingFieldGT = {
      messageId: '60c72b2f9b1d8b2bad000001',
      groundTruthCategory: 'billing',
      notes: 'Missing priority and needsHuman',
    };
    const checkMissing = saveGroundTruthSchema.safeParse(missingFieldGT);
    assertTest('Schema: rejects input with missing fields', !checkMissing.success);

    // -------------------------------------------------------------
    // 2. METRICS & FIXTURE TESTS
    // -------------------------------------------------------------
    console.log('\n--- Running Metrics & Agreement Calculations Tests ---');

    // Clean test collection
    await GroundTruth.deleteMany({});
    await Message.deleteMany({});
    await TriageDecision.deleteMany({});

    // Fixture setup: 10 messages
    // 8 category correct, 7 priority correct, 9 human escalation correct.
    // 8 overall correct.
    // GT needsHuman = 4 (AI correct = 3, AI failed = 1). Recall should be 3 / 4 = 75%.
    // False Positive count = 1 (AI needsHuman=true, GT needsHuman=false)
    // False Negative count = 1 (AI needsHuman=false, GT needsHuman=true)
    const testCases = [
      // 1. Overall Correct (Needs Human: GT=true, AI=true)
      { id: '507f1f77bcf86cd799439001', text: 'T1', gtCat: 'billing', gtPri: 'P0', gtHuman: true, aiCat: 'billing', aiPri: 'P0', aiHuman: true },
      // 2. Overall Correct (Needs Human: GT=true, AI=true)
      { id: '507f1f77bcf86cd799439002', text: 'T2', gtCat: 'account', gtPri: 'P1', gtHuman: true, aiCat: 'account', aiPri: 'P1', aiHuman: true },
      // 3. Overall Correct (Needs Human: GT=true, AI=true)
      { id: '507f1f77bcf86cd799439003', text: 'T3', gtCat: 'technical', gtPri: 'P2', gtHuman: true, aiCat: 'technical', aiPri: 'P2', aiHuman: true },
      // 4. Overall Correct (Needs Human: GT=false, AI=false)
      { id: '507f1f77bcf86cd799439004', text: 'T4', gtCat: 'order_delivery', gtPri: 'P3', gtHuman: false, aiCat: 'order_delivery', aiPri: 'P3', aiHuman: false },
      // 5. Overall Correct (Needs Human: GT=false, AI=false)
      { id: '507f1f77bcf86cd799439005', text: 'T5', gtCat: 'refund_cancellation', gtPri: 'P2', gtHuman: false, aiCat: 'refund_cancellation', aiPri: 'P2', aiHuman: false },
      // 6. Overall Correct (Needs Human: GT=false, AI=false)
      { id: '507f1f77bcf86cd799439006', text: 'T6', gtCat: 'general_question', gtPri: 'P3', gtHuman: false, aiCat: 'general_question', aiPri: 'P3', aiHuman: false },
      // 7. Overall Correct (Needs Human: GT=false, AI=false)
      { id: '507f1f77bcf86cd799439007', text: 'T7', gtCat: 'out_of_scope', gtPri: 'P3', gtHuman: false, aiCat: 'out_of_scope', aiPri: 'P3', aiHuman: false },
      // 8. Overall Correct (Needs Human: GT=false, AI=false)
      { id: '507f1f77bcf86cd799439008', text: 'T8', gtCat: 'security_abuse', gtPri: 'P0', gtHuman: false, aiCat: 'security_abuse', aiPri: 'P0', aiHuman: false },
      
      // 9. Category Incorrect, Priority Incorrect, Escalation Incorrect (GT human = true, AI human = false -> False Negative)
      { id: '507f1f77bcf86cd799439009', text: 'T9', gtCat: 'complaint', gtPri: 'P1', gtHuman: true, aiCat: 'technical', aiPri: 'P2', aiHuman: false },
      
      // 10. Category Correct, Priority Correct, Escalation Incorrect (GT human = false, AI human = true -> False Positive)
      { id: '507f1f77bcf86cd799439010', text: 'T10', gtCat: 'billing', gtPri: 'P2', gtHuman: false, aiCat: 'billing', aiPri: 'P2', aiHuman: true },
    ];

    for (const tc of testCases) {
      // Create Message
      await Message.create({
        _id: new mongoose.Types.ObjectId(tc.id),
        rawText: tc.text,
        status: tc.aiHuman ? 'human_review' : 'completed',
      });

      // Create AI Decision
      await TriageDecision.create({
        messageId: new mongoose.Types.ObjectId(tc.id),
        category: tc.aiCat,
        priority: tc.aiPri,
        summary: 'Summary',
        suggestedAction: 'Action',
        needsHuman: tc.aiHuman,
        confidence: 0.90,
        latencyMs: 1200,
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
      });

      // Create Human Ground Truth
      await GroundTruth.create({
        messageId: new mongoose.Types.ObjectId(tc.id),
        groundTruthCategory: tc.gtCat,
        groundTruthPriority: tc.gtPri,
        groundTruthNeedsHuman: tc.gtHuman,
        notes: 'Fixture notes',
      });
    }

    const metrics = await evaluationService.getMetrics();

    assertTest('Metrics: evaluated count is 10', metrics.evaluatedCount === 10);
    assertTest('Metrics: category correct count is 9', metrics.categoryCorrect === 9);
    assertTest('Metrics: category agreement is 90%', metrics.categoryAgreement === 0.9);
    assertTest('Metrics: priority correct count is 9', metrics.priorityCorrect === 9);
    assertTest('Metrics: priority agreement is 90%', metrics.priorityAgreement === 0.9);
    assertTest('Metrics: human escalation correct count is 8', metrics.humanEscalationCorrect === 8);
    assertTest('Metrics: human escalation agreement is 80%', metrics.humanEscalationAgreement === 0.8);
    assertTest('Metrics: overall correct count is 8', metrics.overallCorrect === 8);
    assertTest('Metrics: overall agreement is 80%', metrics.overallAgreement === 0.8);

    // Human escalation recall: GT human required = 4. Correct AI human = 3. Recall = 3/4 = 75%
    assertTest('Metrics: human escalation recall is 75%', metrics.humanEscalationRecall === 0.75);

    // False Positive = 1, False Negative = 1
    assertTest('Metrics: false positive human escalation count is 1', metrics.falsePositiveHumanEscalations === 1);
    assertTest('Metrics: false negative human escalation count is 1 (increases count)', metrics.falseNegativeHumanEscalations === 1);

    // Average latency
    assertTest('Metrics: average latency calculated from 10 items is 1200ms', metrics.averageLatency === 1200);

    // -------------------------------------------------------------
    // 3. ZERO-CASE SUBSETS RECALL TEST
    // -------------------------------------------------------------
    console.log('\n--- Running Zero-Case Subsets Tests ---');
    // Remove all ground truths requiring human escalation
    await GroundTruth.updateMany({}, { groundTruthNeedsHuman: false });
    
    const zeroRecallMetrics = await evaluationService.getMetrics();
    const isRecallStringNA = typeof zeroRecallMetrics.humanEscalationRecall === 'string' &&
      zeroRecallMetrics.humanEscalationRecall.includes('N/A');
    assertTest('Zero-Cases: recall returns N/A string when 0 human-required cases', isRecallStringNA);

    // -------------------------------------------------------------
    // 4. EMPTY EVALUATION SET TEST
    // -------------------------------------------------------------
    console.log('\n--- Running Empty Evaluation Set Tests ---');
    await GroundTruth.deleteMany({});
    await Message.deleteMany({});
    await TriageDecision.deleteMany({});

    const emptyMetrics = await evaluationService.getMetrics();
    assertTest('Empty Set: evaluated count is 0', emptyMetrics.evaluatedCount === 0);
    assertTest('Empty Set: category agreement is 0%', emptyMetrics.categoryAgreement === 0);
    assertTest('Empty Set: overall agreement is 0%', emptyMetrics.overallAgreement === 0);
    assertTest('Empty Set: false positives count is 0', emptyMetrics.falsePositiveHumanEscalations === 0);
    assertTest('Empty Set: false negatives count is 0', emptyMetrics.falseNegativeHumanEscalations === 0);
    assertTest('Empty Set: average latency is 0', emptyMetrics.averageLatency === 0);
    assertTest('Empty Set: recall is N/A', typeof emptyMetrics.humanEscalationRecall === 'string' && emptyMetrics.humanEscalationRecall.includes('N/A'));

  } catch (err: any) {
    console.error('Test execution failed with error:', err.message || err);
  } finally {
    // Clean up database collections
    await GroundTruth.deleteMany({});
    await Message.deleteMany({});
    await TriageDecision.deleteMany({});
    
    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
  }

  console.log('\n=== PHASE 5 TEST RESULTS SUMMARY ===');
  console.table(results);

  const failedCount = results.filter((r) => r.status === 'FAIL').length;
  if (failedCount > 0) {
    console.log(`\n❌ PHASE 5 TESTS FAILED: ${failedCount} tests failed.`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL PHASE 5 AUTOMATED TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runPhase5Tests();
