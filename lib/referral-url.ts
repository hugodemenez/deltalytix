export function buildReferralShareUrl(
  origin: string,
  locale: string,
  slug: string,
) {
  return `${origin.replace(/\/$/, "")}/${locale}/ref/${encodeURIComponent(slug)}`;
}
