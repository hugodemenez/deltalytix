import { describe, expect, it } from "vitest"
import en from "@/locales/en/api-access"
import fr from "@/locales/fr/api-access"
import { OAUTH_APP_ERROR_MESSAGES, validateOAuthAppInput } from "@/lib/api/oauth-app-input"
import {
  OAUTH_APP_ERROR_LOCALE_KEYS,
  localizeOAuthAppErrors,
  localizeOAuthAppMessage,
  oauthAppErrorLocaleKey,
} from "./connections-format"

const placeholders = (value: string) => (value.match(/\{[a-zA-Z]+\}/g) ?? []).sort()

describe("Connections locales", () => {
  it("EN and FR have the same keys in the same order", () => {
    expect(Object.keys(fr)).toEqual(Object.keys(en))
  })

  it("keeps every placeholder identical between EN and FR", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(fr[key]), key).toEqual(placeholders(en[key]))
    }
  })

  it("has an EN key for every server validation message, with the same copy", () => {
    for (const code of Object.keys(OAUTH_APP_ERROR_MESSAGES) as (keyof typeof OAUTH_APP_ERROR_MESSAGES)[]) {
      const key = OAUTH_APP_ERROR_LOCALE_KEYS[code]
      expect(en[key], code).toBe(OAUTH_APP_ERROR_MESSAGES[code])
      expect(fr[key], code).toBeTruthy()
      expect(oauthAppErrorLocaleKey(OAUTH_APP_ERROR_MESSAGES[code])).toBe(key)
    }
  })

  it("has copy feedback labels", () => {
    expect(en["dashboard.settings.connections.copied"]).toBe("Copied")
    expect(fr["dashboard.settings.connections.copied"]).toBe("Copié")
    expect(en["dashboard.settings.connections.copyFailed"]).toBe("Copy failed")
    expect(fr["dashboard.settings.connections.copyFailed"]).toBe("Échec de la copie")
  })
})

describe("localizeOAuthAppErrors", () => {
  const toFr = (key: keyof typeof fr) => fr[key]

  it("translates server errors and keeps field and index", () => {
    const result = validateOAuthAppInput(
      { name: "", redirectUris: ["http://example.com/cb"], scopes: [] },
      "create",
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(localizeOAuthAppErrors(result.errors, toFr)).toEqual([
      { field: "name", message: "Le nom est obligatoire." },
      { field: "redirectUris", index: 0, message: "Utilisez https (http uniquement pour localhost)." },
      { field: "scopes", message: "Choisissez au moins une autorisation." },
    ])
  })

  it("passes unknown messages through unchanged", () => {
    expect(localizeOAuthAppMessage("Something else.", toFr)).toBe("Something else.")
  })
})
