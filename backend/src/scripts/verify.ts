import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { triageService } from '../services/triage.service';
import { messageService } from '../services/message.service';
import { Message } from '../models/Message';
import { TriageDecision } from '../models/TriageDecision';
import { IAIProvider, AIProviderResponse } from '../services/ai/ai.provider.interface';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

class MockAIProvider implements IAIProvider {
  public responseText: string = '';
  public throwError: boolean = false;
  public mockInputTokens: number = 50;
  public mockOutputTokens: number = 100;

  public async generateTriage(rawText: string, systemPrompt: string): Promise<AIProviderResponse> {
    if (this.throwError) {
      throw new Error('Mock AI Provider API Connection Failed');
    }
    return {
      rawResponse: this.responseText,
      inputTokens: this.mockInputTokens,
      outputTokens: this.mockOutputTokens,
      totalTokens: this.mockInputTokens + this.mockOutputTokens,
    };
  }
}

const mockProvider = new MockAIProvider();

async function runTests() {
  console.log('=== STARTING FRONTLINE SENTINEL PHASE 2.5 VERIFICATION ===\n');

  // Connect to DB
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/frontline_sentinel';
  console.log(`Connecting to MongoDB at: ${dbUri}`);
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB.\n');

  // Inject Mock Provider
  triageService.setProvider(mockProvider);

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
    // ----------------------------------------------------
    // Test 1: Invalid LLM Output - Invalid JSON
    // ----------------------------------------------------
    console.log('Running Test 1: Invalid JSON...');
    mockProvider.responseText = 'this is not json';
    mockProvider.throwError = false;
    
    const msg1 = await messageService.createMessage('Test invalid JSON');
    let test1Passed = false;
    try {
      await messageService.runTriage(msg1._id);
    } catch (err: any) {
      // Check message status in database
      const updated = await Message.findById(msg1._id);
      const decision = await TriageDecision.findOne({ messageId: msg1._id });
      test1Passed = (updated?.status === 'failed' && decision === null && err.message.includes('JSON cannot be parsed'));
    }
    assertTest('Invalid JSON rejected & status set to failed', test1Passed);

    // ----------------------------------------------------
    // Test 2: Invalid LLM Output - Invalid Category
    // ----------------------------------------------------
    console.log('Running Test 2: Invalid Category...');
    mockProvider.responseText = JSON.stringify({
      category: 'random_category',
      priority: 'P2',
      summary: 'Test summary',
      suggestedAction: 'Test action',
      needsHuman: false,
      confidence: 0.95
    });

    const msg2 = await messageService.createMessage('Test invalid category');
    let test2Passed = false;
    try {
      await messageService.runTriage(msg2._id);
    } catch (err: any) {
      const updated = await Message.findById(msg2._id);
      const decision = await TriageDecision.findOne({ messageId: msg2._id });
      test2Passed = (updated?.status === 'failed' && decision === null && err.message.includes('Schema validation failed'));
    }
    assertTest('Invalid category rejected & status set to failed', test2Passed);

    // ----------------------------------------------------
    // Test 3: Invalid LLM Output - Invalid Priority
    // ----------------------------------------------------
    console.log('Running Test 3: Invalid Priority...');
    mockProvider.responseText = JSON.stringify({
      category: 'billing',
      priority: 'P9',
      summary: 'Test summary',
      suggestedAction: 'Test action',
      needsHuman: false,
      confidence: 0.95
    });

    const msg3 = await messageService.createMessage('Test invalid priority');
    let test3Passed = false;
    try {
      await messageService.runTriage(msg3._id);
    } catch (err: any) {
      const updated = await Message.findById(msg3._id);
      const decision = await TriageDecision.findOne({ messageId: msg3._id });
      test3Passed = (updated?.status === 'failed' && decision === null && err.message.includes('Schema validation failed'));
    }
    assertTest('Invalid priority rejected & status set to failed', test3Passed);

    // ----------------------------------------------------
    // Test 4: Invalid LLM Output - Invalid Confidence
    // ----------------------------------------------------
    console.log('Running Test 4: Invalid Confidence...');
    mockProvider.responseText = JSON.stringify({
      category: 'billing',
      priority: 'P2',
      summary: 'Test summary',
      suggestedAction: 'Test action',
      needsHuman: false,
      confidence: 4.5
    });

    const msg4 = await messageService.createMessage('Test invalid confidence');
    let test4Passed = false;
    try {
      await messageService.runTriage(msg4._id);
    } catch (err: any) {
      const updated = await Message.findById(msg4._id);
      const decision = await TriageDecision.findOne({ messageId: msg4._id });
      test4Passed = (updated?.status === 'failed' && decision === null && err.message.includes('Schema validation failed'));
    }
    assertTest('Invalid confidence rejected & status set to failed', test4Passed);

    // ----------------------------------------------------
    // Test 5: Invalid LLM Output - Missing Field
    // ----------------------------------------------------
    console.log('Running Test 5: Missing Field (summary)...');
    mockProvider.responseText = JSON.stringify({
      category: 'billing',
      priority: 'P2',
      suggestedAction: 'Test action',
      needsHuman: false,
      confidence: 0.95
    });

    const msg5 = await messageService.createMessage('Test missing summary');
    let test5Passed = false;
    try {
      await messageService.runTriage(msg5._id);
    } catch (err: any) {
      const updated = await Message.findById(msg5._id);
      const decision = await TriageDecision.findOne({ messageId: msg5._id });
      test5Passed = (updated?.status === 'failed' && decision === null && err.message.includes('Schema validation failed'));
    }
    assertTest('Missing summary field rejected & status set to failed', test5Passed);

    // ----------------------------------------------------
    // Test 6: Guardrail - Low Confidence Escalation
    // ----------------------------------------------------
    console.log('Running Test 6: Low Confidence Escalation...');
    mockProvider.responseText = JSON.stringify({
      category: 'billing',
      priority: 'P2',
      summary: 'Test low confidence',
      suggestedAction: 'Verify transaction',
      needsHuman: false, // Model suggests NO human
      confidence: 0.65  // Under 0.70 threshold
    });

    const msg6 = await messageService.createMessage('Test low confidence message');
    const res6 = await messageService.runTriage(msg6._id);
    const updated6 = await Message.findById(msg6._id);
    
    assertTest(
      'Low confidence (< 0.70) forces needsHuman = true',
      res6.needsHuman === true && 
      updated6?.status === 'human_review' && 
      res6.humanReason?.includes('AI confidence is below the configured threshold.')
    );

    // ----------------------------------------------------
    // Test 7: Guardrail - Ambiguous Message Handling
    // ----------------------------------------------------
    console.log('Running Test 7: Ambiguous Message...');
    mockProvider.responseText = JSON.stringify({
      category: 'unknown',
      priority: 'P3',
      summary: 'Customer reports ambiguous issue',
      suggestedAction: 'Ask for details',
      needsHuman: false,
      confidence: 0.50
    });

    const msg7 = await messageService.createMessage("It doesn't work.");
    const res7 = await messageService.runTriage(msg7._id);
    const updated7 = await Message.findById(msg7._id);

    console.log('DEBUG Test 7 res7:', JSON.stringify(res7, null, 2));
    console.log('DEBUG Test 7 updated7 status:', updated7?.status);

    assertTest(
      'Ambiguous category "unknown" forces needsHuman = true',
      res7.needsHuman === true && 
      updated7?.status === 'human_review' &&
      res7.humanReason?.includes("The customer's request is too ambiguous.")
    );

    // ----------------------------------------------------
    // Test 8: Guardrail - Security Sensitive Escalation
    // ----------------------------------------------------
    console.log('Running Test 8: Security Abuse / Compromise...');
    mockProvider.responseText = JSON.stringify({
      category: 'security_abuse',
      priority: 'P2', // Mock reports P2
      summary: 'Account compromised and hacked',
      suggestedAction: 'Freeze account',
      needsHuman: false,
      confidence: 0.90
    });

    const msg8 = await messageService.createMessage('Hacked account.');
    const res8 = await messageService.runTriage(msg8._id);
    const updated8 = await Message.findById(msg8._id);

    assertTest(
      'Security category forces priority P0 and needsHuman = true',
      res8.category === 'security_abuse' &&
      res8.priority === 'P0' &&
      res8.needsHuman === true &&
      updated8?.status === 'human_review' &&
      res8.humanReason?.includes('The message contains a security-sensitive request.')
    );

    // ----------------------------------------------------
    // Test 9: Guardrail - High Financial Risk
    // ----------------------------------------------------
    console.log('Running Test 9: Financially Significant Issue ($5,000)...');
    mockProvider.responseText = JSON.stringify({
      category: 'billing',
      priority: 'P1',
      summary: 'Charged $5,000 instead of $50',
      suggestedAction: 'Reverse duplicate charge',
      needsHuman: false, // Model says false
      confidence: 0.95
    });

    // Test text containing large amount
    const msg9 = await messageService.createMessage('You charged me $5000 instead of $50');
    const res9 = await messageService.runTriage(msg9._id);
    const updated9 = await Message.findById(msg9._id);

    assertTest(
      'High billing amount forces needsHuman = true',
      res9.needsHuman === true &&
      updated9?.status === 'human_review' &&
      res9.humanReason?.includes('The issue has significant financial impact.')
    );

    // ----------------------------------------------------
    // Test 10: AI Provider Failure & Status transitions
    // ----------------------------------------------------
    console.log('Running Test 10: Provider API Failure...');
    mockProvider.throwError = true;

    const msg10 = await messageService.createMessage('Test provider down');
    let test10Passed = false;
    try {
      await messageService.runTriage(msg10._id);
    } catch (err: any) {
      const updated = await Message.findById(msg10._id);
      const decision = await TriageDecision.findOne({ messageId: msg10._id });
      test10Passed = (updated?.status === 'failed' && decision === null && err.message.includes('Mock AI Provider API Connection Failed'));
    }
    assertTest('AI provider failure transitions status to failed and does not save decision', test10Passed);

    // ----------------------------------------------------
    // Test 11: Retry Pipeline
    // ----------------------------------------------------
    console.log('Running Test 11: Retrying Failed Triage...');
    mockProvider.throwError = false; // Fix provider
    mockProvider.responseText = JSON.stringify({
      category: 'account',
      priority: 'P2',
      summary: 'Reset password request',
      suggestedAction: 'Send reset link',
      needsHuman: false,
      confidence: 0.95
    });

    const res11 = await messageService.retryTriage(msg10._id);
    const updated11 = await Message.findById(msg10._id);
    const decision11 = await TriageDecision.findOne({ messageId: msg10._id });

    assertTest(
      'Retry of failed message calls AI, succeeds, and persists correct decision',
      updated11?.status === 'completed' &&
      decision11 !== null &&
      res11.category === 'account' &&
      res11.needsHuman === false
    );

    // ----------------------------------------------------
    // Test 12: DB Relationship Verification
    // ----------------------------------------------------
    console.log('Running Test 12: Retrieve Single Message with DB Relationship...');
    const details = await messageService.getMessageById(msg10._id);
    
    assertTest(
      'Message details fetches associated triageDecision correctly',
      details !== null &&
      details.triageDecision !== null &&
      details.triageDecision.messageId.toString() === msg10._id.toString() &&
      details.triageDecision.category === 'account' &&
      details.triageDecision.model === 'gemini-3.5-flash'
    );

    // Cleanup test records
    console.log('\nCleaning up test messages and decisions from DB...');
    const testMessageIds = [msg1._id, msg2._id, msg3._id, msg4._id, msg5._id, msg6._id, msg7._id, msg8._id, msg9._id, msg10._id];
    await Message.deleteMany({ _id: { $in: testMessageIds } });
    await TriageDecision.deleteMany({ messageId: { $in: testMessageIds } });
    console.log('Cleanup completed.\n');

  } catch (err) {
    console.error('Test execution failed with critical error:', err);
  } finally {
    // Disconnect
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }

  // Final summary
  console.log('\n=== VERIFICATION RESULTS SUMMARY ===');
  console.table(results);

  const failedCount = results.filter((r) => r.status === 'FAIL').length;
  if (failedCount > 0) {
    console.log(`\n❌ VERIFICATION FAILED: ${failedCount} tests failed.`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL CORE PIPELINE TESTS PASSED SUCCESSFULY!');
    process.exit(0);
  }
}

runTests();
