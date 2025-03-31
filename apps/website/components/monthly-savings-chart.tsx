"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface MonthlySavingsData {
  month: string
  savings: number
}

interface MonthlySavingsChartProps {
  data: MonthlySavingsData[]
}

export function MonthlySavingsChart({ data }: MonthlySavingsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="savings" 
                stroke="rgb(75, 192, 192)" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 