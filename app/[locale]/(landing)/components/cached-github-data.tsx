import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StarIcon } from "lucide-react";
import { ContributionGraph } from "./contribution-graph";
import {
  GITHUB_DATA_CACHE_TAG,
  loadGithubData,
  type GithubData,
} from "../actions/github-data";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { GITHUB_REPO_NAME, GITHUB_REPO_URL } from "@/lib/github-repo";
import { getAllPostMetadata } from "@/lib/mdx";

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
};

export function GithubCardSkeleton() {
  return (
    <Card className="w-full h-full border border-border bg-card p-3 md:p-4 lg:p-6">
      <CardHeader className="border-b border-border pb-3 md:pb-4 mb-3 md:mb-4">
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex flex-wrap gap-3 md:gap-4 mb-4 md:mb-6">
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} className="h-4 w-16" />
          ))}
        </div>
        <Skeleton className="h-[120px] w-full mb-4" />
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

function GithubStatsCard({
  repoData,
  githubStats,
  stars,
  lastCommit,
  starLabel,
  changelogEntries,
}: GithubData & {
  starLabel: string;
  changelogEntries: Array<{
    slug: string;
    title: string;
    date: string;
  }>;
}) {
  return (
    <Card className="w-full h-full border border-border bg-card p-3 md:p-4 lg:p-6">
      <CardHeader className="mb-3 flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border pb-3 md:mb-4 md:pb-4">
        <CardTitle className="font-medium text-base md:text-lg lg:text-xl text-primary">
          {repoData?.name ?? GITHUB_REPO_NAME}
        </CardTitle>
        <a
          href={GITHUB_REPO_URL}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:text-sm"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>
            {starLabel} - {Intl.NumberFormat("en").format(stars)}
          </span>
          <StarIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </a>
      </CardHeader>
      <CardContent>
        <div className="min-w-0">
          <ContributionGraph
            data={githubStats.contributionGraph}
            changelogEntries={changelogEntries}
          />
          <p className="text-muted-foreground text-xs md:text-sm mt-2">
            Last commit{" "}
            {formatTimeAgo(
              lastCommit?.commit.committer.date || new Date().toISOString(),
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function GithubStatsFallback({ starLabel }: { starLabel: string }) {
  return (
    <Card className="w-full h-full border border-border bg-card p-3 md:p-4 lg:p-6">
      <CardHeader className="mb-3 flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border pb-3 md:mb-4 md:pb-4">
        <CardTitle className="font-medium text-base md:text-lg lg:text-xl text-primary">
          {GITHUB_REPO_NAME}
        </CardTitle>
        <a
          href={GITHUB_REPO_URL}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>{starLabel}</span>
          <StarIcon className="h-3.5 w-3.5" />
        </a>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          GitHub stats are temporarily unavailable.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Per-locale cached GitHub card UI (Cache Components).
 *
 * Same shape as `CachedConnectionsPage`:
 * - Cold `'use cache'` → parent Suspense skeleton
 * - Warm `'use cache'` → card included without a request-time dynamic hole
 *
 * `starLabel` / `locale` are passed in from outside so request-bound i18n
 * stays out of the cache scope.
 */
async function CachedGithubCard({
  starLabel,
  locale,
}: {
  starLabel: string;
  locale: string;
}) {
  "use cache";
  cacheTag(GITHUB_DATA_CACHE_TAG);
  // Daily revalidate: commit graph / stars should pick up near-daily pushes.
  // Profile: stale 5m · revalidate 1 day · expire 1 week.
  cacheLife("days");

  try {
    const [githubData, posts] = await Promise.all([
      loadGithubData(),
      getAllPostMetadata(locale),
    ]);

    const changelogEntries = posts
      .filter((post) => post.meta.status === "completed")
      .map((post) => ({
        slug: post.slug,
        title: String(post.meta.title),
        date: String(post.meta.date),
      }));

    return (
      <GithubStatsCard
        {...githubData}
        starLabel={starLabel}
        changelogEntries={changelogEntries}
      />
    );
  } catch (error) {
    console.error("[CachedGithubData] Failed to load GitHub stats:", error);
    return <GithubStatsFallback starLabel={starLabel} />;
  }
}

/**
 * Landing GitHub card entry (mirrors Connections `ConnectionsPageContent`).
 *
 * `connection()` runs only during `next build` so static generation does not
 * paginate GitHub inside the 60s budget. At runtime we never call it — warm
 * `'use cache'` is served without holding the HTML stream open.
 */
export async function CachedGithubData({
  starLabel,
  locale,
}: {
  starLabel: string;
  locale: string;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    await connection();
  }

  return <CachedGithubCard starLabel={starLabel} locale={locale} />;
}
