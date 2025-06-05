import { createClient } from '@/supabase/server';
import { initTRPC } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { cache } from 'react';

export interface Context {
  userId: string | null;
}

export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('tRPC context - Supabase auth error:', error);
    }
    
    if (!user) {
      console.log('tRPC context - No user found in session');
    } else {
      console.log('tRPC context - User found:', user.id);
    }
    
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
    console.log('protectedProcedure - No userId, throwing UNAUTHORIZED');
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});