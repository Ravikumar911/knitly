'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
} from "@workspace/ui/components/chart";

interface ChartData {
  day: string;
  spending: number;
}

const chartConfig = {
  spending: {
    label: "Daily Spending",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function SpendingByDayChart() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.transactions.getSpendingByDayOfWeek.queryOptions());

  // Format data for the chart
  const chartData = data?.map(day => ({
    day: day.dayName.trim(),
    spending: day.totalSpending,
  })) as ChartData[] | undefined;

  if (!chartData?.length) {
    return null;
  }


  // Calculate highest spending day
  const highestSpendingDay = chartData.reduce((max, current) => 
    current.spending > (max?.spending ?? 0) ? current : max
  , chartData[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Day of Week</CardTitle>
        <CardDescription>Average daily spending pattern</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value: string) => value.slice(0, 3)}
            />
           
            <Bar 
              dataKey="spending"
              fill="var(--color-spending)"
              radius={[8, 8, 0, 0]}
            >
              <LabelList
                dataKey="spending"
                position="top"
                offset={12}
                formatter={(value: number) => `₹${value}`}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="leading-none text-muted-foreground">
          {highestSpendingDay 
            ? `Highest spending on ${highestSpendingDay.day} with ₹${highestSpendingDay.spending}`
            : 'No spending data available'}
        </div>
      </CardFooter>
    </Card>
  );
} 