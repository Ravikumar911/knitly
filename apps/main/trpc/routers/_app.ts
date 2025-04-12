import { createTRPCRouter } from '../init';
import { emailsRouter } from './emails';
import { emailExtractionPatternsRouter } from './emailExtractionPatterns';

export const appRouter = createTRPCRouter({
    // Merge the routers
    emails: emailsRouter,
    emailExtractionPatterns: emailExtractionPatternsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;