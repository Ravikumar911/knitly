import { createTRPCRouter } from '../init';
import { emailsRouter } from './emails';


export const appRouter = createTRPCRouter({
    // Merge the emails router
    emails: emailsRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;