import { createTRPCRouter } from '../init';
import { emailsRouter } from './emails';
import { emailExtractionPatternsRouter } from './emailExtractionPatterns';
import { attachmentsRouter } from './attachments';

export const appRouter = createTRPCRouter({
    // Merge the routers
    emails: emailsRouter,
    emailExtractionPatterns: emailExtractionPatternsRouter,
    attachments: attachmentsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;