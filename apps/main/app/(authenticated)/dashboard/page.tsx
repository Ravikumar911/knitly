import { SpendingCardWrapper } from "./spending-card-wrapper";
import { AverageSpendingCardWrapper } from "./average-spending-card-wrapper";
import { DailySpendingCardWrapper } from "./daily-spending-card-wrapper";
import { SpendingByDayChart } from "./spending-by-day-chart";
import { EmailSyncStatus } from "@/components/email-sync-status";
import { prefetch, HydrateClient } from "@/trpc/server";
import { trpc } from "@/trpc/server";
import { Suspense } from "react";

export default function Page() {
  // Prefetch the data
  prefetch(trpc.transactions.getTotalSpending.queryOptions());
  prefetch(trpc.transactions.getAverageMonthlySpending.queryOptions());
  prefetch(trpc.transactions.getAverageDailySpending.queryOptions());
  prefetch(trpc.transactions.getSpendingByDayOfWeek.queryOptions());
  prefetch(trpc.emails.getSyncStatus.queryOptions());

  return (
    <HydrateClient>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid grid-rows-1 gap-4 md:grid-cols-4">
          <Suspense
            fallback={
              <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
            }
          >
            <SpendingCardWrapper />
          </Suspense>
          <Suspense
            fallback={
              <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
            }
          >
            <AverageSpendingCardWrapper />
          </Suspense>
          <Suspense
            fallback={
              <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
            }
          >
            <DailySpendingCardWrapper />
          </Suspense>
          <Suspense
            fallback={
              <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
            }
          >
            <EmailSyncStatus />
          </Suspense>
        </div>
        <div className="grid grid-rows-1 gap-4 md:grid-cols-4 ">
          <Suspense
            fallback={
              <div className="bg-muted/50 h-[400px] rounded-xl animate-pulse col-span-2" />
            }
          >
            <div className="col-span-2 md:col-span-2 sm:col-span-4">
              <SpendingByDayChart />
            </div>
          </Suspense>
        </div>
      </div>
    </HydrateClient>
  );
}
