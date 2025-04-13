'use client';

import { SpendingCard } from "@/components/spending-card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function SpendingCardWrapper() {
  const trpc = useTRPC();
  const { data: totalSpending } = useSuspenseQuery(trpc.transactions.getTotalSpending.queryOptions());

  return (
    <SpendingCard 
      totalSpending={totalSpending} 
      subtitle="Total spending across all transactions"
    />
  );
} 