"use client";
import { AnalyticsOverview } from "./overview";

export function AnalyticsContent() {
  return (
    <div className="space-y-4 px-4 pb-4">
      {/* Core Spending Overview */}
      <AnalyticsOverview />
    </div>
  );
} 