import { cacheLife } from "next/cache";
import { getAllPostMetadata, getPost, getPostMetadata } from "@/lib/mdx";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getAdjacentPosts } from "@/lib/mdx";
import { Badge } from "@/components/ui/badge";
import { enUS, fr } from "date-fns/locale";
import { formatDateOnly } from "@/lib/format-date-only";
import Script from "next/script";
import { setStaticParamsLocale } from "next-international/server";
import { getStaticParams as getLocaleStaticParams } from "@/locales/server";
import { MdxSidebar } from "@/components/mdx-sidebar";
import { UpdatesNavigation } from "@/components/updates-navigation";
import { siteUrl } from "@/lib/site-url";
import { truncateForSocialDescription } from "@/lib/og/site-metadata";

type ParamsInput =
  | {
      slug: string;
      locale: string;
    }
  | Promise<{
      slug: string;
      locale: string;
    }>;

interface PageProps {
  params: ParamsInput;
}

// These posts are static MDX content, so prerender them at build time. URLs
// are resolved from the build-time site origin (siteUrl/getSiteOrigin, which
// reads NEXT_PUBLIC_BASE_URL / VERCEL_URL), avoiding any request-time
// dependency that would force dynamic rendering.
// Generate static paths for all posts in all locales
export async function generateStaticParams() {
  const locales = getLocaleStaticParams().map((entry) => entry.locale);
  const paths: Array<{ locale: string; slug: string }> = [];

  for (const locale of locales) {
    const posts = await getAllPostMetadata(locale);
    paths.push(
      ...posts.map((post) => ({
        locale,
        slug: post.slug,
      }))
    );
  }

  return paths;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  "use cache";
  cacheLife("max");

  try {
    const resolvedParams = await Promise.resolve(params);
    if (!resolvedParams || !resolvedParams.slug || !resolvedParams.locale) {
      return {
        title: "Not Found",
        description: "The page you are looking for does not exist.",
      };
    }

    const { slug, locale } = resolvedParams;
    setStaticParamsLocale(locale);

    try {
      const post = await getPostMetadata(slug, locale);
      if (!post)
        return {
          title: "Not Found",
          description: "The page you are looking for does not exist.",
        };
      const { meta } = post;

      const url = siteUrl(`/${locale}/updates/${slug}`);
      const dateLocale = locale === "fr" ? fr : enUS;
      const shareDateFormat = locale === "fr" ? "d MMMM yyyy" : "MMMM d, yyyy";
      const formattedShareDate = formatDateOnly(meta.date, shareDateFormat, {
        locale: dateLocale,
      });
      const shareTitleLabel = locale === "fr" ? "Changements" : "Changelog";
      const shareTitle = `${shareTitleLabel} · ${formattedShareDate} | Deltalytix`;
      const description = truncateForSocialDescription(meta.description);

      return {
        title: meta.title,
        description,
        alternates: {
          canonical: url,
          languages: {
            en: siteUrl(`/en/updates/${slug}`),
            fr: siteUrl(`/fr/updates/${slug}`),
          },
        },
        openGraph: {
          title: shareTitle,
          description,
          type: "article",
          publishedTime: meta.date,
          modifiedTime: meta.updatedAt || meta.date,
          url,
          siteName: "Deltalytix",
          locale: locale,
          // The og:image is injected automatically from the colocated
          // opengraph-image.tsx route and resolved against metadataBase. We do
          // not hardcode the URL: that route lives inside the (landing) route
          // group, so Next.js publishes it at a hashed path
          // (e.g. /opengraph-image-1uk6iz?<version>), and a hand-written
          // `/opengraph-image` URL resolves to the not-found route instead.
        },
        twitter: {
          card: "summary_large_image",
          title: shareTitle,
          description,
          // twitter:image is also derived from opengraph-image.tsx.
        },
      };
    } catch (postError) {
      console.error("Error fetching post:", postError);
      return {
        title: "Not Found",
        description: "The page you are looking for does not exist.",
      };
    }
  } catch (paramError) {
    console.error("Error resolving params:", paramError);
    return {
      title: "Not Found",
      description: "The page you are looking for does not exist.",
    };
  }
}

export default async function Page({ params }: PageProps) {
  "use cache";
  cacheLife("max");

  let resolvedParams: { slug: string; locale: string };

  try {
    resolvedParams = await Promise.resolve(params);
    if (!resolvedParams || !resolvedParams.slug || !resolvedParams.locale) {
      notFound();
    }
  } catch (paramError) {
    console.error("Error resolving params:", paramError);
    notFound();
  }

  const { slug, locale } = resolvedParams;
  setStaticParamsLocale(locale);

  let post: Awaited<ReturnType<typeof getPost>>;

  try {
    post = await getPost(slug, locale);
  } catch (postError) {
    console.error("Error fetching post data:", postError);
    notFound();
  }

  if (!post) {
    notFound();
  }

  let adjacentPosts: Awaited<ReturnType<typeof getAdjacentPosts>>;

  try {
    adjacentPosts = await getAdjacentPosts(slug, locale);
  } catch (adjacentPostsError) {
    console.error("Error fetching adjacent post data:", adjacentPostsError);
    adjacentPosts = { previous: null, next: null };
  }

  const { previous, next } = adjacentPosts;
  const { meta, content } = post;
  const pageDateLocale = locale === "fr" ? fr : enUS;
  const pageDateFormat = locale === "fr" ? "d MMMM yyyy" : "MMMM d, yyyy";
  const formattedDate = formatDateOnly(meta.date, pageDateFormat, {
    locale: pageDateLocale,
  });
  const url = siteUrl(`/${locale}/updates/${slug}`);

  // Prepare JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    image: meta.image || "/og-image.png",
    datePublished: meta.date,
    dateModified: meta.updatedAt || meta.date,
    author: {
      "@type": "Organization",
      name: "Deltalytix",
      url: siteUrl("/"),
    },
    publisher: {
      "@type": "Organization",
      name: "Deltalytix",
      logo: {
        "@type": "ImageObject",
        url: siteUrl("/logo.png"),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return (
    <>
      <Script id="json-ld" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>

      <article
        className="max-w-4xl mx-auto px-4 pt-16 pb-16 sm:px-6 lg:px-8"
        itemScope
        itemType="https://schema.org/Article"
      >
        <UpdatesNavigation
          previous={previous}
          next={next}
          locale={locale}
          position="top"
        />
        <div className="mb-8">
          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            <time dateTime={meta.date} itemProp="datePublished">
              {formattedDate}
            </time>
            <Badge
              variant={
                meta.status === "in-progress"
                  ? "secondary"
                  : meta.status === "completed"
                    ? "default"
                    : "outline"
              }
            >
              {meta.status === "in-progress"
                ? "In Progress"
                : meta.status === "completed"
                  ? "Completed"
                  : "Upcoming"}
            </Badge>
          </div>
        </div>

        <div
          className="prose prose-neutral dark:prose-invert max-w-none
              prose-pre:p-0 prose-pre:bg-transparent
              prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-neutral-100 prose-code:text-neutral-800
              dark:prose-code:bg-neutral-800 dark:prose-code:text-neutral-200
              prose-table:w-full prose-table:mt-6 prose-table:mb-8
              prose-thead:border-b prose-thead:border-neutral-200 dark:prose-thead:border-neutral-800
              prose-th:px-6 prose-th:py-3 prose-th:text-left prose-th:font-semibold
              prose-td:px-6 prose-td:py-3 prose-td:border-b prose-td:border-neutral-200 dark:prose-td:border-neutral-800
              prose-tr:transition-colors prose-tr:hover:bg-neutral-50 dark:prose-tr:hover:bg-neutral-900/30"
          itemProp="articleBody"
        >
          {content}
        </div>
        <UpdatesNavigation previous={previous} next={next} locale={locale} />
        <MdxSidebar />
      </article>
    </>
  );
}
