import React, { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { GitBranchIcon, UsersIcon, BookOpenIcon } from "lucide-react";
import Link from "next/link";
import { getCurrentLocale, getI18n } from "@/locales/server";
import {
  CachedGithubData,
  GithubCardSkeleton,
} from "./cached-github-data";
import { GITHUB_REPO_URL } from "@/lib/github-repo";
import { LANDING_SECTION_CONTAINER_CLASSNAME } from "./landing-section-container";

export default async function OpenSource() {
  const t = await getI18n();
  const locale = await getCurrentLocale();

  return (
    <div className={LANDING_SECTION_CONTAINER_CLASSNAME}>
      <div className="mb-16 grid gap-5 md:grid-cols-2 md:items-end">
        <h2 className="text-balance text-4xl font-normal tracking-[-0.04em] md:text-6xl">
          {t("landing.openSource.title")}
        </h2>
        <p className="max-w-lg text-pretty text-lg text-black/55 dark:text-white/55 md:justify-self-end">
          {t("landing.openSource.description")
            .split("code")
            .map((part, index) =>
              index === 1 ? (
                <React.Fragment key={index}>
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-[0.2em] decoration-black/30 dark:decoration-white/30"
                  >
                    code
                  </a>
                  {part}
                </React.Fragment>
              ) : (
                part
              ),
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
            <Suspense fallback={<GithubCardSkeleton />}>
              <CachedGithubData
                starLabel={t("landing.openSource.starItToo")}
                locale={locale}
              />
            </Suspense>
          </div>
        </div>
      </Card>
    </div>
  );
}
