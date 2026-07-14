import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarIcon } from "lucide-react";
import { ContributionGraph } from "./contribution-graph";
import { getGithubData } from "../actions/github-data";
import { cacheLife } from "next/cache";
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

function GithubStatsCard({
  repoData,
  githubStats,
  stars,
  lastCommit,
  starLabel,
  changelogEntries,
}: {
  repoData: Awaited<ReturnType<typeof getGithubData>>["repoData"];
  githubStats: Awaited<ReturnType<typeof getGithubData>>["githubStats"];
  stars: number;
  lastCommit: Awaited<ReturnType<typeof getGithubData>>["lastCommit"];
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

export async function CachedGithubData({
  starLabel,
  locale,
}: {
  starLabel: string;
  locale: string;
}) {
  "use cache";
  cacheLife("weeks");

  let githubData: Awaited<ReturnType<typeof getGithubData>>;
  let posts: Awaited<ReturnType<typeof getAllPostMetadata>>;

  try {
    [githubData, posts] = await Promise.all([
      getGithubData(),
      getAllPostMetadata(locale),
    ]);
  } catch (error) {
    console.error("[CachedGithubData] Failed to load GitHub stats:", error);
    return <GithubStatsFallback starLabel={starLabel} />;
  }

  const changelogEntries = posts
    .filter((post) => post.meta.status === "completed")
    .map((post) => ({
      slug: post.slug,
      title: String(post.meta.title),
      date: String(post.meta.date),
    }));

  return (
    <GithubStatsCard
      repoData={githubData.repoData}
      githubStats={githubData.githubStats}
      stars={githubData.stars}
      lastCommit={githubData.lastCommit}
      starLabel={starLabel}
      changelogEntries={changelogEntries}
    />
  );
}
