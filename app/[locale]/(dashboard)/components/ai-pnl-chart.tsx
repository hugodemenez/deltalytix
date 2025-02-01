'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserData } from '@/components/context/user-data';

interface AIPNLChartProps {
  instrument: string;
  accountNumber: string;
  date: string;
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const positiveColor = "hsl(var(--chart-2))" // Green color
const negativeColor = "hsl(var(--chart-1))" // Orangish color

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background p-2 border rounded shadow-sm">
        <p className="font-semibold">{label}</p>
        <p className={`font-bold ${payload[0].value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          PnL: {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function AIPNLChart({ instrument, accountNumber, date }: AIPNLChartProps) {
  const { formattedTrades } = useUserData();

  const relevantTrades = formattedTrades.filter(trade => 
    trade.instrument === instrument &&
    trade.accountNumber === accountNumber &&
    new Date(trade.entryDate).toDateString() === new Date(date).toDateString()
  );

  const chartData = relevantTrades.map((trade, index) => ({
    tradeNumber: index + 1,
    time: new Date(trade.entryDate).toLocaleTimeString(),
    pnl: trade.pnl
  }));

  const getBarColor = (pnl: number) => pnl >= 0 ? positiveColor : negativeColor;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{`${instrument} PnL Chart for ${date} (Account: ${accountNumber})`}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tradeNumber" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.pnl)}
                  className="transition-all duration-300 ease-in-out"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}