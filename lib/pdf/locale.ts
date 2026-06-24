import enMessages from "@/locales/en"
import frMessages from "@/locales/fr"
import type { PdfLocale } from "./statement"

const MESSAGES = { en: enMessages, fr: frMessages } as const

// Resolve a translation key against a catalog that mixes flat dotted keys
// ("widgets.types.equityChart") with nested objects (tradeDistribution.title).
export function makePdfTranslator(locale: PdfLocale) {
  const catalog = MESSAGES[locale] ?? MESSAGES.en
  return (key: string): string => {
    const flat = (catalog as Record<string, unknown>)[key]
    if (typeof flat === "string") {
      return flat
    }
    let node: unknown = catalog
    for (const part of key.split(".")) {
      if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[part]
      } else {
        return key
      }
    }
    return typeof node === "string" ? node : key
  }
}
