import { Suspense } from "react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { WeeklyRecapProvider } from "../../components/weekly-stats/weekly-recap-context"
import { WeeklyRecapPreview } from "../../components/weekly-stats/weekly-recap-preview"

function PreviewCard() {
  return (
    <Card className="w-full max-w-[1200px] mx-auto">
      <WeeklyRecapPreview />
    </Card>
  )
}

export default function WeeklyRecapPage() {
  return (
    <WeeklyRecapProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Recap Preview</h1>
          <p className="text-muted-foreground">
            Preview and customize the weekly recap email that will be sent to traders.
          </p>
        </div>
        <Suspense fallback={<Skeleton className="w-full h-[600px]" />}>
          <PreviewCard />
        </Suspense>
      </div>
    </WeeklyRecapProvider>
  )
}
