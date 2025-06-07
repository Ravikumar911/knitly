import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../init';
import { createFeedback, getFeedbackByUserId } from '@workspace/database';

export const feedbackRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      subject: z.string().min(1, "Subject is required"),
      message: z.string().min(1, "Message is required"),
      type: z.enum(['bug', 'feature', 'general', 'improvement']),
      priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
      userEmail: z.string().email().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await createFeedback({
        ...input,
        userId: ctx.userId,
      });
    }),

  getUserFeedback: protectedProcedure
    .query(async ({ ctx }) => {
      return await getFeedbackByUserId(ctx.userId!);
    }),
}); 