import { z } from 'zod';

export const createMessageSchema = z.object({
  rawText: z
    .string({
      required_error: 'Message text is required',
      invalid_type_error: 'Message text must be a string',
    })
    .trim()
    .min(1, 'Message text cannot be empty'),
});
