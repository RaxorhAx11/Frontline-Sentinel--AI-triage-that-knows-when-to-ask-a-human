import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { evaluationService } from '../services/evaluation.service';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function runCliEvaluation() {
  console.log(`\n${BOLD}=== FRONTLINE SENTINEL EVALUATION RUNNER ===${RESET}\n`);

  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/frontline_sentinel';
  console.log(`Connecting to MongoDB: ${dbUri}...`);
  
  try {
    await mongoose.connect(dbUri);
    console.log('Database connected successfully.\n');

    // 1. Seed the evaluation dataset (adds 10 challenge tickets + triages them + seeds GT)
    console.log('Ensuring challenge dataset is seeded, triaged, and labeled...');
    const seedResult = await evaluationService.seedChallengeDataset();
    console.log(`Dataset Status: Seeded ${seedResult.seededCount} new, ${seedResult.existingCount} already existed, labeled ${seedResult.gtSeededCount} ground truths.\n`);

    // 2. Fetch all evaluations & metrics
    console.log('Calculating performance and correctness metrics...');
    const evaluations = await evaluationService.getEvaluations();
    const metricsResult = await evaluationService.getMetrics();
    const model = process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-3.5-flash';

    if (evaluations.length === 0) {
      console.log(`${YELLOW}No evaluations found. Please ensure the dataset is seeded and processed.${RESET}`);
      return;
    }

    // 3. Print predictions comparison table
    console.log(`\n${BOLD}--- EVALUATION RESULTS TABLE ---${RESET}\n`);
    
    // Header
    const colWidths = { msg: 35, aiCat: 12, gtCat: 12, aiPri: 7, gtPri: 7, aiEsc: 7, gtEsc: 7, match: 7 };
    const rowLine = `+${'-'.repeat(colWidths.msg + 2)}+${'-'.repeat(colWidths.aiCat + 2)}+${'-'.repeat(colWidths.gtCat + 2)}+${'-'.repeat(colWidths.aiPri + 2)}+${'-'.repeat(colWidths.gtPri + 2)}+${'-'.repeat(colWidths.aiEsc + 2)}+${'-'.repeat(colWidths.gtEsc + 2)}+${'-'.repeat(colWidths.match + 2)}+`;
    
    console.log(rowLine);
    console.log(
      `| ${'Customer Message'.padEnd(colWidths.msg)} | ` +
      `${'AI Cat'.padEnd(colWidths.aiCat)} | ` +
      `${'GT Cat'.padEnd(colWidths.gtCat)} | ` +
      `${'AI Pri'.padEnd(colWidths.aiPri)} | ` +
      `${'GT Pri'.padEnd(colWidths.gtPri)} | ` +
      `${'AI Esc'.padEnd(colWidths.aiEsc)} | ` +
      `${'GT Esc'.padEnd(colWidths.gtEsc)} | ` +
      `${'Status'.padEnd(colWidths.match)} |`
    );
    console.log(rowLine);

    evaluations.forEach((item) => {
      const truncateMsg = item.messageText.length > colWidths.msg 
        ? item.messageText.slice(0, colWidths.msg - 3) + '...' 
        : item.messageText.padEnd(colWidths.msg);
      
      const aiCat = item.aiDecision?.category || 'N/A';
      const gtCat = item.groundTruth.groundTruthCategory;
      const aiPri = item.aiDecision?.priority || 'N/A';
      const gtPri = item.groundTruth.groundTruthPriority;
      const aiEsc = item.aiDecision ? (item.aiDecision.needsHuman ? 'YES' : 'NO') : 'N/A';
      const gtEsc = item.groundTruth.groundTruthNeedsHuman ? 'YES' : 'NO';
      
      const isCorrect = item.comparison.overallCorrect;
      const statusLabel = isCorrect ? `${GREEN}MATCH${RESET}` : `${RED}FAIL${RESET}`;

      console.log(
        `| ${truncateMsg.padEnd(colWidths.msg)} | ` +
        `${aiCat.padEnd(colWidths.aiCat)} | ` +
        `${gtCat.padEnd(colWidths.gtCat)} | ` +
        `${aiPri.padEnd(colWidths.aiPri)} | ` +
        `${gtPri.padEnd(colWidths.gtPri)} | ` +
        `${aiEsc.padEnd(colWidths.aiEsc)} | ` +
        `${gtEsc.padEnd(colWidths.gtEsc)} | ` +
        `${statusLabel.padEnd(colWidths.match + 9)} |` // extra padding accounts for ANSI codes
      );
    });
    console.log(rowLine);

    // 4. Print Summary stats
    console.log(`\n${BOLD}--- CORRECTNESS SUMMARY ---${RESET}\n`);
    console.log(`Total Labeled Tickets:      ${BOLD}${metricsResult.evaluatedCount}${RESET}`);
    console.log(`Overall Agreement Rate:     ${metricsResult.overallAgreement >= 0.8 ? GREEN : YELLOW}${Math.round(metricsResult.overallAgreement * 100)}%${RESET} (${metricsResult.overallCorrect}/${metricsResult.evaluatedCount})`);
    console.log(`Category Agreement Rate:    ${Math.round(metricsResult.categoryAgreement * 100)}% (${metricsResult.categoryCorrect}/${metricsResult.evaluatedCount})`);
    console.log(`Priority Agreement Rate:    ${Math.round(metricsResult.priorityAgreement * 100)}% (${metricsResult.priorityCorrect}/${metricsResult.evaluatedCount})`);
    console.log(`Human Escalation Recall:    ${typeof metricsResult.humanEscalationRecall === 'number' ? `${Math.round(metricsResult.humanEscalationRecall * 100)}%` : metricsResult.humanEscalationRecall}`);
    console.log(`False Positives (Human):    ${metricsResult.falsePositiveHumanEscalations}`);
    console.log(`False Negatives (Human):    ${metricsResult.falseNegativeHumanEscalations > 0 ? RED : GREEN}${metricsResult.falseNegativeHumanEscalations}${RESET} (Critical: AI automated but GT required human)`);

    // 5. Resource Metrics
    console.log(`\n${BOLD}--- RESOURCE & COST TELEMETRY ---${RESET}\n`);
    console.log(`Active Model:               ${CYAN}${model}${RESET}`);
    console.log(`Average Latency:            ${CYAN}${(metricsResult.averageLatency / 1000).toFixed(2)}s${RESET} (Min: ${(metricsResult.minLatency / 1000).toFixed(2)}s, Max: ${(metricsResult.maxLatency / 1000).toFixed(2)}s)`);
    if (metricsResult.averageTotalTokens !== null) {
      console.log(`Average Tokens / Ticket:    ${CYAN}${Math.round(metricsResult.averageTotalTokens)} tokens${RESET} (Input: ${Math.round(metricsResult.averageInputTokens || 0)}, Output: ${Math.round(metricsResult.averageOutputTokens || 0)})`);
    } else {
      console.log(`Average Tokens / Ticket:    N/A`);
    }
    if (metricsResult.pricingConfigured && metricsResult.totalCost !== null) {
      const avgCost = metricsResult.costPerMessage ?? 0;
      console.log(`Average Cost / Ticket:      ${GREEN}$${avgCost.toFixed(5)}${RESET}`);
      console.log(`Total Run Cost (10 msgs):   ${GREEN}$${metricsResult.totalCost.toFixed(5)}${RESET}`);
    } else {
      console.log(`Average Cost / Ticket:      API usage: Free tier (Pricing parameters not set)`);
    }

    // 6. Failures Breakdown
    const failures = evaluations.filter((e) => !e.comparison.overallCorrect);
    if (failures.length > 0) {
      console.log(`\n${RED}${BOLD}--- DETAILED DIAGNOSTICS OF AI TRIAGE FAILURES ---${RESET}\n`);
      failures.forEach((item, index) => {
        console.log(`${BOLD}${index + 1}. Message:${RESET} "${item.messageText}"`);
        console.log(`   ${YELLOW}Category Mismatch:${RESET} AI: "${item.aiDecision?.category}" vs GT: "${item.groundTruth.groundTruthCategory}"`);
        console.log(`   ${YELLOW}Priority Mismatch:${RESET} AI: "${item.aiDecision?.priority}" vs GT: "${item.groundTruth.groundTruthPriority}"`);
        console.log(`   ${YELLOW}Escalation Mismatch:${RESET} AI: "${item.aiDecision?.needsHuman ? 'Needs Human' : 'Automated'}" vs GT: "${item.groundTruth.groundTruthNeedsHuman ? 'Needs Human' : 'Automated'}"`);
        if (item.groundTruth.notes) {
          console.log(`   ${CYAN}Evaluator Notes:${RESET} ${item.groundTruth.notes}`);
        }
        console.log();
      });
    } else {
      console.log(`\n${GREEN}${BOLD}All predictions perfectly match ground truth labels!${RESET}\n`);
    }

    // 7. Practical Optimization Tip
    console.log(`${BOLD}=== PRACTICAL OPTIMIZATION SUGGESTION ===${RESET}`);
    console.log(`
${BOLD}Pre-LLM Guardrail Filtering:${RESET}
Currently, the pipeline invokes the LLM for every input, even garbage/empty text or plain prompt-injection queries,
which then get flagged by our deterministic guardrail service.

By simply running our cheap regex/gibberish filters (in ${BOLD}guardrail.service.ts${RESET}) *before* invoking the LLM, we can intercept:
1. Empty/whitespace queries.
2. Highly repetitive characters / obvious gibberish (e.g. "asdfghjkl").
3. Direct, raw prompt injection strings (e.g. "ignore previous instructions").

${BOLD}Estimated Impact on Seeding Dataset (10 messages):${RESET}
*   ${BOLD}Token Savings:${RESET} Bypassing the LLM for garbage ("asdfghjkl") and injection ("Ignore all previous...") saves ~20% of total tokens.
*   ${BOLD}Cost Savings:${RESET} Reduces total run cost by 20%.
*   ${BOLD}Latency Savings:${RESET} Garbage/injection tickets resolve locally in <5ms instead of ~1.2s LLM roundtrip.
`);

  } catch (error) {
    console.error('Critical failure in evaluation runner:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

runCliEvaluation();
