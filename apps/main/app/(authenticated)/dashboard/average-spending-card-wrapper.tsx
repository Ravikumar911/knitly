'use client';

import { SpendingCard } from "@/components/spending-card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function AverageSpendingCardWrapper() {
  const trpc = useTRPC();
  const { data: averageSpending } = useSuspenseQuery(
    trpc.transactions.getAverageMonthlySpending.queryOptions()
  );
 
  return (
    <SpendingCard 
      totalSpending={averageSpending} 
      title="Average Monthly"
      subtitle="Average spending per month"
    />
  );
} 