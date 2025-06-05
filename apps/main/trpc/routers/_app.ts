import { createTRPCRouter } from '../init';
import { emailsRouter } from './emails';
import { analyticsRouter } from './analytics';
import { transactionsRouter } from './transactions';

export const appRouter = createTRPCRouter({
    // Merge the routers
    emails: emailsRouter,
    analytics: analyticsRouter,
    transactions: transactionsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;