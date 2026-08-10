export interface AIProviderResponse {
  rawResponse: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface IAIProvider {
  generateTriage(rawText: string, systemPrompt: string): Promise<AIProviderResponse>;
}
