import { z } from 'zod';
import { CATEGORIES, PRIORITIES } from '../../../shared/src/constants';

export const saveGroundTruthSchema = z.object({
  messageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID format'),
  groundTruthCategory: z.enum(CATEGORIES),
  groundTruthPriority: z.enum(PRIORITIES),
  groundTruthNeedsHuman: z.boolean(),
  notes: z.string().optional().default(''),
});

export type SaveGroundTruthInput = z.infer<typeof saveGroundTruthSchema>;
