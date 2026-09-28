import type { Metadata, MetadataRoute } from "next";
import { DISALLOWED_PATHS } from "@/lib/agent-discovery/robots";
import { LOCALES } from "@/lib/locales";
import { siteUrl } from "@/lib/site-url";

/**
 * Locales that have marketing copy (next-international). Proxy `LOCALES` also
 * includes dashboard UI languages; those must not appear in the sitemap or
 * hreflang map or Google would see thin duplicates of English.
 */
export const INDEXABLE_LOCALES = ["en", "fr"] as const;
export type IndexableLocale = (typeof INDEXABLE_LOCALES)[number];
export const DEFAULT_INDEXABLE_LOCALE: IndexableLocale = "en";

export const PRIVATE_PAGE_ROBOTS = {
  index: false,
  follow: false,
} as const satisfies Metadata["robots"];

type SitemapFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

export type PublicSitemapRoute = {
  path: string;
  changeFrequency: SitemapFrequency;
  priority: number;
  localized?: boolean;
};

/**
 * Public URLs that belong in the sitemap. Paths are stored without a locale
 * prefix; localized routes are expanded to `/en` and `/fr` at build time.
 * Keep robots-disallowed and private routes out of this list.
 */
export const PUBLIC_SITEMAP_ROUTES: readonly PublicSitemapRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.8 },
  { path: "/updates", changeFrequency: "weekly", priority: 0.7 },
  { path: "/trading-journal/futures", changeFrequency: "weekly", priority: 0.8 },
  { path: "/support", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.5 },
  { path: "/disclaimers", changeFrequency: "yearly", priority: 0.3 },
  { path: "/propfirms", changeFrequency: "monthly", priority: 0.6 },
  { path: "/teams", changeFrequency: "monthly", priority: 0.6 },
  { path: "/docs/api", changeFrequency: "monthly", priority: 0.5, localized: false },
  { path: "/llms.txt", changeFrequency: "weekly", priority: 0.5, localized: false },
];

const PRIVATE_SITEMAP_PATHS = ["/settings", "/admin", "/embed", "/shared"] as const;

function normalizePath(path: string) {
  if (!path || path === "/") {
    return "/";
  }

  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

export function stripLocalePrefix(pathname: string) {
  const normalized = normalizePath(pathname);
  const segments = normalized.split("/");
  const maybeLocale = segments[1];

  if ((LOCALES as readonly string[]).includes(maybeLocale)) {
    const rest = segments.slice(2).join("/");
    return rest ? `/${rest}` : "/";
  }

  return normalized;
}

export function localizedPath(locale: string, pathWithoutLocale: string) {
  const suffix = normalizePath(pathWithoutLocale);
  return suffix === "/" ? `/${locale}` : `/${locale}${suffix}`;
}

function pathMatchesPrefix(pathname: string, prefix: string) {
  const normalizedPrefix = normalizePath(prefix);
  return pathname === normalizedPrefix || pathname.startsWith(`${normalizedPrefix}/`);
}

/** True for robots-disallowed paths and other private/utility routes. */
export function isExcludedFromSitemap(pathname: string) {
  const unprefixed = stripLocalePrefix(pathname);

  for (const disallowed of DISALLOWED_PATHS) {
    if (pathMatchesPrefix(unprefixed, disallowed)) {
      return true;
    }
  }

  for (const privatePath of PRIVATE_SITEMAP_PATHS) {
    if (pathMatchesPrefix(unprefixed, privatePath)) {
      return true;
    }
  }

  return false;
}

export function languageAlternateUrls(pathWithoutLocale: string, origin?: string) {
  const languages: Record<string, string> = {};

  for (const locale of INDEXABLE_LOCALES) {
    languages[locale] = siteUrl(localizedPath(locale, pathWithoutLocale), origin);
  }

  languages["x-default"] = languages[DEFAULT_INDEXABLE_LOCALE];
  return languages;
}

export function publicPageAlternates(
  locale: string,
  pathWithoutLocale: string,
  origin?: string,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: siteUrl(localizedPath(locale, pathWithoutLocale), origin),
    languages: languageAlternateUrls(pathWithoutLocale, origin),
  };
}

export function publicPageMetadata(
  locale: string,
  pathWithoutLocale: string,
  extra: Metadata = {},
  origin?: string,
): Metadata {
  const canonical = siteUrl(localizedPath(locale, pathWithoutLocale), origin);
  const languages = languageAlternateUrls(pathWithoutLocale, origin);

  return {
    ...extra,
    alternates: {
      ...extra.alternates,
      canonical,
      languages,
    },
    openGraph: {
      url: canonical,
      ...extra.openGraph,
    },
  };
}

export function createPublicPageMetadata(pathWithoutLocale: string) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const { locale } = await params;
    return publicPageMetadata(locale, pathWithoutLocale);
  };
}

export function sitemapEntry(
  path: string,
  options: {
    localized?: boolean;
    locale?: string;
    changeFrequency: SitemapFrequency;
    priority: number;
    lastModified?: Date;
  },
): MetadataRoute.Sitemap[number] {
  const localized = options.localized !== false;
  const pathname = localized
    ? localizedPath(options.locale ?? DEFAULT_INDEXABLE_LOCALE, path)
    : normalizePath(path);

  const url = siteUrl(pathname);
  const entry: MetadataRoute.Sitemap[number] = {
    url,
    lastModified: options.lastModified ?? new Date(),
    changeFrequency: options.changeFrequency,
    priority: options.priority,
  };

  if (localized) {
    entry.alternates = {
      languages: languageAlternateUrls(path),
    };
  }

  return entry;
}
