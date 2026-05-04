const FALLBACK_SITE_HOST = "deltalytix.app";
const FALLBACK_SITE_ORIGIN = `https://${FALLBACK_SITE_HOST}`;
const TRUSTED_HOST_SUFFIXES = [`.${FALLBACK_SITE_HOST}`];

type HeaderLike = {
  get(name: string): string | null;
};

function originCandidatesFromEnv() {
  return [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];
}

function withProtocol(origin: string) {
  const trimmedOrigin = origin.trim();
  return /^https?:\/\//.test(trimmedOrigin) ? trimmedOrigin : `https://${trimmedOrigin}`;
}

function normalizeLegacyOrigin(origin: string | undefined) {
  if (!origin) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(withProtocol(origin));
  } catch {
    return null;
  }

  if (url.hostname === "deltalytix.com" || url.hostname === "delatlytix.com") {
    return FALLBACK_SITE_ORIGIN;
  }

  if (url.hostname === "www.deltalytix.com" || url.hostname === "www.delatlytix.com") {
    return `https://www.${FALLBACK_SITE_HOST}`;
  }

  return url.origin;
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function originFromForwardedHeaders(headers: HeaderLike) {
  const host = firstHeaderValue(headers.get("x-forwarded-host")) ?? firstHeaderValue(headers.get("host"));
  const protocol = firstHeaderValue(headers.get("x-forwarded-proto")) ?? "https";

  return host ? `${protocol}://${host}` : undefined;
}

function isTrustedOrigin(origin: string) {
  const { hostname } = new URL(origin);
  const trustedEnvOrigins = originCandidatesFromEnv()
    .map((candidate) => normalizeLegacyOrigin(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  if (
    trustedEnvOrigins.includes(origin) ||
    hostname === FALLBACK_SITE_HOST ||
    hostname === `www.${FALLBACK_SITE_HOST}` ||
    TRUSTED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  }

  return false;
}

function originFromEnv() {
  for (const candidate of originCandidatesFromEnv()) {
    const origin = normalizeLegacyOrigin(candidate);
    if (origin) {
      return origin;
    }
  }

  return null;
}

export function getSiteOrigin(origin?: string) {
  return normalizeLegacyOrigin(origin) ?? originFromEnv() ?? FALLBACK_SITE_ORIGIN;
}

export function getRequestOrigin(headers: HeaderLike) {
  const origin = normalizeLegacyOrigin(originFromForwardedHeaders(headers));

  if (origin && isTrustedOrigin(origin)) {
    return origin;
  }

  return getSiteOrigin();
}

export function siteUrl(path = "/", origin?: string) {
  return new URL(path, getSiteOrigin(origin)).toString();
}
