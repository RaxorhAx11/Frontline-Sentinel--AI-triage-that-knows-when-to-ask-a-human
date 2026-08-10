"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triageService = exports.TriageService = void 0;
const triage_validator_1 = require("../validators/triage.validator");
const gemini_provider_1 = require("./ai/gemini.provider");
const system_prompt_1 = require("./ai/system.prompt");
const guardrail_service_1 = require("./guardrail.service");
class TriageService {
    provider = gemini_provider_1.aiProvider;
    setProvider(provider) {
        this.provider = provider;
    }
    /**
     * Main entry point for the triage pipeline.
     * Customer Message -> Input Validation -> AI Triage -> Schema Validation -> Deterministic Guardrails -> Save
     */
    async triageMessage(messageId, rawText) {
        const startTime = Date.now();
        const model = process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-3.5-flash';
        const promptVersion = 'v2';
        try {
            // Stage 1: Input Validation (Empty/Whitespace & Length check)
            this.validateInput(rawText);
            // 1. Call AI Provider
            const aiResponse = await this.provider.generateTriage(rawText, system_prompt_1.SYSTEM_PROMPT);
            const latencyMs = Date.now() - startTime;
            // Calculate cost telemetry
            const inputTokens = aiResponse.inputTokens;
            const outputTokens = aiResponse.outputTokens;
            const totalTokens = aiResponse.totalTokens;
            const estimatedCost = 0; // Free tier API cost is $0
            // 2. Parse JSON
            let parsedJson;
            try {
                const cleanedJson = this.extractJson(aiResponse.rawResponse);
                parsedJson = JSON.parse(cleanedJson);
            }
            catch (err) {
                this.logTriage(messageId, 'failed', model, latencyMs, 'JSON_PARSING_ERROR');
                throw new Error('JSON cannot be parsed: The AI model response was not valid JSON.');
            }
            // 3. Schema Validation (Zod)
            const validationResult = triage_validator_1.triageDecisionSchema.safeParse(parsedJson);
            if (!validationResult.success) {
                this.logTriage(messageId, 'failed', model, latencyMs, 'SCHEMA_VALIDATION_ERROR');
                throw new Error('Schema validation failed: Required fields are missing or type-mismatched in AI response.');
            }
            const decisionOutput = validationResult.data;
            // 4. Apply Deterministic Guardrails
            const guardrailResult = guardrail_service_1.guardrailService.apply(rawText, decisionOutput);
            const finalizedDecision = guardrailResult.finalDecision;
            const finalStatus = finalizedDecision.needsHuman ? 'human_review' : 'completed';
            this.logTriage(messageId, finalStatus, model, latencyMs);
            return {
                messageId,
                ...finalizedDecision,
                model,
                promptVersion,
                latencyMs,
                inputTokens,
                outputTokens,
                totalTokens,
                estimatedCost,
            };
        }
        catch (error) {
            const latencyMs = Date.now() - startTime;
            const errorCategory = error.message && error.message.includes('Input length')
                ? 'INPUT_LENGTH_EXCEEDED'
                : error.message && error.message.includes('Empty customer message')
                    ? 'EMPTY_INPUT'
                    : error.message && error.message.includes('JSON cannot be')
                        ? 'JSON_PARSING_ERROR'
                        : error.message && error.message.includes('Schema validation')
                            ? 'SCHEMA_VALIDATION_ERROR'
                            : 'PROVIDER_ERROR';
            this.logTriage(messageId, 'failed', model, latencyMs, errorCategory);
            throw error;
        }
    }
    /**
     * Pipeline Stage 1: Input Validation
     */
    validateInput(rawText) {
        if (!rawText || rawText.trim().length === 0) {
            throw new Error('Pipeline Input Error: Empty customer message');
        }
        if (rawText.length > 4000) {
            throw new Error('Pipeline Input Error: Input length exceeds 4000 characters.');
        }
    }
    /**
     * Helper: Privacy-conscious logging of triage results
     */
    logTriage(messageId, status, model, latencyMs, errorCategory) {
        console.log(`[TRIAGE_LOG] MessageID: ${messageId} | Status: ${status} | Model: ${model || 'Unknown'} | Latency: ${latencyMs !== null ? `${latencyMs}ms` : 'N/A'} | ErrorCategory: ${errorCategory || 'None'}`);
    }
    /**
     * Helper: Strip markdown formatting blocks (e.g. ```json ... ```) to extract raw JSON
     */
    extractJson(text) {
        let cleaned = text.trim();
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.slice(7);
        }
        else if (cleaned.startsWith('```')) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();
        // Find the first '{' and match it with the correct closing '}'
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace !== -1) {
            let braceCount = 0;
            let insideString = false;
            let escapeNext = false;
            for (let i = firstBrace; i < cleaned.length; i++) {
                const char = cleaned[i];
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }
                if (char === '"') {
                    insideString = !insideString;
                    continue;
                }
                if (!insideString) {
                    if (char === '{') {
                        braceCount++;
                    }
                    else if (char === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            return cleaned.slice(firstBrace, i + 1);
                        }
                    }
                }
            }
        }
        return cleaned;
    }
}
exports.TriageService = TriageService;
exports.triageService = new TriageService();
