export const SITE_HOST = "deltalytix.app";
export const SITE_ORIGIN = `https://${SITE_HOST}`;

function normalizeLegacyOrigin(origin: string) {
  const url = new URL(origin);

  if (url.hostname === "deltalytix.com" || url.hostname === "delatlytix.com") {
    return SITE_ORIGIN;
  }

  if (url.hostname === "www.deltalytix.com" || url.hostname === "www.delatlytix.com") {
    return `https://www.${SITE_HOST}`;
  }

  return url.origin;
}

export function getSiteOrigin() {
  return normalizeLegacyOrigin(process.env.NEXT_PUBLIC_BASE_URL ?? SITE_ORIGIN);
}

export function siteUrl(path = "/") {
  return new URL(path, getSiteOrigin()).toString();
}
