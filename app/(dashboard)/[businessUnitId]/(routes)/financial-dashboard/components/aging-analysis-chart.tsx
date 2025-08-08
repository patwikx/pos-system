"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatter } from '@/lib/utils';

interface AgingAnalysisChartProps {
  data: Array<{
    period: string;
    amount: number;
  }>;
  type: 'receivables' | 'payables';
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AgingAnalysisChart({ data, type }: AgingAnalysisChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.period}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            Amount: {formatter.format(data.amount)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="amount"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm">{item.period}</span>
            </div>
            <span className="text-sm font-medium">{formatter.format(item.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}