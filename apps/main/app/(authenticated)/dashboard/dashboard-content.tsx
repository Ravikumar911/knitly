'use client';

import { SpendingCardWrapper } from "./spending-card-wrapper";
import { AverageSpendingCardWrapper } from "./average-spending-card-wrapper";
import { DailySpendingCardWrapper } from "./daily-spending-card-wrapper";
import { SpendingByDayChart } from "./spending-by-day-chart";
import { EmailSyncStatus } from "@/components/email-sync-status";
import { useTRPC } from "@/trpc/client";
import { Suspense } from "react";

export default function DashboardContent() {
  const trpc = useTRPC();
  const { data: syncStatus, isLoading } = trpc.emails.getSyncStatus.useQuery();

  // If we're still loading, show a loading indicator
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user hasn't synced, only show the email sync status prominently
  if (!syncStatus?.hasSynced) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-8">
        <div className="max-w-2xl mx-auto w-full">
          <h1 className="text-3xl font-bold mb-6 text-center">Welcome to Your Dashboard</h1>
          <p className="text-muted-foreground mb-8 text-center">
            To see your transactions and insights, please sync your emails first.
          </p>
          <EmailSyncStatus />
        </div>
      </div>
    );
  }

  // If user has synced, show the full dashboard
  return (
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
 