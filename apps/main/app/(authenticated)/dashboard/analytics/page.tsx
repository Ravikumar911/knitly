import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { AnalyticsOverview } from "@/components/analytics/overview";
import { AnalyticsBehavior } from "@/components/analytics/behavior";
import { AnalyticsInsights } from "@/components/analytics/insights";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { AnalyticsContent } from "@/components/analytics/analytics-content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

// Loading placeholder component
function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-1" />
              <Skeleton className="h-3 w-[80px]" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[200px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-3 w-[80px]" />
                  </div>
                  <Skeleton className="h-4 w-[60px]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Swiggy Analytics</h2>
        <div className="flex items-center space-x-2">
          <DateRangePicker />
        </div>
      </div>
      
      <HydrateClient>
        <Suspense fallback={<AnalyticsLoading />}>
          <AnalyticsContent />
        </Suspense>
      </HydrateClient>
    </div>
  );
} 