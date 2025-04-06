import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { TRPCError } from '@trpc/server';
import { createClient } from '@/supabase/server';
import { emailsRouter } from './emails';


const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

const getGmail = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  const data = await response.json();

  const messageId = data.messages[0].id;

  const messageResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const messageData = await messageResponse.json();

  return messageData;
}

export const appRouter = createTRPCRouter({
  hello: protectedProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),
    getMyFirstEmail: protectedProcedure
    .query(async () => {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const gmail = await getGmail(session?.provider_token || '');

      return gmail;
    }),
    // Merge the emails router
    emails: emailsRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;