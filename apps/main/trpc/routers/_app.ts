import { createTRPCRouter } from "../init";
import { emailsRouter } from "./emails";
import { analyticsRouter } from "./analytics";
import { transactionsRouter } from "./transactions";
import { feedbackRouter } from "./feedback";
import { chatRouter } from "./chat";
import { onboardRouter } from "./onboard";

export const appRouter = createTRPCRouter({
  // Merge the routers
  emails: emailsRouter,
  analytics: analyticsRouter,
  transactions: transactionsRouter,
  feedback: feedbackRouter,
  chat: chatRouter,
  onboard: onboardRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
