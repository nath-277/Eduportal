import { z } from 'zod';

export const requestCommunitySchema = z.object({
  name: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/, {
    message: 'Community name can only contain lowercase letters, numbers, and hyphens',
  }),
  displayName: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().default(false),
  joinQuestions: z.array(z.string().min(3).max(200)).max(5).optional(),
});

export type RequestCommunityInput = z.infer<typeof requestCommunitySchema>;

export const reviewCommunityRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  adminNotes: z.string().max(500).optional(),
});

export type ReviewCommunityRequestInput = z.infer<typeof reviewCommunityRequestSchema>;

export const submitJoinRequestSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      questionText: z.string(),
      answer: z.string().min(1).max(1000),
    })
  ).default([]),
});

export type SubmitJoinRequestInput = z.infer<typeof submitJoinRequestSchema>;

export const reviewJoinRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export type ReviewJoinRequestInput = z.infer<typeof reviewJoinRequestSchema>;
