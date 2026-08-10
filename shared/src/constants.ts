export const CATEGORIES = [
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
] as const;

export type Category = typeof CATEGORIES[number];

export const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;

export type Priority = typeof PRIORITIES[number];

export const STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'human_review'
] as const;

export type MessageStatus = typeof STATUSES[number];
