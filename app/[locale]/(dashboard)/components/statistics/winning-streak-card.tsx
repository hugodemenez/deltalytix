import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Award } from "lucide-react"

export default function WinningStreakCard({ winningStreak }: { winningStreak: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Winning Streak</CardTitle>
        <Award className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{winningStreak}</div>
        <p className="text-xs text-muted-foreground">Current streak</p>
      </CardContent>
    </Card>
  )
}