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
      console.log('🚀 Beta access request received:', input);
      
      try {
        const feedbackData = {
          subject: "Beta Access Request",
          message: `Beta access requested for email: ${input.email}`,
          type: "beta",
          priority: "medium",
          status: "open",
          userEmail: input.email,
          userAgent: input.userAgent,
          userId: null, // No user ID since this is for non-authenticated users
        };
        
        console.log('📝 Creating feedback with data:', feedbackData);
        
        const result = await createFeedback(feedbackData);
        
        console.log('✅ Beta access request created successfully:', result);
        
        return result;
      } catch (error) {
        console.error('❌ Error creating beta access request:', error);
        throw error;
      }
    }),
}); 