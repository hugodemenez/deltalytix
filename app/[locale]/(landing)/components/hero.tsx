import { getCurrentLocale, getI18n } from "@/locales/server";
import { localizeLandingHref } from "@/lib/landing-nav-paths";
import Link from "next/link";
import HeroCtaLink from "./hero-cta-link";
import HeroDemoMedia from "./hero-demo-media";

export default async function Hero() {
  const t = await getI18n();
  const locale = await getCurrentLocale();

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 pb-5 pt-16 sm:px-8 sm:pb-8 sm:pt-24 lg:px-12 lg:pt-32">
      <div className="flex flex-col gap-14 md:gap-20">
        <div className="max-w-[900px]">
          <Link
            href={localizeLandingHref(locale, "/updates")}
            className="mb-7 inline-flex text-sm text-black/55 transition-colors hover:text-black dark:text-white/55 dark:hover:text-white"
          >
            {t("landing.updates")}
          </Link>
          <div>
            <h1 className="max-w-[880px] text-balance text-[clamp(3rem,7.2vw,7.25rem)] font-normal leading-[1.12] tracking-[-0.06em] sm:leading-[1.06] md:leading-[1] lg:leading-[0.96]">
              {t("landing.title")}
            </h1>
            <p className="mt-7 max-w-[660px] text-pretty text-lg leading-relaxed text-black/60 dark:text-white/60 md:text-xl">
              {t("landing.description")}
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <HeroCtaLink>{t("landing.cta")}</HeroCtaLink>
            <Link
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-sm border border-black/20 px-6 text-sm font-medium transition-[colors,transform] hover:bg-black/5 active:scale-[0.96] dark:border-white/20 dark:hover:bg-white/5"
            >
              {t("landing.features.heading")} <span className="ml-3">↓</span>
            </Link>
          </div>
        </div>
        <HeroDemoMedia demoVideoLabel={t("landing.demoVideo")} />
      </div>
    </div>
  );
}
