import { IAIProvider, AIProviderResponse } from './ai.provider.interface';

export class GeminiProvider implements IAIProvider {
  public async generateTriage(rawText: string, systemPrompt: string): Promise<AIProviderResponse> {
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || 'gemini-1.5-flash';
    const baseUrl = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com';

    if (!apiKey) {
      throw new Error('AI API Key is missing. Please configure AI_API_KEY in the environment.');
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
        temperature: 0.1, // Keep it highly deterministic for classification tasks
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No detail provided');
      throw new Error(`Gemini API error (HTTP ${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;

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

    return {
      rawResponse,
      inputTokens,
      outputTokens,
    };
  }
}

export const aiProvider = new GeminiProvider();
