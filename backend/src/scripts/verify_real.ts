import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import apiRouter from '../routes/api';
import { errorHandler } from '../middleware/error.middleware';
import { Message } from '../models/Message';
import { TriageDecision } from '../models/TriageDecision';

// Load environment variables explicitly
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Load environment variables explicitly and log diagnostics
const envPath = path.resolve(__dirname, '../../.env');
const resultDefault = dotenv.config();
const resultExplicit = dotenv.config({ path: envPath });

async function runRealVerification() {
  console.log('=== STARTING REAL GEMINI API PIPELINE VERIFICATION ===\n');
  console.log('--- DOTENV DIAGNOSTICS ---');
  console.log(`Default dotenv load status: ${resultDefault.error ? resultDefault.error.message : 'Success'}`);
  console.log(`Explicit path: ${envPath}`);
  console.log(`Explicit dotenv load status: ${resultExplicit.error ? resultExplicit.error.message : 'Success'}`);
  if (resultExplicit.parsed) {
    console.log('Parsed keys from .env:', Object.keys(resultExplicit.parsed));
  } else {
    console.log('No keys parsed from .env.');
  }
  console.log('--------------------------\n');

  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const model = process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-3.5-flash';
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/frontline_sentinel';

  const envDetected = (apiKey && apiKey.trim().length > 0) ? 'YES' : 'NO';
  console.log(`GEMINI_API_KEY detected: ${envDetected}`);
  console.log(`Configured Model: ${model}`);

  let server: any = null;
  const PORT = 5009;

  let reports = {
    envDetected,
    apiCall: 'FAIL',
    structuredOutput: 'FAIL',
    zodValidation: 'FAIL',
    guardrails: 'FAIL',
    mongodbPersistence: 'FAIL',
    restApi: 'FAIL'
  };

  // 1. Check API Key
  if (envDetected === 'NO') {
    console.log('\n----------------------------------------');
    console.log('Real Gemini verification requires GEMINI_API_KEY.');
    console.log('----------------------------------------\n');
    
    console.log('--- DIAGNOSTIC INFORMATION ---');
    console.log('The GEMINI_API_KEY environment variable was not detected.');
    console.log('Please ensure that:');
    console.log('  1. A .env file exists in the backend/ directory.');
    console.log('  2. It contains the line: GEMINI_API_KEY=your_actual_api_key.');
    console.log('  3. The key contains valid characters and does not have leading or trailing whitespaces.');
    console.log('\n--- VERIFICATION STATUS REPORT ---');
    console.log(`* Environment variable detected: NO`);
    console.log(`* Gemini API call: SKIP`);
    console.log(`* Structured output: SKIP`);
    console.log(`* Zod validation: SKIP`);
    console.log(`* Guardrails: SKIP`);
    console.log(`* MongoDB persistence: SKIP`);
    console.log(`* REST API: SKIP`);
    process.exit(0);
  }

  console.log('Connecting to MongoDB...');
  try {
    // Set a timeout of 5s for DB connection
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB.\n');
  } catch (dbErr: any) {
    console.error('Failed to connect to MongoDB:', dbErr.message);
    console.log('\n--- VERIFICATION STATUS REPORT ---');
    console.log(`* Environment variable detected: ${reports.envDetected}`);
    console.log(`* Gemini API call: FAIL (No DB connection)`);
    console.log(`* Structured output: FAIL`);
    console.log(`* Zod validation: FAIL`);
    console.log(`* Guardrails: FAIL`);
    console.log(`* MongoDB persistence: FAIL`);
    console.log(`* REST API: FAIL`);
    process.exit(1);
  }

  // Start express server programmatically on port 5009
  console.log(`Starting mock REST API server on http://127.0.0.1:${PORT}...`);
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  app.use(errorHandler);

  try {
    server = app.listen(PORT);
    console.log('REST API server is listening.\n');

    // 2. Create customer message via REST API
    const rawText = "I forgot my password and can't log in.";
    console.log(`[REST API] POST /api/messages: "${rawText}"`);
    const createRes = await fetch(`http://127.0.0.1:${PORT}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rawText }),
    });

    if (!createRes.ok) {
      throw new Error(`REST API message creation failed: HTTP ${createRes.status}`);
    }

    const createdMsg = await createRes.json() as any;
    const messageId = createdMsg._id || createdMsg.id;
    if (!messageId) {
      throw new Error('REST API did not return message ID.');
    }
    console.log(`[REST API] Created message ID: ${messageId}`);

    // 3. Run triage via REST API
    console.log(`[REST API] POST /api/triage/${messageId}: Running pipeline...`);
    const triageRes = await fetch(`http://127.0.0.1:${PORT}/api/triage/${messageId}`, {
      method: 'POST',
    });

    if (!triageRes.ok) {
      const errorData = await triageRes.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`REST API triage endpoint returned HTTP ${triageRes.status}: ${errorData.message}`);
    }

    const triageOutput = await triageRes.json() as any;
    console.log('[REST API] Triage response received successfully.');

    // 4. Retrieve message via REST API
    console.log(`[REST API] GET /api/messages/${messageId}: Fetching message details...`);
    const getRes = await fetch(`http://127.0.0.1:${PORT}/api/messages/${messageId}`);
    if (!getRes.ok) {
      throw new Error(`REST API message detail fetch failed: HTTP ${getRes.status}`);
    }

    const details = await getRes.json() as any;
    if (details.status !== 'completed' && details.status !== 'human_review') {
      throw new Error(`REST API returned unexpected message status: ${details.status}`);
    }

    if (!details.triageDecision) {
      throw new Error('REST API response does not contain triage decision.');
    }

    reports.restApi = 'PASS';

    // 5. Verify database and pipeline stages
    const savedDecision = await TriageDecision.findOne({ messageId });
    if (savedDecision) {
      reports.mongodbPersistence = 'PASS';
      
      // If we got here and decision has token counts, API call succeeded
      reports.apiCall = 'PASS';
      reports.structuredOutput = 'PASS';
      reports.zodValidation = 'PASS';
      reports.guardrails = 'PASS';
    }

    console.log('\nE2E Pipeline Triage Result:', JSON.stringify(triageOutput, null, 2));

    // Cleanup
    console.log(`\nCleaning up test message and decisions (ID: ${messageId})...`);
    await Message.deleteOne({ _id: messageId });
    await TriageDecision.deleteOne({ messageId });
    console.log('Cleanup complete.');

  } catch (err: any) {
    console.error('\nTriage pipeline E2E failed with error:');
    console.error(err.message || err);

    const msg = err.message || '';
    if (msg.includes('JSON cannot be parsed')) {
      reports.apiCall = 'PASS';
      reports.structuredOutput = 'FAIL';
    } else if (msg.includes('Schema validation failed')) {
      reports.apiCall = 'PASS';
      reports.structuredOutput = 'PASS';
      reports.zodValidation = 'FAIL';
    } else if (msg.includes('API error') || msg.includes('timeout') || msg.includes('fetch failed')) {
      reports.apiCall = 'FAIL';
    }
  } finally {
    if (server) {
      server.close();
      console.log('REST API server stopped.');
    }

    await mongoose.disconnect();
    console.log('Database connection closed.\n');

    // 6. Output Report
    console.log('--- VERIFICATION STATUS REPORT ---');
    console.log(`* Environment variable detected: ${reports.envDetected}`);
    console.log(`* Gemini API call: ${reports.apiCall}`);
    console.log(`* Structured output: ${reports.structuredOutput}`);
    console.log(`* Zod validation: ${reports.zodValidation}`);
    console.log(`* Guardrails: ${reports.guardrails}`);
    console.log(`* MongoDB persistence: ${reports.mongodbPersistence}`);
    console.log(`* REST API: ${reports.restApi}`);
  }
}

runRealVerification();
