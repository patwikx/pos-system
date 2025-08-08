"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { formatter } from '@/lib/utils';

interface FinancialChartProps {
  data: Array<{
    month: string;
    revenue: number;
    expenses: number;
  }>;
  type: 'revenue-expenses' | 'profit-loss';
}

export function FinancialChart({ data, type }: FinancialChartProps) {
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

  if (type === 'revenue-expenses') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(value) => formatter.format(value).replace('.00', '')} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
          <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => formatter.format(value).replace('.00', '')} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
        <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
      </LineChart>
    </ResponsiveContainer>
  );
}