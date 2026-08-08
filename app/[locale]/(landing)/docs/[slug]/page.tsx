import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Script from "next/script";
import { setStaticParamsLocale } from "next-international/server";
import { getStaticParams as getLocaleStaticParams } from "@/locales/server";
import {
  getAdjacentDocs,
  getAllDocMetadata,
  getDoc,
  getDocMetadata,
} from "@/lib/docs";
import { MdxSidebar } from "@/components/mdx-sidebar";
import { DocsNavigation } from "@/components/docs-navigation";
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

export async function generateStaticParams() {
  const locales = getLocaleStaticParams().map((entry) => entry.locale);
  const paths: Array<{ locale: string; slug: string }> = [];

  for (const locale of locales) {
    const docs = await getAllDocMetadata(locale);
    paths.push(
      ...docs.map((doc) => ({
        locale,
        slug: doc.slug,
      })),
    );
  }

  return paths;
}

async function getCachedDocMetadata(
  slug: string,
  locale: string,
): Promise<Metadata> {
  "use cache";
  cacheLife("max");

  setStaticParamsLocale(locale);

  try {
    const doc = await getDocMetadata(slug, locale);
    if (!doc) {
      return {
        title: "Not Found",
        description: "The page you are looking for does not exist.",
      };
    }

    const { meta } = doc;
    const url = siteUrl(`/${locale}/docs/${slug}`);
    const description = truncateForSocialDescription(meta.description);

    return {
      title: meta.title,
      description,
      alternates: {
        canonical: url,
        languages: {
          en: siteUrl(`/en/docs/${slug}`),
          fr: siteUrl(`/fr/docs/${slug}`),
        },
      },
      openGraph: {
        title: `${meta.title} | Deltalytix`,
        description,
        type: "article",
        url,
        siteName: "Deltalytix",
        locale,
      },
      twitter: {
        card: "summary_large_image",
        title: `${meta.title} | Deltalytix`,
        description,
      },
    };
  } catch (docError) {
    console.error("Error fetching doc metadata:", docError);
    return {
      title: "Not Found",
      description: "The page you are looking for does not exist.",
    };
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const resolvedParams = await Promise.resolve(params);
    if (!resolvedParams || !resolvedParams.slug || !resolvedParams.locale) {
      return {
        title: "Not Found",
        description: "The page you are looking for does not exist.",
      };
    }

    return getCachedDocMetadata(resolvedParams.slug, resolvedParams.locale);
  } catch (paramError) {
    console.error("Error resolving params:", paramError);
    return {
      title: "Not Found",
      description: "The page you are looking for does not exist.",
    };
  }
}

async function CachedDocPage({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  "use cache";
  cacheLife("max");

  setStaticParamsLocale(locale);

  let doc: Awaited<ReturnType<typeof getDoc>>;

  try {
    doc = await getDoc(slug, locale);
  } catch (docError) {
    console.error("Error fetching doc data:", docError);
    notFound();
  }

  if (!doc) {
    notFound();
  }

  let adjacentDocs: Awaited<ReturnType<typeof getAdjacentDocs>>;

  try {
    adjacentDocs = await getAdjacentDocs(slug, locale);
  } catch (adjacentError) {
    console.error("Error fetching adjacent docs:", adjacentError);
    adjacentDocs = { previous: null, next: null };
  }

  const { previous, next } = adjacentDocs;
  const { meta, content } = doc;
  const url = siteUrl(`/${locale}/docs/${slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: meta.title,
    description: meta.description,
    url,
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
        className="mx-auto max-w-4xl px-4 pb-16 pt-16 sm:px-6 lg:px-8"
        itemScope
        itemType="https://schema.org/TechArticle"
      >
        <DocsNavigation
          previous={previous}
          next={next}
          locale={locale}
          position="top"
        />

        <header className="mb-10 border-b border-black/10 pb-8 dark:border-white/10">
          <p className="mb-4 text-sm text-black/55 dark:text-white/55">
            Deltalytix API
          </p>
          <h1
            className="text-balance text-3xl font-normal tracking-[-0.04em] sm:text-4xl md:text-5xl"
            itemProp="headline"
          >
            {meta.title}
          </h1>
          <p
            className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-black/60 dark:text-white/60"
            itemProp="description"
          >
            {meta.description}
          </p>
        </header>

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

        <DocsNavigation previous={previous} next={next} locale={locale} />
        <MdxSidebar />
      </article>
    </>
  );
}

export default async function Page({ params }: PageProps) {
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

  return (
    <CachedDocPage
      slug={resolvedParams.slug}
      locale={resolvedParams.locale}
    />
  );
}
