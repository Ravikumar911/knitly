import { createClient } from '@/supabase/server';
import { initTRPC } from '@trpc/server';
import { cache } from 'react';
import { TRPCError } from '@trpc/server';

export interface Context {
  userId: string | null;
}

export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  return { 
    userId: user?.id ?? null 
  } satisfies Context;
});

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<Context>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  // transformer: superjson,
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});