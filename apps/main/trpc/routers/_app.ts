import { createTRPCRouter } from '../init';
import { emailsRouter } from './emails';
import { analyticsRouter } from './analytics';
import { transactionsRouter } from './transactions';
import { feedbackRouter } from './feedback';
import { chatRouter } from './chat';

export const appRouter = createTRPCRouter({
    // Merge the routers
    emails: emailsRouter,
    analytics: analyticsRouter,
    transactions: transactionsRouter,
    feedback: feedbackRouter,
    chat: chatRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;