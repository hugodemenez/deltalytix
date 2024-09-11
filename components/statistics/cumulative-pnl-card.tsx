import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PiggyBank } from "lucide-react"

export default function CumulativePnlCard({ cumulativePnl, cumulativeFees }: { cumulativePnl: number, cumulativeFees: number }) {
  return (
    <Card className="sm:col-span-2 lg:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Cumulative PnL</CardTitle>
        <PiggyBank className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${(cumulativePnl - cumulativeFees).toFixed(2)}</div>
      </CardContent>
    </Card>
  )
}