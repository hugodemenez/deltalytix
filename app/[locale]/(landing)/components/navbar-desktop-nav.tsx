"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import {
  Users,
  BarChart3,
  Calendar,
  Database,
  LineChart,
  Sun,
  Crown,
  TrendingUp,
  Brain,
} from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { GITHUB_REPO_URL } from "@/lib/github-repo";
import { YOUTUBE_CHANNEL_URL } from "@/lib/social-links";
import type { DesktopNavProps } from "./navbar-desktop-nav-types";

const ListItem = React.forwardRef<
  React.ComponentRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & {
    title: string;
    icon?: React.ReactNode;
  }
>(({ className, title, children, icon, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${className}`}
          {...props}
        >
          <div className="text-sm font-medium leading-none flex items-center">
            {icon}
            <span className="ml-2">{title}</span>
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function DesktopNav({
  localize,
  onHoverChange,
  featuresLabel,
  elevateTrading,
  aiJournaling,
  aiJournalingDescription,
  performanceVisualization,
  performanceVisualizationDescription,
  dailyPerformance,
  dailyPerformanceDescription,
  performanceTracking,
  performanceTrackingDescription,
  dataImport,
  dataImportDescription,
  pricingLabel,
  basicName,
  basicDescription,
  plusName,
  plusDescription,
  updatesLabel,
  changelog,
  changelogDescription,
  youtube,
  youtubeDescription,
  developersLabel,
  openSource,
  openSourceDescription,
  joinCommunity,
  joinCommunityDescription,
  signIn,
  discordInvitation,
}: DesktopNavProps) {
  return (
    <NavigationMenu>
      <NavigationMenuList className="list-none">
        <NavigationMenuItem
          onMouseEnter={() => onHoverChange("features")}
          onMouseLeave={() => onHoverChange(null)}
        >
          <NavigationMenuTrigger className="bg-transparent">
            {featuresLabel}
          </NavigationMenuTrigger>
          <NavigationMenuContent
            onMouseEnter={() => onHoverChange("features")}
            onMouseLeave={() => onHoverChange(null)}
          >
            <ul className="grid gap-3 p-6 md:w-[500px] lg:w-[600px] lg:grid-cols-[.75fr_1fr] list-none">
              <li className="row-span-5">
                <NavigationMenuLink asChild>
                  <Link
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-linear-to-b from-muted/50 to-muted p-6 no-underline outline-hidden focus:shadow-md"
                    href={localize("/")}
                  >
                    <Logo className="w-6 h-6" />
                    <div className="mb-2 mt-4 text-lg font-medium">Deltalytix</div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      {elevateTrading}
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <ListItem
                href={localize("/#ai-journaling")}
                title={aiJournaling}
                icon={<Brain className="h-4 w-4" />}
              >
                {aiJournalingDescription}
              </ListItem>
              <ListItem
                href={localize("/#performance-visualization")}
                title={performanceVisualization}
                icon={<LineChart className="h-4 w-4" />}
              >
                {performanceVisualizationDescription}
              </ListItem>
              <ListItem
                href={localize("/#daily-performance")}
                title={dailyPerformance}
                icon={<Calendar className="h-4 w-4" />}
              >
                {dailyPerformanceDescription}
              </ListItem>
              <ListItem
                href={localize("/#performance-tracking")}
                title={performanceTracking}
                icon={<TrendingUp className="h-4 w-4" />}
              >
                {performanceTrackingDescription}
              </ListItem>
              <div className="col-span-2">
                <ListItem
                  href={localize("/#data-import")}
                  title={dataImport}
                  icon={<Database className="h-4 w-4" />}
                >
                  {dataImportDescription}
                </ListItem>
              </div>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem
          onMouseEnter={() => onHoverChange("pricing")}
          onMouseLeave={() => onHoverChange(null)}
        >
          <NavigationMenuTrigger className="bg-transparent">
            {pricingLabel}
          </NavigationMenuTrigger>
          <NavigationMenuContent
            onMouseEnter={() => onHoverChange("pricing")}
            onMouseLeave={() => onHoverChange(null)}
          >
            <ul className="grid gap-3 p-6 md:w-[500px] lg:w-[600px] list-none">
              <ListItem
                href={localize("#pricing")}
                title={basicName}
                icon={<Sun className="h-4 w-4" />}
              >
                {basicDescription}
              </ListItem>
              <ListItem
                href={localize("#pricing")}
                title={plusName}
                icon={<Crown className="h-4 w-4" />}
              >
                {plusDescription}
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem
          onMouseEnter={() => onHoverChange("updates")}
          onMouseLeave={() => onHoverChange(null)}
        >
          <NavigationMenuTrigger className="bg-transparent">
            {updatesLabel}
          </NavigationMenuTrigger>
          <NavigationMenuContent
            onMouseEnter={() => onHoverChange("updates")}
            onMouseLeave={() => onHoverChange(null)}
          >
            <ul className="grid gap-3 p-4 md:w-[500px] lg:w-[600px] list-none">
              <ListItem
                href={localize("/updates")}
                title={changelog}
                icon={<BarChart3 className="h-4 w-4" />}
              >
                {changelogDescription}
              </ListItem>
              <ListItem
                href={YOUTUBE_CHANNEL_URL}
                title={youtube}
                icon={<YoutubeIcon className="h-4 w-4" />}
                target="_blank"
                rel="noopener noreferrer"
              >
                {youtubeDescription}
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem
          onMouseEnter={() => onHoverChange("developers")}
          onMouseLeave={() => onHoverChange(null)}
        >
          <NavigationMenuTrigger className="bg-transparent">
            {developersLabel}
          </NavigationMenuTrigger>
          <NavigationMenuContent
            onMouseEnter={() => onHoverChange("developers")}
            onMouseLeave={() => onHoverChange(null)}
          >
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] list-none">
              <ListItem
                href={GITHUB_REPO_URL}
                title={openSource}
                icon={<GithubIcon className="h-4 w-4" />}
                target="_blank"
                rel="noopener noreferrer"
              >
                {openSourceDescription}
              </ListItem>
              {discordInvitation ? (
                <ListItem
                  href={discordInvitation}
                  title={joinCommunity}
                  icon={<Users className="h-4 w-4" />}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {joinCommunityDescription}
                </ListItem>
              ) : null}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
      <Separator orientation="vertical" className="h-6 mx-4" />
      <Button
        variant="ghost"
        className="h-14 rounded-none px-4 text-sm font-medium hover:text-accent-foreground"
        asChild
      >
        <Link href={localize("/authentication")}>{signIn}</Link>
      </Button>
    </NavigationMenu>
  );
}
