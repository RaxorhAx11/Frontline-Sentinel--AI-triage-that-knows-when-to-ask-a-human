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
  model?: string | null;
  promptVersion?: string | null;
  latencyMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
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
