import type { IMessageDetail, IMessagesResponse, IHealthResponse } from '../../../shared/src/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

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
    }>('/messages/stats'),

  getMessages: (page = 1, limit = 10) =>
    request<IMessagesResponse>(`/messages?page=${page}&limit=${limit}`),

  getMessageById: (id: string) => request<IMessageDetail>(`/messages/${id}`),

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
};
