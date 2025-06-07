"use client";

import { useTransactionFilters } from "@/store/transaction-filters";
import { AnalyticsOverview } from "./overview";
import { AnalyticsBehavior } from "./behavior";
import { AnalyticsInsights } from "./insights";

export function AnalyticsContent() {
  const { startDate, endDate } = useTransactionFilters();

  // Wait for DateRangePicker to initialize the store before rendering analytics
  if (!startDate || !endDate) {
    return <div>Initializing analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Core Spending Overview */}
      <AnalyticsOverview />
      
      {/* Behavioral Insights and Smart Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <AnalyticsBehavior />
        <AnalyticsInsights />
      </div>
    </div>
  );
} 