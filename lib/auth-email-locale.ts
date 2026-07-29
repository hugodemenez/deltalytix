export type AuthEmailLocale = "en" | "fr";

export function resolveAuthEmailLocale(locale?: string | null): AuthEmailLocale {
  return locale === "fr" ? "fr" : "en";
}
