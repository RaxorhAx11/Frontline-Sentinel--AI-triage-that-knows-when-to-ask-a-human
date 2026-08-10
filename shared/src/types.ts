import type { Category, Priority, MessageStatus } from './constants';

export interface IMessage {
  _id: string;
  rawText: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ITriageDecision {
  _id?: string;
  messageId: string;
  category: Category;
  priority: Priority;
  summary: string;
  suggestedAction: string;
  needsHuman: boolean;
  confidence: number;
  humanReason?: string | null;
  guardrailFlags?: string[];
  model?: string | null;
  promptVersion?: string | null;
  latencyMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  estimatedCost?: number | null;
  createdAt: string;
}

export interface IMessageDetail extends IMessage {
  triageDecision: ITriageDecision | null;
}

export interface IMessagesResponse {
  messages: IMessageDetail[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IHealthResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  uptime: number;
  timestamp: string;
}

export interface ICreateMessageInput {
  rawText: string;
}

export interface IEvaluationGroundTruth {
  id?: string;
  _id?: string;
  messageId: string;
  groundTruthCategory: Category;
  groundTruthPriority: Priority;
  groundTruthNeedsHuman: boolean;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IEvaluationResult {
  messageId: string;
  messageText: string;
  aiDecision: ITriageDecision | null;
  groundTruth: IEvaluationGroundTruth;
  comparison: {
    categoryCorrect: boolean;
    priorityCorrect: boolean;
    humanEscalationCorrect: boolean;
    overallCorrect: boolean;
  };
}

export interface IEvaluationMetrics {
  evaluatedCount: number;
  categoryCorrect: number;
  categoryAgreement: number;
  priorityCorrect: number;
  priorityAgreement: number;
  humanEscalationCorrect: number;
  humanEscalationAgreement: number;
  humanEscalationRecall: number | null | string;
  overallCorrect: number;
  overallAgreement: number;
  falsePositiveHumanEscalations: number;
  falseNegativeHumanEscalations: number;
  averageConfidence: number;
  averageLatency: number;
  medianLatency: number;
  minLatency: number;
  maxLatency: number;
  averageInputTokens: number | null;
  averageOutputTokens: number | null;
  averageTotalTokens: number | null;
  totalCost: number | null;
  costPerMessage: number | null;
  pricingConfigured: boolean;
}

