import { NextRequest, NextResponse } from "next/server"
import { fetchGithubStatsPayload } from "@/app/[locale]/(landing)/actions/github-data"

/**
 * JSON endpoint for the landing GitHub card.
 *
 * Prefer this over the `fetchGithubStatsPayload` server action for client-side
 * loads: Instant Navigations / HMR / mid-navigation redirects often return
 * HTML for action POSTs (`An unexpected response was received from the server`),
 * while a plain GET stays a stable JSON contract.
 */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "en"

  try {
    const data = await fetchGithubStatsPayload(locale)
    return NextResponse.json(data)
  } catch (error) {
    console.warn("[github-stats] failed to load", error)
    return NextResponse.json(
      { error: "GITHUB_STATS_UNAVAILABLE" },
      { status: 503 },
    )
  }
}
