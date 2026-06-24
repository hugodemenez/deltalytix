import React, { Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { getI18n } from "@/locales/server";
import { CachedGithubData } from "./cached-github-data";
import { GITHUB_REPO_URL } from "@/lib/github-repo";

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
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
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
                      rel="noopener noreferrer"
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
