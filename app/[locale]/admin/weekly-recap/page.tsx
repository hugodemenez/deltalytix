import { WeeklyRecapProvider } from "../components/weekly-stats/weekly-recap-context"
import { WeeklyRecapPreview } from "../components/weekly-stats/weekly-recap-preview"

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
      <WeeklyRecapPreview />
      </div>
    </WeeklyRecapProvider>
  )
}
