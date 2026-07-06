import { Loader2 } from "lucide-react"

export function RouteLoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center" role="status">
      <Loader2
        className="h-8 w-8 animate-spin text-foreground/60"
        aria-hidden
      />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
