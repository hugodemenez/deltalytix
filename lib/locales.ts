/**
 * Locale prefixes served by the i18n proxy, in one place.
 *
 * `proxy.ts` uses them to route and to recognise the homepage, and
 * `next.config.ts` uses them to attach `Vary: Accept` to every URL the homepage
 * is content-negotiated on. A locale added to only one of those lists would
 * silently lose content negotiation, so both read this module.
 */
export const LOCALES = [
  "en",
  "fr",
  "de",
  "es",
  "it",
  "pt",
  "vi",
  "hi",
  "ja",
  "zh",
  "yo",
] as const;

export type Locale = (typeof LOCALES)[number];

/** Every path the homepage answers on: `/` and each locale prefix. */
export const HOMEPAGE_PATHS: readonly string[] = [
  "/",
  ...LOCALES.map((locale) => `/${locale}`),
];
