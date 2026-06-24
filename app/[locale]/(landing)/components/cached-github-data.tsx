import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StarIcon,
  Circle,
  Scale,
  GitFork,
  Activity,
} from "lucide-react";
import { ChartSSR } from "./chart-ssr";
import { getGithubData } from "../actions/github-data";
import { cacheLife } from "next/cache";
import { GITHUB_REPO_NAME, GITHUB_REPO_URL } from "@/lib/github-repo";

interface GithubStats {
  repository: {
    stargazers: { totalCount: number };
    forks: { totalCount: number };
    commits: { history: { totalCount: number } };
  };
  stats: { value: number; date: Date }[];
}

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

function getValidChartData(stats: GithubStats["stats"] | undefined) {
  if (!stats || stats.length === 0) {
    const now = new Date();
    const fallbackStats: { value: number; date: Date }[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(now.getDate() - i * 7);
      weekDate.setDate(weekDate.getDate() - weekDate.getDay());
      weekDate.setHours(0, 0, 0, 0);

      fallbackStats.push({
        value: i === 6 ? 1 : 0,
        date: new Date(weekDate.getTime()),
      });
    }

    return fallbackStats;
  }
  return stats;
}

function GithubStatsCard({
  repoData,
  githubStats,
  stars,
  lastCommit,
}: {
  repoData: Awaited<ReturnType<typeof getGithubData>>["repoData"];
  githubStats: Awaited<ReturnType<typeof getGithubData>>["githubStats"];
  stars: number;
  lastCommit: Awaited<ReturnType<typeof getGithubData>>["lastCommit"];
}) {
  return (
    <Card className="w-full h-full border border-border bg-card p-3 md:p-4 lg:p-6">
      <CardHeader className="border-b border-border pb-3 md:pb-4 mb-3 md:mb-4">
        <CardTitle className="font-medium text-base md:text-lg lg:text-xl text-primary">
          {repoData?.name ?? GITHUB_REPO_NAME}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
          <div className="flex items-center space-x-1">
            <Circle className="w-3 h-3 md:w-4 md:h-4" />
            <span>{repoData?.language}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Scale className="w-3 h-3 md:w-4 md:h-4" />
            <span>
              {repoData?.license?.spdx_id && repoData.license.spdx_id !== "NOASSERTION"
                ? repoData.license.spdx_id
                : "CC-BY-NC-4.0"}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <StarIcon className="w-3 h-3 md:w-4 md:h-4" />
            <span>
              {Intl.NumberFormat("en", {
                notation: "compact",
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
              }).format(githubStats?.repository.stargazers.totalCount || 0)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <GitFork className="w-3 h-3 md:w-4 md:h-4" />
            <span>
              {Intl.NumberFormat("en", {
                notation: "compact",
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
              }).format(githubStats?.repository.forks.totalCount || 0)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Activity className="w-3 h-3 md:w-4 md:h-4" />
            <span>
              {Intl.NumberFormat("en", {
                notation: "compact",
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
              }).format(
                githubStats?.repository.commits.history.totalCount || 0
              )}
            </span>
          </div>
        </div>
        <div className="pb-6 md:pb-10 mt-6 md:mt-10 h-[100px] md:h-[130px]">
          <ChartSSR data={getValidChartData(githubStats?.stats)} />
          <p className="text-muted-foreground text-xs md:text-sm mt-2 md:mt-4">
            {formatTimeAgo(
              lastCommit?.commit.committer.date || new Date().toISOString()
            )}
          </p>
        </div>
        <a
          href={GITHUB_REPO_URL}
          className="border border-border flex justify-center h-7 md:h-8 leading-[28px] md:leading-[30px] text-muted-foreground mt-3 md:mt-4"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="bg-background pl-2 pr-3 text-xs md:text-sm flex items-center space-x-2 border-r border-border">
            <StarIcon className="w-3 h-3 md:w-4 md:h-4" />
            <span className="font-medium">Star</span>
          </div>
          <div className="px-3 md:px-4 text-xs md:text-sm items-center flex">
            {Intl.NumberFormat("en", {
              notation: "compact",
              minimumFractionDigits: 0,
              maximumFractionDigits: 1,
            }).format(stars)}
          </div>
        </a>
      </CardContent>
    </Card>
  );
}

function GithubStatsFallback() {
  return (
    <Card className="w-full h-full border border-border bg-card p-3 md:p-4 lg:p-6">
      <CardHeader className="border-b border-border pb-3 md:pb-4 mb-3 md:mb-4">
        <CardTitle className="font-medium text-base md:text-lg lg:text-xl text-primary">
          {GITHUB_REPO_NAME}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          GitHub stats are temporarily unavailable.
        </p>
        <a
          href={GITHUB_REPO_URL}
          className="border border-border flex justify-center h-7 md:h-8 leading-[28px] md:leading-[30px] text-muted-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="bg-background pl-2 pr-3 text-xs md:text-sm flex items-center space-x-2 border-r border-border">
            <StarIcon className="w-3 h-3 md:w-4 md:h-4" />
            <span className="font-medium">Star</span>
          </div>
        </a>
      </CardContent>
    </Card>
  );
}

export async function CachedGithubData() {
  "use cache";
  cacheLife("hours");

  try {
    const { repoData, githubStats, stars, lastCommit } = await getGithubData();

    return (
      <GithubStatsCard
        repoData={repoData}
        githubStats={githubStats}
        stars={stars}
        lastCommit={lastCommit}
      />
    );
  } catch (error) {
    console.error("[CachedGithubData] Failed to load GitHub stats:", error);
    return <GithubStatsFallback />;
  }
}
