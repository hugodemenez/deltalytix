import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function WeeklyRecapLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-4 w-[500px] mt-2" />
      </div>
      <Card className="w-full max-w-[800px] mx-auto">
        <div className="p-6 space-y-6">
          <Skeleton className="h-[600px]" />
        </div>
      </Card>
    </div>
  )
} 