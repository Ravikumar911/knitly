"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { TrendingUp, Clock, MapPin } from "lucide-react";
import { useTransactionFilters } from "@/store/transaction-filters";
import { useMemo } from "react";

// Stable fallback dates to prevent cache invalidation
const FALLBACK_END_DATE = new Date();
const FALLBACK_START_DATE = new Date(FALLBACK_END_DATE.getTime() - 30 * 24 * 60 * 60 * 1000);

export function AnalyticsInsights() {
  const trpc = useTRPC();
  const { startDate, endDate } = useTransactionFilters();

  // Create query options with stable fallback to ensure hook order consistency
  const queryOptions = useMemo(() => {
    if (startDate && endDate) {
      return trpc.analytics.swiggy.insights.queryOptions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    }
    
    // Use stable fallback dates
    return trpc.analytics.swiggy.insights.queryOptions({
      startDate: FALLBACK_START_DATE.toISOString(),
      endDate: FALLBACK_END_DATE.toISOString(),
    });
  }, [trpc.analytics.swiggy.insights, startDate, endDate]);

  // Always call useSuspenseQuery to maintain hook order
  const { data } = useSuspenseQuery(queryOptions);

  const insights = data.data;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format time 
  const formatHour = (hour: number) => {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown Date';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Insights</CardTitle>
        <CardDescription>
          Advanced analytics and spending patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Peak Ordering Hour */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Peak Ordering Hour</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-lg px-3 py-1">
              {formatHour(insights.peakOrderingHour)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Your most active time
            </span>
          </div>
        </div>

        <div className="border-t border-border/40"></div>

        {/* Most Expensive Order */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Most Expensive Order</span>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">{formatCurrency(insights.mostExpensiveOrder.amount)}</div>
            <div className="text-sm text-muted-foreground">
              {insights.mostExpensiveOrder.restaurant}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(insights.mostExpensiveOrder.date)}
            </div>
          </div>
        </div>

        <div className="border-t border-border/40"></div>

        {/* Top Delivery Area */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Top Delivery Area</span>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-semibold">{insights.topDeliveryArea.area}</div>
            <div className="text-sm text-muted-foreground">
              {insights.topDeliveryArea.pincode} • {insights.topDeliveryArea.orderCount} orders
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 