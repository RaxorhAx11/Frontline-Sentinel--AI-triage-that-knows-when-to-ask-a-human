import { TriageDecisionOutput, triageDecisionSchema } from '../validators/triage.validator';
import { ITriageDecision } from '../../../shared/src/types';
import { CATEGORIES, PRIORITIES } from '../../../shared/src/constants';
import { aiProvider } from './ai/gemini.provider';
import { SYSTEM_PROMPT } from './ai/system.prompt';

export class TriageService {
  /**
   * Main entry point for the triage pipeline.
   * Customer Message -> Input Validation -> AI Triage -> Schema Validation -> Deterministic Guardrails -> Save
   */
  public async triageMessage(messageId: string, rawText: string): Promise<Omit<ITriageDecision, 'createdAt'>> {
    const startTime = Date.now();
    const model = process.env.AI_MODEL || 'gemini-1.5-flash';
    const promptVersion = 'v2';

    // Guardrail 6: The message is empty/invalid
    try {
      this.validateInput(rawText);
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return this.createFallbackDecision(
        messageId,
        'The customer message is empty or invalid.',
        model,
        promptVersion,
        latencyMs
      );
    }

    try {
      // 1. Call AI Provider (Guardrail 12: The model provider fails)
      const aiResponse = await aiProvider.generateTriage(rawText, SYSTEM_PROMPT);
      const latencyMs = Date.now() - startTime;

      // Calculate cost telemetry (based on gemini-1.5-flash pricing)
      const inputTokens = aiResponse.inputTokens;
      const outputTokens = aiResponse.outputTokens;
      const estimatedCost =
        inputTokens !== null && outputTokens !== null
          ? inputTokens * 0.000000075 + outputTokens * 0.0000003
          : null;

      // 2. Parse JSON (Guardrail 1: JSON cannot be parsed)
      let parsedJson: any;
      try {
        const cleanedJson = this.extractJson(aiResponse.rawResponse);
        parsedJson = JSON.parse(cleanedJson);
      } catch (err) {
        console.error('Failed to parse AI JSON:', aiResponse.rawResponse);
        return this.createFallbackDecision(
          messageId,
          'JSON cannot be parsed: The AI model response was not valid JSON.',
          model,
          promptVersion,
          latencyMs,
          inputTokens,
          outputTokens,
          estimatedCost
        );
      }

      // 3. Schema Validation (Guardrail 2: Required fields are missing / malformed)
      const validationResult = triageDecisionSchema.safeParse(parsedJson);
      if (!validationResult.success) {
        console.error('AI JSON schema validation failed:', validationResult.error.format());
        return this.createFallbackDecision(
          messageId,
          'Required fields are missing or type-mismatched in AI response.',
          model,
          promptVersion,
          latencyMs,
          inputTokens,
          outputTokens,
          estimatedCost
        );
      }

      const decisionOutput = validationResult.data;

      // 4. Apply Deterministic Guardrails (Guardrails 3, 4, 5, 7, 8, 9, 10, 11)
      const finalizedDecision = this.applyGuardrails(rawText, decisionOutput);

      return {
        messageId,
        ...finalizedDecision,
        model,
        promptVersion,
        latencyMs,
        inputTokens,
        outputTokens,
        estimatedCost,
      };
    } catch (error: any) {
      console.error('Triage pipeline execution error:', error);
      const latencyMs = Date.now() - startTime;
      // Guardrail 12: Return fallback decision if model provider fails
      return this.createFallbackDecision(
        messageId,
        `The model provider failed: ${error.message || 'API unavailable'}`,
        model,
        promptVersion,
        latencyMs
      );
    }
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
   * Helper: Strip markdown formatting blocks (e.g. ```json ... ```) to extract raw JSON
   */
  private extractJson(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
  }

  /**
   * Helper: Apply the 12 deterministic guardrails to the parsed JSON
   */
  private applyGuardrails(rawText: string, decision: TriageDecisionOutput): TriageDecisionOutput {
    const output = { ...decision };

    // Guardrail 3: Category is invalid
    const isValidCategory = CATEGORIES.includes(output.category as any);
    if (!isValidCategory) {
      output.category = 'unknown';
      output.needsHuman = true;
      output.humanReason = 'AI response mapping error: Invalid category';
    }

    // Guardrail 4: Priority is invalid
    const isValidPriority = PRIORITIES.includes(output.priority as any);
    if (!isValidPriority) {
      output.priority = 'P1';
      output.needsHuman = true;
      output.humanReason = 'AI response mapping error: Invalid priority';
    }

    // Guardrail 5: Confidence is outside 0–1
    if (output.confidence < 0 || output.confidence > 1) {
      output.confidence = 0.0;
      output.needsHuman = true;
      output.humanReason = 'AI response mapping error: Confidence score out of bounds';
    }

    // Guardrail 7: Confidence is below the configured human-review threshold
    const HUMAN_REVIEW_THRESHOLD = 0.70;
    if (output.confidence < HUMAN_REVIEW_THRESHOLD) {
      output.needsHuman = true;
      output.humanReason = output.humanReason || 'AI confidence is below the configured threshold.';
    }

    // Guardrail 8: The message is clearly ambiguous
    if (output.category === 'unknown') {
      output.needsHuman = true;
      output.humanReason = output.humanReason || "The customer's request is too ambiguous.";
    }

    // Guardrail 9: The message contains a security-sensitive issue
    if (output.category === 'security_abuse') {
      output.priority = 'P0'; // Enforce P0 for security
      output.needsHuman = true;
      output.humanReason = output.humanReason || 'The message contains a security-sensitive request.';
    }

    // Guardrail 10: The AI output contains unsupported claims / financial escalations
    // Check if billing inquiry has high financial magnitude or important claims
    const lowerText = rawText.toLowerCase();
    const hasLargeAmount = /\b\d{3,}\b/.test(lowerText) || lowerText.includes('thousand') || lowerText.includes('million');
    if (output.category === 'billing' && (output.priority === 'P0' || output.priority === 'P1' || hasLargeAmount)) {
      output.needsHuman = true;
      output.humanReason = output.humanReason || 'The issue has significant financial impact.';
    }

    // Guardrail 11: The model response is incomplete
    if (!output.summary || output.summary.trim().length === 0 || !output.suggestedAction || output.suggestedAction.trim().length === 0) {
      output.needsHuman = true;
      output.humanReason = 'The AI response was incomplete or missing fields.';
    }

    // Guardrail 10 (Abuse/Out of Scope): If out of scope, escalate
    if (output.category === 'out_of_scope') {
      output.needsHuman = true;
      output.humanReason = output.humanReason || 'The request is out of scope.';
    }

    return output;
  }

  /**
   * Helper: Construct a standard fallback triage decision for validation/network failures
   */
  private createFallbackDecision(
    messageId: string,
    reason: string,
    model: string,
    promptVersion: string,
    latencyMs: number,
    inputTokens: number | null = null,
    outputTokens: number | null = null,
    estimatedCost: number | null = null
  ): Omit<ITriageDecision, 'createdAt'> {
    return {
      messageId,
      category: 'unknown',
      priority: 'P1',
      summary: 'Classification failed: The pipeline encountered a system, network, or schema validation error.',
      suggestedAction: 'Escalate to standard customer support team for manual inspection.',
      needsHuman: true,
      confidence: 0.0,
      humanReason: reason,
      model,
      promptVersion,
      latencyMs,
      inputTokens,
      outputTokens,
      estimatedCost,
    };
  }
}

export const triageService = new TriageService();
