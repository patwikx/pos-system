"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatter } from '@/lib/utils';

interface CashFlowChartProps {
  data: Array<{
    month: string;
    inflow: number;
    outflow: number;
    net: number;
  }>;
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatter.format(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => formatter.format(value).replace('.00', '')} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="inflow" 
          stackId="1"
          stroke="#10b981" 
          fill="#10b981" 
          fillOpacity={0.6}
          name="Cash Inflow" 
        />
        <Area 
          type="monotone" 
          dataKey="outflow" 
          stackId="2"
          stroke="#ef4444" 
          fill="#ef4444" 
          fillOpacity={0.6}
          name="Cash Outflow" 
        />
        <Area 
          type="monotone" 
          dataKey="net" 
          stroke="#3b82f6" 
          fill="#3b82f6" 
          fillOpacity={0.3}
          name="Net Cash Flow" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}