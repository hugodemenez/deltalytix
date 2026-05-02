const FALLBACK_SITE_HOST = "deltalytix.app";
const FALLBACK_SITE_ORIGIN = `https://${FALLBACK_SITE_HOST}`;

function originFromEnv() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL
  );
}

function withProtocol(origin: string) {
  return /^https?:\/\//.test(origin) ? origin : `https://${origin}`;
}

function normalizeLegacyOrigin(origin: string) {
  const url = new URL(withProtocol(origin));

  if (url.hostname === "deltalytix.com" || url.hostname === "delatlytix.com") {
    return FALLBACK_SITE_ORIGIN;
  }

  if (url.hostname === "www.deltalytix.com" || url.hostname === "www.delatlytix.com") {
    return `https://www.${FALLBACK_SITE_HOST}`;
  }

  return url.origin;
}

export function getSiteOrigin(origin = originFromEnv() ?? FALLBACK_SITE_ORIGIN) {
  return normalizeLegacyOrigin(origin);
}

export function siteUrl(path = "/", origin?: string) {
  return new URL(path, getSiteOrigin(origin)).toString();
}
