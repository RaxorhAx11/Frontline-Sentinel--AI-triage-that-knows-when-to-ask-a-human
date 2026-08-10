import { z } from 'zod';
import { CATEGORIES, PRIORITIES } from '../../../shared/src/constants';

export const createReviewSchema = z.object({
  decision: z.enum(['accepted', 'overridden']),
  finalCategory: z.enum(CATEGORIES),
  finalPriority: z.enum(PRIORITIES),
  finalAction: z.string().min(1, 'Action protocol is required'),
  finalNeedsHuman: z.boolean(),
  notes: z.string().optional().default(''),
}).refine(
  (data) => {
    if (data.decision === 'overridden' && (!data.notes || data.notes.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'A review note is required when overriding a decision.',
    path: ['notes'],
  }
);

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  decision: z.enum(['accepted', 'overridden']).optional(),
  finalCategory: z.enum(CATEGORIES).optional(),
  finalPriority: z.enum(PRIORITIES).optional(),
  finalAction: z.string().min(1).optional(),
  finalNeedsHuman: z.boolean().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.decision === 'overridden' && data.notes !== undefined && (!data.notes || data.notes.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'A review note is required when overriding a decision.',
    path: ['notes'],
  }
);

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
