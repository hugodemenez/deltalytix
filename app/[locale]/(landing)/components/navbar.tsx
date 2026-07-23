"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Logo } from "@/components/logo";
import {
  FileText,
  Cpu,
  Users,
  BarChart3,
  Calendar,
  Database,
  LineChart,
  Globe,
  Laptop,
  Sun,
  Moon,
  TrendingUp,
  Brain,
} from "lucide-react";
import { useTheme } from "@/context/theme-provider";
import { cn } from "@/lib/utils";
import {
  useChangeLocale,
  useCurrentLocale,
  useI18n,
} from "@/locales/landing-client";
import { usePathname } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LandingLanguageSelector } from "./landing-language-selector";
import { LazyDesktopNav } from "./lazy-desktop-nav";
import { GITHUB_REPO_URL } from "@/lib/github-repo";
import {
  getHashFromHref,
  localizeLandingHref,
  scrollToLandingHash,
} from "@/lib/landing-nav-paths";
import { YOUTUBE_CHANNEL_URL } from "@/lib/social-links";
import { ThemeToggleIcon } from "@/components/theme-toggle-icon";

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

export default function Component() {
  const { theme, effectiveTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const t = useI18n();
  const locale = useCurrentLocale();
  const pathname = usePathname();

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const localize = useCallback(
    (path: string) => localizeLandingHref(locale, path),
    [locale],
  );

  const handleNavClick = useCallback(
    (href: string) => {
      closeMenu();

      const hash = getHashFromHref(href);
      if (!hash) {
        return;
      }

      const pathWithoutHash = href.slice(0, href.indexOf("#"));
      if (pathWithoutHash === pathname) {
        scrollToLandingHash(hash);
      }
    },
    [closeMenu, pathname],
  );

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Add/remove data attribute when mobile menu visibility changes
  useEffect(() => {
    if (isOpen) {
      document.body.setAttribute("data-mobile-navbar", "open");
    } else {
      document.body.removeAttribute("data-mobile-navbar");
    }

    // Cleanup on unmount
    return () => {
      document.body.removeAttribute("data-mobile-navbar");
    };
  }, [isOpen]);

  // Lock body scroll when mobile menu is open without changing scroll position
  useEffect(() => {
    if (typeof window === "undefined" || !isOpen) return;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== "undefined") {
        const scrollPercent =
          (window.scrollY /
            (document.documentElement.scrollHeight - window.innerHeight)) *
          100;

        if (scrollPercent <= 25) {
          setIsVisible(true);
        } else if (window.scrollY > lastScrollY) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }

        setLastScrollY(window.scrollY);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("scroll", controlNavbar);

      return () => {
        window.removeEventListener("scroll", controlNavbar);
      };
    }
  }, [lastScrollY]);

  const languages = [
    { value: "en", label: "English" },
    { value: "fr", label: "Français" },
    // Add more languages here
  ];

  const changeLocale = useChangeLocale();
  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system");
  };

  const handleLanguageChange = (value: string) => {
    changeLocale(value as "en" | "fr");
    closeMenu();
  };

  const links = [
    {
      title: t("landing.navbar.features"),
      children: [
        {
          path: "/#ai-journaling",
          title: t("landing.navbar.aiJournaling"),
          icon: <Brain className="h-4 w-4" />,
        },
        {
          path: "/#performance-visualization",
          title: t("landing.navbar.performanceVisualization"),
          icon: <LineChart className="h-4 w-4" />,
        },
        {
          path: "/#daily-performance",
          title: t("landing.navbar.dailyPerformance"),
          icon: <Calendar className="h-4 w-4" />,
        },
        {
          path: "/#performance-tracking",
          title: t("landing.navbar.performanceTracking"),
          icon: <TrendingUp className="h-4 w-4" />,
        },
        {
          path: "/#data-import",
          title: t("landing.navbar.dataImport"),
          icon: <Database className="h-4 w-4" />,
        },
      ],
    },
    {
      title: t("landing.navbar.pricing"),
      path: "/pricing",
    },
    {
      title: t("landing.navbar.updates"),
      children: [
        {
          path: "/updates",
          title: t("landing.navbar.changelog"),
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          path: YOUTUBE_CHANNEL_URL,
          title: t("landing.navbar.youtube"),
          icon: <YoutubeIcon className="h-4 w-4" />,
          external: true,
        },
      ],
    },
    {
      title: t("landing.navbar.developers"),
      children: [
        {
          path: GITHUB_REPO_URL,
          title: t("landing.navbar.openSource"),
          icon: <GithubIcon className="h-4 w-4" />,
          external: true,
        },
        {
          path: process.env.NEXT_PUBLIC_DISCORD_INVITATION || "",
          title: t("landing.navbar.joinCommunity"),
          icon: <Users className="h-4 w-4" />,
          external: true,
        },
        {
          path: "/docs",
          title: t("landing.navbar.documentation"),
          icon: <FileText className="h-4 w-4" />,
        },
        {
          path: "/api",
          title: t("landing.navbar.api"),
          icon: <Cpu className="h-4 w-4" />,
        },
      ].filter((child) => child.path.length > 0),
    },
  ];

  return (
    <>
      {/* Desktop hover backdrop */}
      <div
        className={`fixed inset-0 bg-background/80  backdrop-blur-xs z-40 transition-opacity duration-300 ${hoveredItem ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      <span
        className={`fixed top-0 left-0 right-0 z-50 bg-background pt-safe min-h-nav-safe transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
      ></span>
      <header
        className={`fixed top-0 left-0 right-0 z-50 pt-safe text-foreground transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
        <Link href={localize("/")} className="flex items-center space-x-2">
          <Logo className="w-6 h-6 fill-black dark:fill-white" />
          <span className="font-bold text-xl">Deltalytix</span>
        </Link>
        <div className="hidden lg:block">
          <LazyDesktopNav
            localize={localize}
            onHoverChange={setHoveredItem}
            featuresLabel={t("landing.navbar.features")}
            elevateTrading={t("landing.navbar.elevateTrading")}
            aiJournaling={t("landing.navbar.aiJournaling")}
            aiJournalingDescription={t("landing.navbar.aiJournalingDescription")}
            performanceVisualization={t("landing.navbar.performanceVisualization")}
            performanceVisualizationDescription={t(
              "landing.navbar.performanceVisualizationDescription",
            )}
            dailyPerformance={t("landing.navbar.dailyPerformance")}
            dailyPerformanceDescription={t(
              "landing.navbar.dailyPerformanceDescription",
            )}
            performanceTracking={t("landing.navbar.performanceTracking")}
            performanceTrackingDescription={t(
              "landing.navbar.performanceTrackingDescription",
            )}
            dataImport={t("landing.navbar.dataImport")}
            dataImportDescription={t("landing.navbar.dataImportDescription")}
            pricingLabel={t("landing.navbar.pricing")}
            basicName={t("pricing.basic.name")}
            basicDescription={t("pricing.basic.description")}
            plusName={t("pricing.plus.name")}
            plusDescription={t("pricing.plus.description")}
            updatesLabel={t("landing.navbar.updates")}
            changelog={t("landing.navbar.changelog")}
            changelogDescription={t("landing.navbar.changelogDescription")}
            youtube={t("landing.navbar.youtube")}
            youtubeDescription={t("landing.navbar.youtubeDescription")}
            developersLabel={t("landing.navbar.developers")}
            openSource={t("landing.navbar.openSource")}
            openSourceDescription={t("landing.navbar.openSourceDescription")}
            joinCommunity={t("landing.navbar.joinCommunity")}
            joinCommunityDescription={t(
              "landing.navbar.joinCommunityDescription",
            )}
            signIn={t("landing.navbar.signIn")}
            discordInvitation={process.env.NEXT_PUBLIC_DISCORD_INVITATION}
          />
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden items-center space-x-4 lg:flex">
            <LandingLanguageSelector />
            <Popover modal>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="hidden lg:inline-flex h-10 w-10 px-0"
                >
                  <ThemeToggleIcon className="h-5 w-5" />
                  <span className="sr-only">
                    {t("landing.navbar.toggleTheme")}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-1" align="end">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleThemeChange("light")}
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    <span>{t("landing.navbar.lightMode")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("dark")}
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    <span>{t("landing.navbar.darkMode")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("system")}
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  >
                    <Laptop className="mr-2 h-4 w-4" />
                    <span>{t("landing.navbar.systemTheme")}</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <button
            type="button"
            className="min-h-10 min-w-10 flex items-center justify-center lg:hidden"
            onClick={toggleMenu}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={13}
              fill="none"
            >
              <path
                fill="currentColor"
                d="M0 12.195v-2.007h18v2.007H0Zm0-5.017V5.172h18v2.006H0Zm0-5.016V.155h18v2.007H0Z"
              />
            </svg>
          </button>
        </div>
        </div>
      </header>

      {isOpen && (
        <div
          key={`mobile-nav-menu-${effectiveTheme}`}
          className="mobile-nav-overlay fixed inset-0 z-50 flex flex-col bg-background px-2 overscroll-none"
        >
          <div
            className="mt-4 flex justify-between p-3 px-4 relative ml-px"
          >
            <button
              type="button"
              onClick={closeMenu}
            >
              <span className="sr-only">Deltalytix Logo</span>
              <Logo className="w-6 h-6 fill-black dark:fill-white" />
            </button>

            <button
              type="button"
              className="ml-auto lg:hidden p-2 absolute right-[10px] top-2"
              onClick={closeMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={24}
                height={24}
                className="fill-primary"
              >
                <path fill="none" d="M0 0h24v24H0V0z" />
                <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[calc(150px+env(safe-area-inset-bottom,0px))]">
            <ul
              className="px-3 pt-8 text-xl text-black/55 dark:text-white/55 space-y-8 mb-8"
            >
              {links.map(({ path, title, children }, index) => {
                const localizedPath = path ? localize(path) : undefined;
                const isActive =
                  path === "/updates"
                    ? pathname.includes("updates")
                    : localizedPath === pathname;

                if (path) {
                  return (
                    <li key={path}>
                      <div
                      >
                        <Link
                          href={localizedPath!}
                          className={cn(isActive && "text-primary", "block")}
                          onClick={() => handleNavClick(localizedPath!)}
                        >
                          {title}
                        </Link>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={title}>
                    <Accordion collapsible type="single">
                      <AccordionItem
                        value={`item-${index}`}
                        className="border-none"
                      >
                        <AccordionTrigger className="flex items-center justify-between w-full font-normal p-0 hover:no-underline">
                          <span className="text-black/55 dark:text-white/55">{title}</span>
                        </AccordionTrigger>

                        {children && (
                          <AccordionContent className="text-xl">
                            <ul
                              className="space-y-8 ml-4 mt-6"
                            >
                              {children.map((child) => {
                                const href = child.external
                                  ? child.path
                                  : localize(child.path);
                                const linkProps = child.external
                                  ? {
                                      target: "_blank" as const,
                                      rel: "noopener noreferrer",
                                    }
                                  : {};

                                return (
                                  <li key={child.path}>
                                    <div>
                                      {child.external ? (
                                        <a
                                          href={href}
                                          onClick={closeMenu}
                                          className="text-black/55 dark:text-white/55 flex items-center space-x-2"
                                          {...linkProps}
                                        >
                                          <span>{child.icon}</span>
                                          <span>{child.title}</span>
                                        </a>
                                      ) : (
                                        <Link
                                          onClick={() => handleNavClick(href)}
                                          href={href}
                                          className="text-black/55 dark:text-white/55 flex items-center space-x-2"
                                        >
                                          <span>{child.icon}</span>
                                          <span>{child.title}</span>
                                        </Link>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </AccordionContent>
                        )}
                      </AccordionItem>
                    </Accordion>
                  </li>
                );
              })}

              <li
                className="border-t border-black/10 pt-8 dark:border-white/10"
              >
                <div
                >
                  <Link
                    className="block w-full text-xl text-primary rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    href={localize("/authentication")}
                    onClick={closeMenu}
                  >
                    {t("landing.navbar.signIn")}
                  </Link>
                </div>
              </li>

              <li
                className="space-y-8 border-t border-black/10 pt-8 dark:border-white/10"
              >
                <Accordion collapsible type="single">
                  <AccordionItem value="theme" className="border-none">
                    <AccordionTrigger className="flex items-center justify-between w-full font-normal p-0 hover:no-underline">
                      <span className="text-black/55 dark:text-white/55 flex items-center space-x-2">
                        <div className="flex items-center justify-center w-5 h-5">
                          <div
                              key={theme}
                              className="flex items-center justify-center"
                            >
                              <ThemeToggleIcon className="h-5 w-5" />
                            </div>
                        </div>
                        <span>{t("landing.navbar.changeTheme")}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-xl">
                      <ul
                        className="space-y-8 ml-4 mt-6"
                      >
                          <li
                          >
                            <div
                            >
                              <button
                                onClick={() => handleThemeChange("light")}
                                className={`flex items-center space-x-2 w-full text-left ${
                                  theme === "light"
                                    ? "text-primary"
                                    : "text-black/55 dark:text-white/55"
                                }`}
                              >
                                <Sun className="h-4 w-4" />
                                <span>{t("landing.navbar.lightMode")}</span>
                                {theme === "light" && (
                                  <div
                                    className="ml-auto"
                                  >
                                    <svg
                                      className="h-4 w-4"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            </div>
                          </li>
                          <li
                          >
                            <div
                            >
                              <button
                                onClick={() => handleThemeChange("dark")}
                                className={`flex items-center space-x-2 w-full text-left ${
                                  theme === "dark"
                                    ? "text-primary"
                                    : "text-black/55 dark:text-white/55"
                                }`}
                              >
                                <Moon className="h-4 w-4" />
                                <span>{t("landing.navbar.darkMode")}</span>
                                {theme === "dark" && (
                                  <div
                                    className="ml-auto"
                                  >
                                    <svg
                                      className="h-4 w-4"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            </div>
                          </li>
                          <li
                          >
                            <div
                            >
                              <button
                                onClick={() => handleThemeChange("system")}
                                className={`flex items-center space-x-2 w-full text-left ${
                                  theme === "system"
                                    ? "text-primary"
                                    : "text-black/55 dark:text-white/55"
                                }`}
                              >
                                <Laptop className="h-4 w-4" />
                                <span>{t("landing.navbar.systemTheme")}</span>
                                {theme === "system" && (
                                  <div
                                    className="ml-auto"
                                  >
                                    <svg
                                      className="h-4 w-4"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            </div>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                <Accordion collapsible type="single">
                  <AccordionItem value="language" className="border-none">
                    <AccordionTrigger className="flex items-center justify-between w-full font-normal p-0 hover:no-underline">
                      <span className="text-black/55 dark:text-white/55 flex items-center space-x-2">
                        <div className="flex items-center justify-center w-5 h-5">
                          <div
                              key={locale}
                              className="flex items-center justify-center"
                            >
                              <Globe className="h-5 w-5" />
                            </div>
                        </div>
                        <span>{t("landing.navbar.changeLanguage")}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-xl">
                      <ul
                        className="space-y-8 ml-4 mt-6"
                      >
                          {languages.map((language) => (
                            <li key={language.value}>
                              <div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleLanguageChange(language.value)
                                  }
                                  className={`flex items-center space-x-2 w-full text-left ${
                                    locale === language.value
                                      ? "text-primary"
                                      : "text-black/55 dark:text-white/55"
                                  }`}
                                >
                                  <span className="text-base">
                                    {language.value === "en" ? "🇬🇧" : "🇫🇷"}
                                  </span>
                                  <span>{language.label}</span>
                                  {locale === language.value && (
                                    <div
                                      className="ml-auto"
                                    >
                                      <svg
                                        className="h-4 w-4"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Mobile navbar backdrop — covers area behind Safari bottom tab bar */}
      {isOpen && (
        <div
          key={`mobile-nav-backdrop-${effectiveTheme}`}
          className="mobile-nav-overlay fixed inset-0 bg-background z-40 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </>
  );
}
