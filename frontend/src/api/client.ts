import type { IMessageDetail, IMessagesResponse, IHealthResponse } from '../../../shared/src/types';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5000/api' : '/api');

export class ApiError extends Error {
  public status: number;
  public errors?: any[];

  constructor(message: string, status: number, errors?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'An unknown API error occurred' };
    }

    throw new ApiError(
      errorData.message || response.statusText,
      response.status,
      errorData.errors
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  getHealth: () => request<IHealthResponse>('/health'),
  
  getStats: () =>
    request<{
      total: number;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
      humanReview: number;
      invalid: number;
      p0: number;
      p1: number;
      p2: number;
      p3: number;
      averageConfidence: number;
    }>('/messages/stats'),

  getMessages: (page = 1, limit = 10, filters?: { status?: string; priority?: string; category?: string }) => {
    let url = `/messages?page=${page}&limit=${limit}`;
    if (filters) {
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.priority) url += `&priority=${filters.priority}`;
      if (filters.category) url += `&category=${filters.category}`;
    }
    return request<IMessagesResponse>(url);
  },

  getMessageById: (id: string) => request<IMessageDetail>(`/messages/${id}`),

  deleteMessage: (messageId: string) =>
    request<{ status: string; message: string }>(`/messages/${messageId}`, {
      method: 'DELETE',
    }),

  resetAllData: () =>
    request<{ status: string; message: string }>('/messages', {
      method: 'DELETE',
    }),

  createMessage: (rawText: string) =>
    request<IMessageDetail>('/messages', {
      method: 'POST',
      body: JSON.stringify({ rawText }),
    }),

  runTriage: (messageId: string) =>
    request<any>(`/triage/${messageId}`, {
      method: 'POST',
    }),

  retryTriage: (messageId: string) =>
    request<any>(`/triage/${messageId}/retry`, {
      method: 'POST',
    }),

  importMessagesBulk: (csvText: string) =>
    request<{
      total: number;
      valid: number;
      invalid: number;
      duplicates: number;
      imported: number;
    }>('/messages/bulk', {
      method: 'POST',
      body: JSON.stringify({ csvText }),
    }),

  startBulkTriage: () =>
    request<{ status: string }>('/triage/bulk', {
      method: 'POST',
    }),

  getBulkTriageStatus: () =>
    request<{
      status: 'idle' | 'running' | 'paused' | 'stopped' | 'completed';
      total: number;
      processed: number;
      pending: number;
      processing: number;
      completed: number;
      humanReview: number;
      failed: number;
      invalid: number;
    }>('/triage/bulk/status'),

  pauseBulkTriage: () =>
    request<{ status: string }>('/triage/bulk/pause', {
      method: 'POST',
    }),

  stopBulkTriage: () =>
    request<{ status: string }>('/triage/bulk/stop', {
      method: 'POST',
    }),

  resetBulkTriage: () =>
    request<{ status: string }>('/triage/bulk/reset', {
      method: 'POST',
    }),

  getEvaluations: () => request<any[]>('/evaluations'),

  saveGroundTruth: (payload: {
    messageId: string;
    groundTruthCategory: string;
    groundTruthPriority: string;
    groundTruthNeedsHuman: boolean;
    notes?: string;
  }) =>
    request<any>('/evaluations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getEvaluationDetails: (messageId: string) => request<any>(`/evaluations/${messageId}`),

  getEvaluationMetrics: () => request<any>('/evaluations/metrics'),

  seedEvaluationDataset: () =>
    request<any>('/evaluations/seed', {
      method: 'POST',
    }),

  getReviews: (page = 1, limit = 10, filters?: { priority?: string; status?: string }) => {
    let url = `/reviews?page=${page}&limit=${limit}`;
    if (filters) {
      if (filters.priority) url += `&priority=${filters.priority}`;
      if (filters.status) url += `&status=${filters.status}`;
    }
    return request<any>(url);
  },

  createReview: (
    messageId: string,
    payload: {
      decision: 'accepted' | 'overridden';
      finalCategory: string;
      finalPriority: string;
      finalAction: string;
      finalNeedsHuman: boolean;
      notes?: string;
    }
  ) =>
    request<any>(`/reviews/${messageId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateReview: (
    messageId: string,
    payload: {
      decision?: 'accepted' | 'overridden';
      finalCategory?: string;
      finalPriority?: string;
      finalAction?: string;
      finalNeedsHuman?: boolean;
      notes?: string;
    }
  ) =>
    request<any>(`/reviews/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
