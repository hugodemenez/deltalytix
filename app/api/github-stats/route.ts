import { NextRequest, NextResponse } from "next/server";
import { getGithubData } from "@/app/[locale]/(landing)/actions/github-data";
import { getAllPostMetadata } from "@/lib/mdx";

const LOCALES = new Set(["en", "fr"]);

/**
 * Public landing-page GitHub card payload.
 * Fetched client-side so the homepage HTML can finish without waiting on
 * GitHub / commit-graph work (see CachedGithubData).
 */
export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get("locale") ?? "en";
  const locale = LOCALES.has(localeParam) ? localeParam : "en";

  try {
    const [githubData, posts] = await Promise.all([
      getGithubData(),
      getAllPostMetadata(locale),
    ]);

    const changelogEntries = posts
      .filter((post) => post.meta.status === "completed")
      .map((post) => ({
        slug: post.slug,
        title: String(post.meta.title),
        date: String(post.meta.date),
      }));

    return NextResponse.json(
      {
        repoData: githubData.repoData,
        githubStats: githubData.githubStats,
        stars: githubData.stars,
        lastCommit: githubData.lastCommit,
        changelogEntries,
      },
      {
        headers: {
          // Match the weekly GitHub cache; allow CDN/browser reuse.
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=604800",
        },
      },
    );
  } catch (error) {
    console.error("[api/github-stats] Failed to load GitHub stats:", error);
    return NextResponse.json(
      { error: "GitHub stats unavailable" },
      { status: 503 },
    );
  }
}
