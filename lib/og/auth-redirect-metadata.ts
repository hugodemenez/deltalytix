import type { Metadata } from "next";
import { siteUrl } from "../site-url";
import {
  getConnectionsMetadataCopy,
  type OgLocale,
  resolveOgLocale,
} from "./site-metadata";

export type AuthNextOgTarget = {
  locale: OgLocale;
  kind: "connections";
};

function normalizeNextPath(next: string): string {
  return next.replace(/^\//, "").split("?")[0] ?? "";
}

/**
 * Map authentication `?next=` targets to page-specific social metadata.
 * Social crawlers follow the dashboard → /authentication redirect, so the
 * auth page must expose the destination's OG tags for previews to work.
 */
export function resolveAuthNextOgTarget(
  next: string | string[] | undefined,
): AuthNextOgTarget | null {
  if (typeof next !== "string" || !next.trim()) {
    return null;
  }

  const segments = normalizeNextPath(next)
    .split("/")
    .filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  let locale: OgLocale = "en";
  let rest = segments;

  if (segments[0] === "en" || segments[0] === "fr") {
    locale = resolveOgLocale(segments[0]);
    rest = segments.slice(1);
  }

  if (rest[0] === "dashboard" && rest[1] === "connections") {
    return { locale, kind: "connections" };
  }

  return null;
}

export function getAuthRedirectMetadata(
  next: string | string[] | undefined,
  origin?: string,
): Metadata | null {
  const target = resolveAuthNextOgTarget(next);
  if (!target) {
    return null;
  }

  if (target.kind === "connections") {
    const copy = getConnectionsMetadataCopy(target.locale);
    const imageUrl = siteUrl(
      `/${target.locale}/dashboard/connections/opengraph-image`,
      origin,
    );

    return {
      title: {
        absolute: copy.title,
      },
      description: copy.description,
      openGraph: {
        title: copy.title,
        description: copy.description,
        locale: target.locale === "fr" ? "fr_FR" : "en_US",
        type: "website",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: copy.ogAlt,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: copy.title,
        description: copy.description,
        images: [imageUrl],
      },
    };
  }

  return null;
}
