import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { messageService } from '../services/message.service';
import { bulkTriageService } from '../services/bulkTriage.service';
import { triageService } from '../services/triage.service';
import { Message } from '../models/Message';
import { TriageDecision } from '../models/TriageDecision';
import { IAIProvider, AIProviderResponse } from '../services/ai/ai.provider.interface';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

class MockAIProvider implements IAIProvider {
  public responseText: string = JSON.stringify({
    category: 'technical',
    priority: 'P2',
    summary: 'Mock technical issue',
    suggestedAction: 'Troubleshoot',
    needsHuman: false,
    confidence: 0.90,
    humanReason: null
  });
  public throwError: boolean = false;
  public errorType: '429' | 'generic' | null = null;
  public rateLimitCount: number = 0;

  public async generateTriage(rawText: string, systemPrompt: string): Promise<AIProviderResponse> {
    if (this.throwError) {
      if (this.errorType === '429') {
        this.rateLimitCount++;
        throw new Error('Gemini API error (HTTP 429): Rate limit exceeded');
      }
      throw new Error('Mock AI Provider API Connection Failed');
    }
    return {
      rawResponse: this.responseText,
      inputTokens: 50,
      outputTokens: 100,
      totalTokens: 150,
    };
  }
}

const mockProvider = new MockAIProvider();

async function runPhase4Tests() {
  console.log('=== STARTING FRONTLINE SENTINEL PHASE 4 AUTOMATED TESTS ===\n');

  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/frontline_sentinel';
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB.\n');

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
    // -------------------------------------------------------------
    // 1. DATASET IMPORT TESTS
    // -------------------------------------------------------------
    console.log('--- Running Dataset Import Tests ---');
    await Message.deleteMany({});
    await TriageDecision.deleteMany({});

    // Valid dataset with unique IDs, duplicates, and malformed empty message
    const mockCsvContent = `id,message
101,My credit card payment failed
102,I want a refund for my order
103,
101,My credit card payment failed
104,Cannot login to my account`;

    const importRes = await messageService.importMessagesBulk(mockCsvContent);
    
    assertTest(
      'Import: counts match rules (total=5, valid=3, invalid=1, duplicates=1)',
      importRes.total === 5 &&
      importRes.valid === 3 &&
      importRes.invalid === 1 &&
      importRes.duplicates === 1
    );

    const pendingMessages = await Message.find({ status: 'pending' });
    const invalidMessages = await Message.find({ status: 'invalid' });
    
    assertTest('Import: valid rows saved with pending status', pendingMessages.length === 3);
    assertTest('Import: invalid row saved with invalid status', invalidMessages.length === 1);

    // -------------------------------------------------------------
    // 2. BULK PROCESSING SEQUENTIAL LOOP TESTS
    // -------------------------------------------------------------
    console.log('\n--- Running Bulk Processing Sequential Loop Tests ---');
    
    // Start bulk triage service
    await bulkTriageService.startTriage();

    // Give it a moment to run
    let activeStatus = await bulkTriageService.getStatus();
    while (activeStatus.status === 'running') {
      await new Promise(r => setTimeout(r, 500));
      activeStatus = await bulkTriageService.getStatus();
    }

    assertTest(
      'Bulk Processing: completed status check',
      activeStatus.status === 'completed' && activeStatus.completed === 3
    );

    // -------------------------------------------------------------
    // 3. RESUMABILITY TESTS
    // -------------------------------------------------------------
    console.log('\n--- Running Resumability Tests ---');
    
    // Add one new pending message
    const newMsg = new Message({ rawText: 'A new pending ticket', status: 'pending' });
    await newMsg.save();

    // Run bulk triage again - should skip completed and process the new one
    bulkTriageService.reset();
    await bulkTriageService.startTriage();

    let resumeStatus = await bulkTriageService.getStatus();
    while (resumeStatus.status === 'running') {
      await new Promise(r => setTimeout(r, 500));
      resumeStatus = await bulkTriageService.getStatus();
    }

    assertTest(
      'Resumability: only processes pending messages (completed total becomes 4)',
      resumeStatus.completed === 4
    );

    // -------------------------------------------------------------
    // 4. RATE LIMITING & Retries (HTTP 429) TESTS
    // -------------------------------------------------------------
    console.log('\n--- Running Rate Limiting Tests ---');
    mockProvider.throwError = true;
    mockProvider.errorType = '429';
    mockProvider.rateLimitCount = 0;

    // Reset status and save a message
    const rateLimitMsg = new Message({ rawText: 'Triggering 429 rate limits', status: 'pending' });
    await rateLimitMsg.save();

    bulkTriageService.reset();
    await bulkTriageService.startTriage();

    let rateLimitStatus = await bulkTriageService.getStatus();
    while (rateLimitStatus.status === 'running') {
      await new Promise(r => setTimeout(r, 500));
      rateLimitStatus = await bulkTriageService.getStatus();
    }

    assertTest(
      'Rate Limiting: persistent 429 causes bulk triage to gracefully pause',
      rateLimitStatus.status === 'paused'
    );

    // Clean up
    await Message.deleteMany({});
    await TriageDecision.deleteMany({});

  } catch (err: any) {
    console.error('Test execution failed with error:', err.message || err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
  }

  console.log('\n=== PHASE 4 TEST RESULTS SUMMARY ===');
  console.table(results);

  const failedCount = results.filter((r) => r.status === 'FAIL').length;
  if (failedCount > 0) {
    console.log(`\n❌ PHASE 4 TESTS FAILED: ${failedCount} tests failed.`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL PHASE 4 AUTOMATED TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runPhase4Tests();
