import { TriageDecisionOutput, triageDecisionSchema } from '../validators/triage.validator';
import { ITriageDecision } from '../../../shared/src/types';
import { Category, Priority } from '../../../shared/src/constants';

export class TriageService {
  /**
   * Main entry point for the triage pipeline.
   * Runs the message through the pipeline stages:
   * Input Validation -> AI Triage Simulation -> Schema Validation -> Guardrails -> Confidence Evaluation -> Human Escalation
   */
  public async triageMessage(messageId: string, rawText: string): Promise<Omit<ITriageDecision, 'createdAt'>> {
    const startTime = Date.now();

    // 1. Input Validation
    this.validateInput(rawText);

    // 2. AI Triage Simulation (Mock LLM)
    const rawAiOutput = await this.simulateAITriage(rawText);

    // 3. Schema Validation & Structured Output Extraction
    const parsedOutput = this.validateAIOutput(rawAiOutput);

    // 4. Guardrails & Confidence Evaluation & Human Escalation
    const finalizedDecision = this.applyGuardrailsAndEscalation(rawText, parsedOutput);

    const latencyMs = Date.now() - startTime;

    return {
      messageId,
      ...finalizedDecision,
      model: 'sentinel-classifier-v1-mock',
      promptVersion: '1.0.0-phase1',
      latencyMs,
    };
  }

  /**
   * Pipeline Stage 1: Input Validation
   */
  private validateInput(rawText: string): void {
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Pipeline Input Error: Empty customer message');
    }
  }

  /**
   * Pipeline Stage 2: AI Triage Simulation
   * Uses heuristics and keyword analysis to mock the future LLM classification output
   */
  private async simulateAITriage(rawText: string): Promise<any> {
    // Simulate slight network latency to mimic API call (e.g. 50-150ms)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 50));

    const text = rawText.toLowerCase();

    // Default structure that LLM is expected to return
    let category: Category = 'general_question';
    let priority: Priority = 'P2';
    let summary = 'General customer inquiry';
    let suggestedAction = 'Respond with standard greeting and ask for details.';
    let confidence = 0.85;
    let needsHuman = false;
    let humanReason: string | null = null;

    // Rules-based classification to mock AI response
    if (text.includes('hacked') || text.includes('compromised') || text.includes('unauthorized') || text.includes('stolen')) {
      category = 'security_abuse';
      priority = 'P0';
      summary = 'Customer reports account compromise or security incident';
      suggestedAction = 'Lock account immediately, invalidate active sessions, and send password reset link.';
      confidence = 0.98;
    } else if (text.includes('ignore previous instructions') || text.includes('override prompt') || text.includes('system admin') || text.includes('system prompt')) {
      category = 'security_abuse';
      priority = 'P0';
      summary = 'Potential prompt injection attempt detected';
      suggestedAction = 'Reject instruction and flag customer account for review.';
      confidence = 0.75;
      needsHuman = true;
      humanReason = 'System security guardrail: Possible adversarial input';
    } else if (text.includes('refund') || text.includes('cancel') || text.includes('chargeback')) {
      category = 'refund_cancellation';
      priority = 'P1';
      summary = 'Customer requesting refund or cancellation';
      suggestedAction = 'Retrieve billing history, verify refund policy status, and initiate cancellation workflow.';
      confidence = 0.95;
    } else if (text.includes('billing') || text.includes('invoice') || text.includes('charged') || text.includes('credit card')) {
      category = 'billing';
      priority = 'P2';
      summary = 'Billing query or invoice inquiry';
      suggestedAction = 'Check account payment history and verify charge details.';
      confidence = 0.90;
    } else if (text.includes('delivery') || text.includes('order') || text.includes('tracking') || text.includes('shipped') || text.includes('where is my')) {
      category = 'order_delivery';
      priority = 'P2';
      summary = 'Order delivery status request';
      suggestedAction = 'Retrieve package tracking link and send status update email.';
      confidence = 0.92;
    } else if (text.includes('broke') || text.includes('crash') || text.includes('bug') || text.includes('error') || text.includes('not working') || text.includes('fail')) {
      category = 'technical';
      priority = 'P1';
      summary = 'Technical support request or system error report';
      suggestedAction = 'Request system error logs, screenshot, and escalate to tier 2 tech support if unresolved.';
      confidence = 0.88;
    } else if (text.includes('angry') || text.includes('terrible') || text.includes('worst') || text.includes('sue') || text.includes('useless')) {
      category = 'complaint';
      priority = 'P1';
      summary = 'High severity customer complaint';
      suggestedAction = 'Draft immediate apology and route to customer relationship team.';
      confidence = 0.80;
      needsHuman = true; // Escalate angry customers
      humanReason = 'Customer escalation: High severity sentiment';
    } else if (text.trim().split(/\s+/).length < 3) {
      // Extremely short/vague messages
      category = 'unknown';
      priority = 'P3';
      summary = 'Vague support inquiry';
      suggestedAction = 'Ask customer to provide more details about their request.';
      confidence = 0.45; // Low confidence
    } else if (text.match(/[asdfghjklqwertyuiopzxcvbnm]{10,}/i)) {
      // Gibberish detector
      category = 'unknown';
      priority = 'P3';
      summary = 'Gibberish or garbled input';
      suggestedAction = 'Mark as spam/ignore or reply asking for legible description.';
      confidence = 0.30;
    }

    return {
      category,
      priority,
      summary,
      suggestedAction,
      confidence,
      needsHuman,
      humanReason,
    };
  }

  /**
   * Pipeline Stage 3: Schema Validation
   * Enforces strict schema constraints on the AI output
   */
  private validateAIOutput(rawOutput: any): TriageDecisionOutput {
    const parseResult = triageDecisionSchema.safeParse(rawOutput);
    if (!parseResult.success) {
      console.error('Pipeline Error: AI Output schema validation failed', parseResult.error.format());
      // Return a failsafe human review triage decision instead of crashing
      return {
        category: 'unknown',
        priority: 'P1',
        summary: 'Failed to parse AI output',
        suggestedAction: 'Manually review raw message.',
        confidence: 0.0,
        needsHuman: true,
        humanReason: 'Failsafe: AI output malformed',
      };
    }
    return parseResult.data;
  }

  /**
   * Pipeline Stage 4 & 5: Guardrails, Confidence Evaluation, and Human Escalation
   * Enforces rules around high/low confidence and specific safety conditions
   */
  private applyGuardrailsAndEscalation(rawText: string, decision: TriageDecisionOutput): TriageDecisionOutput {
    const finalDecision = { ...decision };

    // Rule A: Never guess. If confidence is below threshold, escalate.
    const CONFIDENCE_THRESHOLD = 0.70;
    if (finalDecision.confidence < CONFIDENCE_THRESHOLD) {
      finalDecision.needsHuman = true;
      finalDecision.humanReason = finalDecision.humanReason || `Low confidence evaluation (${Math.round(finalDecision.confidence * 100)}%)`;
    }

    // Rule B: Security/Abuse categories must always go to human review.
    if (finalDecision.category === 'security_abuse') {
      finalDecision.needsHuman = true;
      finalDecision.humanReason = finalDecision.humanReason || 'High-risk security triage';
    }

    // Rule C: Out of scope must go to human review for manual redirection.
    if (finalDecision.category === 'out_of_scope') {
      finalDecision.needsHuman = true;
      finalDecision.humanReason = finalDecision.humanReason || 'Out of scope inquiry';
    }

    // Rule D: Vague/Garbage input that triggers "unknown" category gets escalated.
    if (finalDecision.category === 'unknown') {
      finalDecision.needsHuman = true;
      finalDecision.humanReason = finalDecision.humanReason || 'Unable to classify customer intent';
    }

    return finalDecision;
  }
}

export const triageService = new TriageService();
