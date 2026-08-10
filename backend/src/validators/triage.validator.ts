import { z } from 'zod';
import { CATEGORIES, PRIORITIES } from '../../../shared/src/constants';

export const triageDecisionSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  summary: z.string().min(1, 'Summary cannot be empty'),
  suggestedAction: z.string().min(1, 'Suggested action cannot be empty'),
  confidence: z.number().min(0).max(1),
  needsHuman: z.boolean(),
  humanReason: z.string().nullable().optional(),
});

export type TriageDecisionOutput = z.infer<typeof triageDecisionSchema>;
