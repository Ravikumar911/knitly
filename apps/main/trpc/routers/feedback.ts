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

  getUserFeedback: protectedProcedure
    .query(async ({ ctx }) => {
      return await getFeedbackByUserId(ctx.userId!);
    }),

  requestBetaAccess: baseProcedure
    .input(z.object({
      email: z
        .string()
        .email("Please enter a valid email address")
        .refine(
          (email) => email.endsWith('@gmail.com'),
          "Only Gmail addresses are allowed for beta access"
        ),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await createFeedback({
        subject: "Beta Access Request",
        message: `Beta access requested for email: ${input.email}`,
        type: "beta",
        priority: "medium",
        status: "open",
        userEmail: input.email,
        userAgent: input.userAgent,
        userId: null, // No user ID since this is for non-authenticated users
      });
    }),
}); 