"use client";
import { AnalyticsOverview } from "./overview";
import { AnalyticsBehavior } from "./behavior";
import { AnalyticsInsights } from "./insights";

export function AnalyticsContent() {
  return (
    <div className="space-y-4 px-4 pb-4">
      {/* Core Spending Overview */}
      <AnalyticsOverview />
      
      {/* Behavioral Insights and Smart Insights */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AnalyticsBehavior />
        <AnalyticsInsights />
      </div>
    </div>
  );
} 