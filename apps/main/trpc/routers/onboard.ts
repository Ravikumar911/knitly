import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { isOnboardComplete } from "@/lib/onboard/complete";
import { getOnboardSession } from "@/lib/onboard/session";

const answerValueSchema = z.union([z.string(), z.boolean()]);

export const onboardRouter = createTRPCRouter({
  status: protectedProcedure.query(async () => {
    return getOnboardSession().getSnapshot();
  }),

  isComplete: protectedProcedure.query(async () => {
    return { complete: await isOnboardComplete() };
  }),

  acknowledgeWelcome: protectedProcedure.mutation(async () => {
    return getOnboardSession().acknowledgeWelcome();
  }),

  start: protectedProcedure
    .input(
      z
        .object({
          useRecommendedDefaults: z.boolean().optional().default(true),
          provider: z
            .enum(["ollama-local", "openai-compatible", "anthropic"])
            .optional(),
          apiKey: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
      try {
        return await getOnboardSession().start({
          useRecommendedDefaults: input?.useRecommendedDefaults ?? true,
          provider: input?.provider,
          apiKey: input?.apiKey,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Could not start onboarding.",
        });
      }
    }),

  answer: protectedProcedure
    .input(
      z.object({
        value: answerValueSchema,
        useRecommendedDefaults: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await getOnboardSession().answer(input);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Could not submit onboarding answer.",
        });
      }
    }),

  openAppPasswordUrl: protectedProcedure.mutation(async () => {
    return getOnboardSession().openAppPasswordUrl();
  }),

  cancel: protectedProcedure.mutation(async () => {
    return getOnboardSession().cancel();
  }),
});
