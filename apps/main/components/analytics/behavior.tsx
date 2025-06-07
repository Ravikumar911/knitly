"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { Calendar, Clock, TrendingDown, Truck } from "lucide-react";
import { useTransactionFilters } from "@/store/transaction-filters";
import { useMemo } from "react";

// Stable fallback dates to prevent cache invalidation
const FALLBACK_END_DATE = new Date();
const FALLBACK_START_DATE = new Date(FALLBACK_END_DATE.getTime() - 30 * 24 * 60 * 60 * 1000);

export function AnalyticsBehavior() {
  const trpc = useTRPC();
  const { startDate, endDate } = useTransactionFilters();

  // Create query options with stable fallback to ensure hook order consistency
  const queryOptions = useMemo(() => {
    if (startDate && endDate) {
      return trpc.analytics.swiggy.behavior.queryOptions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    }
    
    // Use stable fallback dates
    return trpc.analytics.swiggy.behavior.queryOptions({
      startDate: FALLBACK_START_DATE.toISOString(),
      endDate: FALLBACK_END_DATE.toISOString(),
    });
  }, [trpc.analytics.swiggy.behavior, startDate, endDate]);

  // Always call useSuspenseQuery to maintain hook order
  const { data } = useSuspenseQuery(queryOptions);

  const behavior = data.data;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate percentage for weekend vs weekday
  const totalSpending = behavior.weekendVsWeekday.weekend + behavior.weekendVsWeekday.weekday;
  const weekendPercentage = totalSpending > 0 ? (behavior.weekendVsWeekday.weekend / totalSpending) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Behavioral Insights</CardTitle>
        <CardDescription>
          Your ordering patterns and spending habits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekend vs Weekday */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Weekend vs Weekday Spending</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span>Weekend: {formatCurrency(behavior.weekendVsWeekday.weekend)}</span>
              <span>Weekday: {formatCurrency(behavior.weekendVsWeekday.weekday)}</span>
            </div>
            <Progress value={weekendPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              You spend {weekendPercentage.toFixed(0)}% of your Swiggy budget on weekends
            </p>
          </div>
        </div>

        {/* Most Expensive Day */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Most Expensive Day</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-lg px-3 py-1">
              {behavior.mostExpensiveDay}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Your highest average order day
            </span>
          </div>
        </div>

        {/* Delivery Fees */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Average Delivery Fee</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(behavior.avgDeliveryFee)}</div>
          <p className="text-xs text-muted-foreground">
            Per order delivery cost
          </p>
        </div>

        {/* Total Savings */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Total Savings</span>
          </div>
          <div className="text-2xl font-bold text-chart-1">{formatCurrency(behavior.totalSavings)}</div>
          <p className="text-xs text-muted-foreground">
            From discounts and offers
          </p>
        </div>

        {/* Monthly Trend */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Monthly Trend (Last 6 Months)</span>
          </div>
          <div className="space-y-2">
            {behavior.monthlyTrend.slice(-6).map((month: { month: string; spend: number }) => (
              <div key={month.month} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(month.month + '-01').toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
                <span className="font-medium">{formatCurrency(month.spend)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 