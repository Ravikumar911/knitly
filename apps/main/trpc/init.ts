import { createClient } from '@/supabase/server';
import { initTRPC } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { cache } from 'react';
import { LOCAL_MODE, LOCAL_USER_ID } from '@/lib/local-mode';

export interface Context {
  userId: string | null;
}

export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  if (LOCAL_MODE) {
    return {
      userId: LOCAL_USER_ID,
    } satisfies Context;
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return {
      userId: user?.id ?? null
    } satisfies Context;
  } catch (error) {
    console.error('tRPC context creation error:', error);
    return {
      userId: null
    } satisfies Context;
  }
});

const t = initTRPC.context<Context>().create({});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});
