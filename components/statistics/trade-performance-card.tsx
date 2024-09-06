'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function TradePerformanceCard({ nbWin, nbLoss, nbBe, nbTrades }: { nbWin: number, nbLoss: number, nbBe: number, nbTrades: number }) {
  const winRate = Number((nbWin / nbTrades * 100).toFixed(2))
  const lossRate = Number((nbLoss / nbTrades * 100).toFixed(2))
  const beRate = Number((nbBe / nbTrades * 100).toFixed(2))

  const positiveColor = "hsl(var(--chart-2))" // Green color
  const negativeColor = "hsl(var(--chart-1))" // Orangish color
  const neutralColor = "hsl(var(--muted-foreground))" // Neutral color for breakeven

  const data = [
    { name: 'Win', value: winRate, color: positiveColor },
    { name: 'Loss', value: lossRate, color: negativeColor },
    { name: 'BE', value: beRate, color: neutralColor },
  ]

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Trade Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between h-[140px]">
          <div className="w-[140px] h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      strokeWidth={index === 0 ? 2 : 1}  // Make the winning slice border thicker
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs space-y-2">
            {data.map((entry, index) => (
              <div key={`legend-${index}`} className="flex items-center">
                <div className="w-3 h-3 mr-2" style={{ backgroundColor: entry.color }}></div>
                <span className="font-medium">{entry.name}: {entry.value.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}