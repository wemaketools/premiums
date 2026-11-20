/**
 * The error document every API failure arrives as (RFC 7807 `application/problem+json`) and the field-level error
 * inside it. `ApiError` in `client.ts` is the normalized form the UI works with.
 */
import { z } from 'zod';

export const FieldError = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
});
export type FieldError = z.infer<typeof FieldError>;

export const Problem = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string().optional(),
  code: z.string().optional(),
  errors: z.array(FieldError).optional(),
  correlationId: z.string().min(1),
});
export type Problem = z.infer<typeof Problem>;

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';
