import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function runE2ETests() {
  console.log('=== STARTING E2E REST API ENDPOINT VERIFICATION ===\n');

  try {
    // 1. Health check
    console.log('Checking health endpoint...');
    const healthRes = await fetch(`${API_BASE}/health`);
    const health = await healthRes.json() as any;
    console.log('Health response:', health);
    if (health.status !== 'ok' || health.database !== 'connected') {
      throw new Error('Backend health check failed');
    }
    console.log('✅ Health check passed.\n');

    // 2. Create message
    console.log('Creating a test support ticket...');
    const createRes = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: 'Please refund my card for $5000' }),
    });
    
    if (!createRes.ok) {
      throw new Error(`Failed to create message: ${await createRes.text()}`);
    }
    
    const message = await createRes.json() as any;
    console.log('Created message:', message);
    const messageId = message.id || message._id;
    if (!messageId || message.status !== 'pending') {
      throw new Error('Message creation response invalid');
    }
    console.log('✅ Ticket creation endpoint passed.\n');

    // 3. Retrieve pending message details
    console.log(`Fetching message details for message ${messageId}...`);
    const fetchPendingRes = await fetch(`${API_BASE}/messages/${messageId}`);
    const pendingDetails = await fetchPendingRes.json() as any;
    console.log('Details response:', pendingDetails);
    if (pendingDetails.status !== 'pending' || pendingDetails.triageDecision !== null) {
      throw new Error('Pending message details are invalid');
    }
    console.log('✅ Message retrieval endpoint passed.\n');

    // 4. Run triage (must fail since API key is empty/unconfigured)
    console.log(`Running triage for message ${messageId} (expected to fail)...`);
    const triageRes = await fetch(`${API_BASE}/triage/${messageId}`, { method: 'POST' });
    const triageError = await triageRes.json() as any;
    console.log(`Triage response (HTTP ${triageRes.status}):`, triageError);
    
    if (triageRes.status !== 500 || !triageError.message.includes('AI API Key is missing')) {
      throw new Error('Expected triage to fail with 500 and missing API key error');
    }
    console.log('✅ Triage failure handling endpoint passed.\n');

    // 5. Verify message status became "failed"
    console.log(`Re-fetching message details for message ${messageId} to verify failed status...`);
    const fetchFailedRes = await fetch(`${API_BASE}/messages/${messageId}`);
    const failedDetails = await fetchFailedRes.json() as any;
    console.log('Failed details response:', failedDetails);
    if (failedDetails.status !== 'failed' || failedDetails.triageDecision !== null) {
      throw new Error('Message status should be "failed" and no triage decision should be stored');
    }
    console.log('✅ E2E failure flow and status transition verified successfully.\n');

    // 6. Verify retry endpoint
    console.log(`Testing retry triage endpoint for message ${messageId} (expected to fail)...`);
    const retryRes = await fetch(`${API_BASE}/triage/${messageId}/retry`, { method: 'POST' });
    const retryError = await retryRes.json() as any;
    console.log(`Retry response (HTTP ${retryRes.status}):`, retryError);
    
    if (retryRes.status !== 500 || !retryError.message.includes('AI API Key is missing')) {
      throw new Error('Expected retry to fail with 500 and missing API key error');
    }
    console.log('✅ Retry triage endpoint verification passed.\n');

    console.log('=== ALL REST API E2E ENDPOINT VERIFICATIONS PASSED! ===');
    process.exit(0);

  } catch (err: any) {
    console.error('❌ E2E VERIFICATION FAILED:', err.message || err);
    process.exit(1);
  }
}

runE2ETests();
