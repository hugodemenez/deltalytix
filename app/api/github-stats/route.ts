import { NextRequest, NextResponse } from "next/server";
import { getCachedGithubStatsPayload } from "@/app/[locale]/(landing)/actions/github-data";

const LOCALES = new Set(["en", "fr"]);

/**
 * Public landing GitHub card payload.
 * Fetched client-side after paint so `/en` HTML can finish as a static document
 * without a Suspense/streaming hole for commit-graph work.
 */
export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get("locale") ?? "en";
  const locale = LOCALES.has(localeParam) ? localeParam : "en";

  try {
    const payload = await getCachedGithubStatsPayload(locale);

    return NextResponse.json(payload, {
      headers: {
        // CDN primary: edge can serve without invoking the function.
        // Align with daily data-cache revalidate (stale-while-revalidate up to a week).
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        "Vercel-CDN-Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("[api/github-stats] Failed to load GitHub stats:", error);
    return NextResponse.json(
      { error: "GitHub stats unavailable" },
      { status: 503 },
    );
  }
}
