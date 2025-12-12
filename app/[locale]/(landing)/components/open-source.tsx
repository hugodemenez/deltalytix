import React, { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  GitBranchIcon,
  UsersIcon,
  BookOpenIcon,
  StarIcon,
  Circle,
  Scale,
  GitFork,
  Activity,
} from "lucide-react";
import { ChartSSR } from "./chart-ssr";
import Link from "next/link";
import { getGithubData } from "../actions/github-data";
import { Skeleton } from "@/components/ui/skeleton";
import { getI18n } from "@/locales/server";
import { cacheLife } from "next/cache";

const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER || "default_owner";
const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME || "default_repo";

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

async function CachedGithubData() {
  'use cache'
  cacheLife('hours')

  const { repoData, githubStats, stars, lastCommit } = await getGithubData();
  // Add this function to ensure we always have valid data for the chart
  const getValidChartData = (stats: GithubStats["stats"] | undefined) => {
    if (!stats || stats.length === 0) {
      // Return a default 12-week dataset (like the original)
      const now = new Date();
      const fallbackStats: { value: number; date: Date }[] = [];

      for (let i = 11; i >= 0; i--) {
        const weekDate = new Date(now);
        weekDate.setDate(now.getDate() - i * 7);
        weekDate.setDate(weekDate.getDate() - weekDate.getDay()); // Start of week
        weekDate.setHours(0, 0, 0, 0);

        fallbackStats.push({
          value: i === 6 ? 1 : 0, // Small spike in the middle
          date: new Date(weekDate.getTime()),
        });
      }

      return fallbackStats;
    }
    return stats;
  };

  return (
    <Card className="w-full h-full border border-border bg-card p-3 md:p-4 lg:p-6">
      <CardHeader className="border-b border-border pb-3 md:pb-4 mb-3 md:mb-4">
        <CardTitle className="font-medium text-base md:text-lg lg:text-xl text-primary">
          {repoData?.name}
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
          href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`}
          className="border border-border flex justify-center h-7 md:h-8 leading-[28px] md:leading-[30px] text-muted-foreground mt-3 md:mt-4"
          target="_blank"
          rel="noreferrer"
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
export default async function OpenSource() {
  const t = await getI18n();
  const CardSkeleton = () => (
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
        <Skeleton className="h-[100px] md:h-[130px] w-full mb-4" />
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );

  return (
    <div className="px-4 mb-8 md:mb-16 lg:mb-32">
      <div className="mb-6 md:mb-12">
        <h2 className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-4 font-medium text-primary">
          {t("landing.openSource.title")}
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-[500px]">
          {t("landing.openSource.description")
            .split("code")
            .map((part, index, array) =>
              index === 1 ? (
                <React.Fragment key={index}>
                  <a
                    href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    code
                  </a>
                  {part}
                </React.Fragment>
              ) : (
                part
              )
            )}
        </p>
      </div>
      <Card className="border border-border bg-background p-4 md:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:space-x-8 xl:space-x-16">
          <div className="lg:basis-1/2 mb-6 lg:mb-0">
            <Accordion
              type="multiple"
              className="w-full"
              defaultValue={["open-source", "community"]}
            >
              <AccordionItem value="open-source">
                <AccordionTrigger className="flex items-center justify-between text-primary">
                  <div className="flex items-center space-x-2">
                    <GitBranchIcon className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="text-sm md:text-base lg:text-lg">
                      {t("landing.accordion.openSource.title")}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                  <p>
                    {t("landing.accordion.openSource.description", {
                      repoName: "deltalytix",
                    })}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2 md:mt-4 mb-2 border-primary text-primary text-xs md:text-sm"
                  >
                    {t("landing.accordion.openSource.button")}
                  </Button>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="community">
                <AccordionTrigger className="flex items-center justify-between text-primary">
                  <div className="flex items-center space-x-2">
                    <UsersIcon className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="text-sm md:text-base lg:text-lg">
                      {t("landing.accordion.community.title")}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                  <p>{t("landing.accordion.community.description")}</p>
                  <Button
                    variant="outline"
                    className="mt-2 md:mt-4 mb-2 border-primary text-primary text-xs md:text-sm"
                  >
                    <a
                      href={process.env.NEXT_PUBLIC_DISCORD_INVITATION}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("landing.accordion.community.button")}
                    </a>
                  </Button>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="open-roadmap">
                <AccordionTrigger className="flex items-center justify-between text-primary">
                  <div className="flex items-center space-x-2">
                    <BookOpenIcon className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="text-sm md:text-base lg:text-lg">
                      {t("landing.accordion.openRoadmap.title")}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                  <p>{t("landing.accordion.openRoadmap.description")}</p>
                  <Button
                    variant="outline"
                    className="mt-2 md:mt-4 mb-2 border-primary text-primary text-xs md:text-sm"
                  >
                    <Link href="/updates">
                      {t("landing.accordion.openRoadmap.button")}
                    </Link>
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <div className="lg:basis-1/2">
            <Suspense fallback={<CardSkeleton />}>
              <CachedGithubData />
            </Suspense>
          </div>
        </div>
      </Card>
    </div>
  );
}
