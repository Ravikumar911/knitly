"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@workspace/ui/components/chart";
import { Calendar, Clock, Truck } from "lucide-react";
import { useTransactionFilters } from "@/store/transaction-filters";
import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

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

  // Chart configuration for day-wise spending
  const chartConfig = {
    spend: {
      label: "Spending",
      color: "var(--chart-1)",
    },
  };

  // Prepare chart data with short day names - add safety check
  const chartData = behavior.dayWiseSpending?.map(day => ({
    day: day.day.substring(0, 3), // Convert to Mon, Tue, Wed format
    spend: day.spend,
    fullDay: day.day,
    orders: day.orders,
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Behavioral Insights</CardTitle>
        <CardDescription>
          Your ordering patterns and spending habits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Day-wise Spending Chart */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Day-wise Spending</span>
          </div>
          {chartData.length > 0 ? (
            <>
              <ChartContainer config={chartConfig} className="h-[200px]">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="day" 
                    tickLine={false}
                    axisLine={false}
                    className="text-xs"
                  />
                  <YAxis hide />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [
                          formatCurrency(Number(value)),
                          "Spending"
                        ]}
                        labelFormatter={(label) => {
                          const dayData = chartData.find(d => d.day === label);
                          return `${dayData?.fullDay} • ${dayData?.orders} orders`;
                        }}
                      />
                    }
                  />
                  <Bar 
                    dataKey="spend" 
                    fill="var(--color-spend)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
              <p className="text-xs text-muted-foreground">
                Your spending pattern across days of the week
              </p>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <p>No day-wise spending data available</p>
            </div>
          )}
        </div>

        <div className="border-t border-border/40"></div>

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

        <div className="border-t border-border/40"></div>

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

        <div className="border-t border-border/40"></div>

        {/* Monthly Trend */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
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