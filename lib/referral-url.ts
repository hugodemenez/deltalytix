export const REFERRAL_SLUG_PATTERN = /^[a-z0-9]{1,32}$/;

export function isValidReferralSlug(slug: string): boolean {
  return REFERRAL_SLUG_PATTERN.test(slug);
}

export function buildReferralShareUrl(
  origin: string,
  locale: string,
  slug: string,
): string {
  return `${origin.replace(/\/$/, "")}/${locale}/ref/${encodeURIComponent(slug)}`;
}
