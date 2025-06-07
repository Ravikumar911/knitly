"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { IndianRupee, ShoppingCart, TrendingUp, Utensils } from "lucide-react";
import { useTransactionFilters } from "@/store/transaction-filters";
import { useMemo } from "react";
import { DateRangePicker } from "./date-range-picker";

// Stable fallback dates to prevent cache invalidation
const FALLBACK_END_DATE = new Date();
const FALLBACK_START_DATE = new Date(FALLBACK_END_DATE.getTime() - 30 * 24 * 60 * 60 * 1000);

export function AnalyticsOverview() {
  const trpc = useTRPC();
  const { startDate, endDate } = useTransactionFilters();

  // Create query options with stable fallback to ensure hook order consistency
  const queryOptions = useMemo(() => {
    if (startDate && endDate) {
      return trpc.analytics.swiggy.overview.queryOptions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    }

    // Use stable fallback dates
    return trpc.analytics.swiggy.overview.queryOptions({
      startDate: FALLBACK_START_DATE.toISOString(),
      endDate: FALLBACK_END_DATE.toISOString(),
    });
  }, [trpc.analytics.swiggy.overview, startDate, endDate]);

  // Always call useSuspenseQuery to maintain hook order
  const { data } = useSuspenseQuery(queryOptions);

  const overview = data.data;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">Core Spending Overview</h3>
          <p className="text-sm text-muted-foreground">
            Your Swiggy spending summary for the selected period
          </p>
        </div>
        <DateRangePicker />
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview.totalSpend)}</div>
            <p className="text-xs text-muted-foreground">
              Across all services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.orderCount}</div>
            <p className="text-xs text-muted-foreground">
              Orders placed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview.avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Per order
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Split</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>Food</span>
                <span className="font-medium">{formatCurrency(overview.serviceBreakdown.food)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Instamart</span>
                <span className="font-medium">{formatCurrency(overview.serviceBreakdown.instamart)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Dineout</span>
                <span className="font-medium">{formatCurrency(overview.serviceBreakdown.dineout)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Restaurants */}
      <Card>
        <CardHeader>
          <CardTitle>Top Restaurants</CardTitle>
          <CardDescription>
            Your most ordered restaurants by total spend
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overview.topRestaurants.map((restaurant: { name: string; orders: number; spend: number }, index: number) => (
              <div key={restaurant.name} className="flex items-center space-x-4">
                <Badge variant="secondary" className="min-w-[24px] h-6 flex items-center justify-center">
                  {index + 1}
                </Badge>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {restaurant.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {restaurant.orders} orders
                  </p>
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(restaurant.spend)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 