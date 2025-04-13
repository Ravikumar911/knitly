'use client';

import { SpendingCard } from "@/components/spending-card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function DailySpendingCardWrapper() {
  const trpc = useTRPC();
  const { data: averageSpending = 0 } = useSuspenseQuery(
    trpc.transactions.getAverageDailySpending.queryOptions()
  );

  return (
    <SpendingCard 
      totalSpending={averageSpending} 
      title="Average Daily"
      subtitle="Average spending per day"
    />
  );
} 