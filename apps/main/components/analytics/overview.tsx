"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { IndianRupee, ShoppingCart, TrendingUp, Utensils } from "lucide-react";
import { useTransactionFilters } from "@/store/transaction-filters";
import { useMemo } from "react";
import { DateRangePicker } from "./date-range-picker";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@workspace/ui/components/chart";
import { PieChart, Pie, Cell } from "recharts";

// Stable fallback dates to prevent cache invalidation
const FALLBACK_END_DATE = new Date();
const FALLBACK_START_DATE = new Date(FALLBACK_END_DATE.getTime() - 30 * 24 * 60 * 60 * 1000);

// Chart configuration
const ORDER_BREAKDOWN_CHART_CONFIG = {
  food: {
    label: "Food Delivery",
    color: "var(--chart-1)",
  },
  instamart: {
    label: "Uber Eats",
    color: "var(--chart-2)",
  },
  dineout: {
    label: "DoorDash",
    color: "var(--chart-3)",
  },
} as const;

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-lg font-medium">Core Spending Overview</h3>
          <p className="text-sm text-muted-foreground">
            Your DoorDash and Uber Eats spending summary for the selected period
          </p>
        </div>
        <DateRangePicker className="w-full sm:w-auto" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <span>Uber Eats</span>
                <span className="font-medium">{formatCurrency(overview.serviceBreakdown.instamart)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>DoorDash</span>
                <span className="font-medium">{formatCurrency(overview.serviceBreakdown.dineout)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Three Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Top Restaurants */}
        <Card>
          <CardHeader>
            <CardTitle>Top Restaurants</CardTitle>
            <CardDescription>
              Restaurants where you&apos;ve spent the most (excludes groceries)
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

        {/* Orders by Service */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Service</CardTitle>
            <CardDescription>
              Your order distribution across DoorDash and Uber Eats
            </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="w-full">
                <ChartContainer
                  config={ORDER_BREAKDOWN_CHART_CONFIG}
                  className="h-[200px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={[
                        { name: "food", value: overview.orderBreakdown.food },
                        { name: "instamart", value: overview.orderBreakdown.instamart },
                        { name: "dineout", value: overview.orderBreakdown.dineout },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      <Cell fill="var(--color-food)" />
                      <Cell fill="var(--color-instamart)" />
                      <Cell fill="var(--color-dineout)" />
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => [
                            `${value} orders `,
                            typeof name === "string" 
                              ? (name === "food" ? "Food Delivery" : name.charAt(0).toUpperCase() + name.slice(1))
                              : String(name)
                          ]}
                        />
                      }
                    />
                    <ChartLegend
                      content={
                        <ChartLegendContent
                          payload={[
                            { value: "Food Delivery", color: "var(--color-food)" },
                            { value: "Uber Eats", color: "var(--color-instamart)" },
                            { value: "DoorDash", color: "var(--color-dineout)" },
                          ]}
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
              </div>
          </CardContent>
        </Card>

        {/* Top Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top Order Items</CardTitle>
            <CardDescription>
              Most frequently extracted items from your receipts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.topInstamartItems.length > 0 ? (
              <div className="space-y-4">
                {overview.topInstamartItems.map((item: { name: string; count: number; amount: number }, index: number) => (
                  <div key={item.name} className="flex items-center space-x-4">
                    <Badge variant="secondary" className="min-w-[24px] h-6 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.count} items
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  No provider-specific item data found
                </p>
                <p className="text-xs text-muted-foreground">
                  Order detail extraction will populate this section as more receipts are parsed
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 