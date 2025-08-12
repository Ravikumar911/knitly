import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure, baseProcedure } from '../init';
import { 
  createFeedback, 
  getFeedbackByUserId, 
  checkExistingBetaRequest,
  getRecentBetaRequestsCount 
} from '@workspace/database';
import { rateLimiter, emailRateLimiter } from '../../lib/rate-limiter';

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
        .min(5, "Email must be at least 5 characters")
        .max(254, "Email is too long")
        .refine(
          (email) => email.endsWith('@gmail.com'),
          "Only Gmail addresses are allowed for beta access"
        )
        .refine(
          (email) => {
            // Basic email validation to prevent obvious fake emails
            const localPart = email.split('@')[0];
            return localPart && localPart.length >= 3 && !/^[0-9]+$/.test(localPart);
          },
          "Please enter a valid Gmail address"
        ),
      userAgent: z.string().optional(),
      clientIP: z.string().optional(), // We'll get this server-side
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('🚀 Beta access request received:', { email: input.email });
      
      try {
        // Sanitize email input
        const email = input.email.toLowerCase().trim();
        const userAgent = input.userAgent?.substring(0, 500) || 'Unknown'; // Limit length
        
        // 1. Check for existing beta request from this email
        const existingRequest = await checkExistingBetaRequest(email);
        if (existingRequest) {
          const timeSinceRequest = Date.now() - new Date(existingRequest.createdAt!).getTime();
          const hoursSince = Math.floor(timeSinceRequest / (1000 * 60 * 60));
          
          throw new TRPCError({
            code: 'CONFLICT',
            message: `You've already requested beta access ${hoursSince > 0 ? `${hoursSince} hours ago` : 'recently'}. We'll notify you when access is available.`,
          });
        }

        // 2. Email-based rate limiting (stricter)
        const emailRateCheck = emailRateLimiter.check(email);
        if (emailRateCheck.blocked) {
          const remainingMinutes = Math.ceil((emailRateCheck.remainingTime || 0) / (1000 * 60));
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `Please wait ${remainingMinutes} minutes before submitting another request.`,
          });
        }

        // 3. Global rate limiting check - prevent too many total requests
        const recentRequestsCount = await getRecentBetaRequestsCount(24);
        if (recentRequestsCount > 100) { // Max 100 beta requests per 24 hours globally
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Beta access requests are temporarily limited. Please try again later.',
          });
        }

        // 4. Additional validation - check for suspicious patterns
        const suspiciousPatterns = [
          /test[0-9]*@gmail\.com/,
          /temp[0-9]*@gmail\.com/,
          /fake[0-9]*@gmail\.com/,
          /spam[0-9]*@gmail\.com/,
          /^[a-z]{1,2}@gmail\.com$/,
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(email))) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Please enter a valid personal Gmail address.',
          });
        }

        // 5. Check for too many similar emails (basic duplicate detection)
        const emailPrefix = email.split('@')[0];
        if (!emailPrefix || emailPrefix.length < 3) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Please enter a valid Gmail address.',
          });
        }

        // Create the beta access request
        const feedbackData = {
          subject: "Beta Access Request",
          message: `Beta access requested for email: ${email}`,
          type: "beta" as const,
          priority: "medium" as const,
          status: "open" as const,
          userEmail: email,
          userAgent,
          userId: null, // No user ID since this is for non-authenticated users
        };
        
        console.log('📝 Creating beta access request for:', email);
        
        const result = await createFeedback(feedbackData);
        
        console.log('✅ Beta access request created successfully:', result?.id);
        
        return {
          success: true,
          message: "Beta access request submitted successfully. We'll notify you when access is available.",
          id: result?.id,
        };
      } catch (error) {
        console.error('❌ Error creating beta access request:', error);
        
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // Handle other errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit beta access request. Please try again.',
        });
      }
    }),
}); 