import React from "react";
import { setStaticParamsLocale } from "next-international/server";
import { getI18n } from "@/locales/server";
import { getStaticParams as getLocaleStaticParams } from "@/locales/server";
import CompletedTimeline from "../components/completed-timeline";
import { getAllPosts } from "@/lib/posts";
import { getLatestVideoFromPlaylist } from "@/app/[locale]/admin/actions/youtube";
import path from "node:path";
import sharp from "sharp";

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export const revalidate = 3600;

export function generateStaticParams() {
  return getLocaleStaticParams();
}

async function isMobileScreenshot(image?: string) {
  if (!image) return false;

  const publicDirectory = path.join(process.cwd(), "public");
  const imagePath = path.resolve(
    publicDirectory,
    image.replace(/^\/+/, ""),
  );

  if (!imagePath.startsWith(`${publicDirectory}${path.sep}`)) {
    return false;
  }

  try {
    const { width, height } = await sharp(imagePath).metadata();
    return Boolean(width && height && height > width);
  } catch {
    return false;
  }
}

export default async function UpdatesPage(props: PageProps) {
  const { locale } = await props.params;

  setStaticParamsLocale(locale);

  const t = await getI18n();
  const posts = await getAllPosts(locale);

  // Only show completed posts as per requirement
  const completedPosts = posts.filter(
    (post) => post.meta.status === "completed",
  );

  // Get the latest video for French locale
  let latestVideoId: string | null = null;
  if (locale === "fr") {
    latestVideoId = await getLatestVideoFromPlaylist();
  }

  const milestones = await Promise.all(
    completedPosts.map(async (post) => ({
      id: post.meta.slug,
      title: post.meta.title,
      description: post.meta.description,
      status: "completed" as const,
      completedDate: post.meta.completedDate || post.meta.date,
      image: post.meta.image,
      youtubeVideoId: post.meta.youtubeVideoId,
      isMobileScreenshot: await isMobileScreenshot(post.meta.image),
    })),
  );

  return (
    <main className="min-h-screen">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-32">
          <p className="mb-7 text-sm text-black/55 dark:text-white/55">
            Deltalytix
          </p>
          <h1 className="max-w-[960px] text-[clamp(3rem,7.2vw,7.25rem)] font-normal leading-[0.92] tracking-[-0.06em]">
            {t("updates.title")}
          </h1>
          <p className="mt-7 max-w-[680px] text-lg leading-relaxed text-black/60 dark:text-white/60 md:text-xl">
            {t("updates.description")}
          </p>
        </div>
      </header>

      {locale === "fr" && latestVideoId && (
        <section className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-5 py-12 sm:px-8 md:grid-cols-[minmax(180px,0.35fr)_minmax(0,1fr)] md:py-16 lg:px-12">
            <h2 className="text-sm font-medium text-black/55 dark:text-white/55">
              {t("updates.weeklyVideo")}
            </h2>
            <div className="overflow-hidden rounded-sm bg-[#c6ddd6] p-2 sm:p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-black/15 bg-black">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${latestVideoId}`}
                  title="Dernière vidéo de la semaine"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mx-auto w-full max-w-[1440px] px-5 py-12 sm:px-8 md:py-16 lg:px-12">
          <div className="grid gap-6 border-b border-black/10 pb-8 dark:border-white/10 md:grid-cols-[minmax(180px,0.35fr)_minmax(0,1fr)]">
            <h2 className="text-sm font-medium text-black/55 dark:text-white/55">
              {t("updates.completed")}
            </h2>
            <p className="text-2xl font-normal tracking-[-0.03em] sm:text-3xl">
              {t("updates.shipped", {
                count: completedPosts.length.toLocaleString(locale),
              })}
            </p>
          </div>
          <CompletedTimeline
            milestones={milestones}
            locale={locale}
          />
        </div>
      </section>
    </main>
  );
}
