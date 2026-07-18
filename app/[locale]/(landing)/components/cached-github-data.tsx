"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StarIcon } from "lucide-react";
import { ContributionGraph } from "./contribution-graph";
import { GITHUB_REPO_NAME, GITHUB_REPO_URL } from "@/lib/github-repo";
import type { ContributionGraphData } from "@/lib/contribution-graph";

/** Mirrors `GithubStatsPayload` without importing the server data module. */
type GithubStatsPayload = {
  repoData: {
    name: string;
    description: string;
    language: string;
    license: { spdx_id: string } | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    created_at: string;
  };
  githubStats: {
    repository: {
      stargazers: { totalCount: number };
      forks: { totalCount: number };
      commits: { history: { totalCount: number } };
    };
    contributionGraph: ContributionGraphData;
  };
  stars: number;
  lastCommit: {
    commit: {
      committer: {
        date: string;
      };
    };
  };
  changelogEntries: Array<{
    slug: string;
    title: string;
    date: string;
  }>;
};

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

function GithubCardSkeleton() {
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
}: GithubStatsPayload & { starLabel: string }) {
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
 * Landing GitHub card: SSR/client initial paint is a static skeleton only.
 * Stats load after paint from `/api/github-stats` so homepage HTML never waits
 * on GitHub commit pagination (no server Suspense streaming hole).
 */
export function CachedGithubData({
  starLabel,
  locale,
}: {
  starLabel: string;
  locale: string;
}) {
  const [data, setData] = useState<GithubStatsPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/github-stats?locale=${encodeURIComponent(locale)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`GitHub stats HTTP ${response.status}`);
        }
        return (await response.json()) as GithubStatsPayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((error: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        console.error("[CachedGithubData] Failed to load GitHub stats:", error);
        setFailed(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [locale]);

  if (failed) return <GithubStatsFallback starLabel={starLabel} />;
  if (!data) return <GithubCardSkeleton />;

  return <GithubStatsCard {...data} starLabel={starLabel} />;
}
