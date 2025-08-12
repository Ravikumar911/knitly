import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, baseProcedure } from '../init';
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

  // Public beta request endpoint
  requestBeta: baseProcedure
    .input(z.object({
      userEmail: z.string().email("Please enter a valid email address")
        .refine((email) => email.endsWith('@gmail.com'), {
          message: "Beta access is currently only available for Gmail users. Please use a Gmail address.",
        }),
      message: z.string().min(10, "Please tell us why you'd like beta access (minimum 10 characters)").optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await createFeedback({
        userId: null, // No user ID for public beta requests
        subject: `Beta Access Request - ${input.userEmail}`,
        message: input.message || "Beta access request from landing page",
        type: 'beta-request',
        priority: 'medium',
        status: 'open',
        userEmail: input.userEmail,
        userAgent: input.userAgent,
      });
    }),

  getUserFeedback: protectedProcedure
    .query(async ({ ctx }) => {
      return await getFeedbackByUserId(ctx.userId!);
    }),
}); 