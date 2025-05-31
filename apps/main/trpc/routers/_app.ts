import { createTRPCRouter } from '../init';
import { emailsRouter } from './emails';

export const appRouter = createTRPCRouter({
    // Merge the routers
    emails: emailsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;