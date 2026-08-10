"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProvider = exports.GeminiProvider = void 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function sanitizeError(error, apiKey) {
    if (!error)
        return new Error('Unknown error');
    let errMsg = error.message || String(error);
    let errStack = error.stack || '';
    if (apiKey && apiKey.trim().length > 0) {
        const escapedKey = apiKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const keyRegex = new RegExp(escapedKey, 'g');
        errMsg = errMsg.replace(keyRegex, '[REDACTED_GEMINI_KEY]');
        errStack = errStack.replace(keyRegex, '[REDACTED_GEMINI_KEY]');
    }
    // Also replace key query parameters just in case: key=AIzaSy...
    const keyParamRegex = /key=[a-zA-Z0-9_-]+/g;
    errMsg = errMsg.replace(keyParamRegex, 'key=[REDACTED_GEMINI_KEY]');
    errStack = errStack.replace(keyParamRegex, 'key=[REDACTED_GEMINI_KEY]');
    const sanitized = new Error(errMsg);
    sanitized.name = error.name || 'Error';
    if (errStack) {
        sanitized.stack = errStack;
    }
    return sanitized;
}
class GeminiProvider {
    async generateTriage(rawText, systemPrompt) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
        const model = process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-3.5-flash';
        const baseUrl = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com';
        if (!apiKey) {
            throw new Error('Real Gemini verification requires GEMINI_API_KEY.');
        }
        // Standard Gemini v1beta endpoint
        const url = `${baseUrl.replace(/\/$/, '')}/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: `Customer Support Message to classify:\n"${rawText}"`,
                        },
                    ],
                },
            ],
            systemInstruction: {
                parts: [
                    {
                        text: systemPrompt,
                    },
                ],
            },
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            enum: [
                                'billing',
                                'account',
                                'order_delivery',
                                'refund_cancellation',
                                'technical',
                                'product_service',
                                'complaint',
                                'general_question',
                                'security_abuse',
                                'out_of_scope',
                                'unknown'
                            ]
                        },
                        priority: {
                            type: 'string',
                            enum: ['P0', 'P1', 'P2', 'P3']
                        },
                        summary: {
                            type: 'string'
                        },
                        suggestedAction: {
                            type: 'string'
                        },
                        needsHuman: {
                            type: 'boolean'
                        },
                        confidence: {
                            type: 'number'
                        },
                        humanReason: {
                            type: 'string',
                            nullable: true
                        }
                    },
                    required: [
                        'category',
                        'priority',
                        'summary',
                        'suggestedAction',
                        'needsHuman',
                        'confidence',
                        'humanReason'
                    ]
                },
                temperature: 0.1, // Keep it highly deterministic for classification tasks
            },
        };
        const maxRetries = 3;
        let attempt = 0;
        let delay = 1000;
        let response = null;
        let lastError = null;
        while (attempt <= maxRetries) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (response.ok) {
                    break;
                }
                if (response.status === 429) {
                    const errorText = await response.text().catch(() => 'Rate limit exceeded');
                    lastError = new Error(`Gemini API error (HTTP 429): ${errorText}`);
                    attempt++;
                    if (attempt <= maxRetries) {
                        console.warn(`Gemini API returned 429 (Too Many Requests). Retrying attempt ${attempt}/${maxRetries} after ${delay}ms...`);
                        await sleep(delay);
                        delay *= 2;
                        continue;
                    }
                    break;
                }
                const errorText = await response.text().catch(() => 'No detail provided');
                throw new Error(`Gemini API error (HTTP ${response.status}): ${errorText}`);
            }
            catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    lastError = new Error('Gemini API request timed out after 10000ms');
                }
                else {
                    lastError = error;
                }
                break;
            }
        }
        if (!response || !response.ok) {
            throw sanitizeError(lastError || new Error('Failed to generate response from Gemini API'), apiKey);
        }
        let data;
        try {
            data = (await response.json());
        }
        catch (error) {
            throw sanitizeError(error, apiKey);
        }
        const candidate = data.candidates?.[0];
        if (!candidate) {
            throw new Error('Gemini API returned empty response candidates.');
        }
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            console.warn(`Warning: Gemini finishReason was: ${candidate.finishReason}`);
        }
        const rawResponse = candidate.content?.parts?.[0]?.text;
        if (!rawResponse) {
            throw new Error('Gemini API returned candidate without text content.');
        }
        const inputTokens = data.usageMetadata?.promptTokenCount ?? null;
        const outputTokens = data.usageMetadata?.candidatesTokenCount ?? null;
        const totalTokens = data.usageMetadata?.totalTokenCount ?? null;
        return {
            rawResponse,
            inputTokens,
            outputTokens,
            totalTokens,
        };
    }
}
exports.GeminiProvider = GeminiProvider;
exports.aiProvider = new GeminiProvider();
