"use client"

import React from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatter } from "@/lib/utils"
import { useCurrentUser } from "@/lib/current-user"

// This is the shape of your original data passed to the chart
interface RevenueData {
  name: string
  total: number
}

// This is the shape of the component's main props
interface OverviewProps {
  data: RevenueData[]
}

// --- THIS IS THE FIX ---

// 1. Define the specific shape of a single item inside the `payload` array from Recharts
interface TooltipPayload {
  value: number;
  payload: RevenueData; // The original data object for this bar
}

// 2. Create the props interface for our custom tooltip, using the specific payload type
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[]; // Use the specific, typed array instead of `any[]`
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2 items-center">
          <div className="font-medium text-sm text-muted-foreground">{label}</div>
          <div className="font-bold text-right">
            {formatter.format(value)}
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function Overview({ data }: OverviewProps) {
  // Calculate the total revenue for the year
  const totalRevenue = data.reduce((sum, item) => sum + item.total, 0)

  // Find the last two months with non-zero revenue
  const nonZeroMonths = data.filter(item => item.total > 0)
  const currentMonthData = nonZeroMonths[nonZeroMonths.length - 1]
  const previousMonthData = nonZeroMonths[nonZeroMonths.length - 2]
  
  const currentMonth = currentMonthData?.total || 0;
  const previousMonth = previousMonthData?.total || 0;

  // Only calculate trend percentage if previousMonth has a value
  const trendPercentage = previousMonth 
    ? ((currentMonth - previousMonth) / previousMonth) * 100 
    : (currentMonth > 0 ? 100 : 0); 

  // Determine if the trend is up or down
  const isTrendingUp = currentMonth >= previousMonth

  const user = useCurrentUser();

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Revenue Overview</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {/* Dynamic Year */}
              Monthly revenue breakdown for {new Date().getFullYear()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Only show trend if there's a previous month to compare to */}
            {previousMonthData && (
              <div className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                isTrendingUp ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'
              }`}>
                {isTrendingUp ? (
                  <TrendingUp className="mr-1 h-4 w-4" />
                ) : (
                  <TrendingDown className="mr-1 h-4 w-4" />
                )}
                {trendPercentage.toFixed(1)}%
              </div>
            )}
             <div className="rounded-lg bg-primary/10 p-2">
               <DollarSign className="h-5 w-5 text-primary" />
             </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-bold tracking-tight">
            {formatter.format(totalRevenue)}
          </div>
          <div className="text-sm text-muted-foreground">
            Total revenue this year
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                // Removes cents for a cleaner axis look, e.g., "$1,234"
                tickFormatter={(value) => `${formatter.format(value).split('.')[0]}`}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
              />
              <Bar
                dataKey="total"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}