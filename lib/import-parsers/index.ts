import type { Trade } from "@/prisma/generated/prisma/client"
import { parseTradezellaCsv } from "./tradezella"
import { parseTopstepCsv } from "./topstep"
import { parseFtmoCsv } from "./ftmo"
import { parseTradovateCsv } from "./tradovate"

export type PlatformParser = (
  headers: string[],
  rows: string[][],
  accountNumber: string,
) => Trade[]

export const SUPPORTED_IMPORT_PLATFORMS = [
  "tradezella",
  "topstep",
  "ftmo",
  "tradovate",
] as const

export type SupportedImportPlatform = (typeof SUPPORTED_IMPORT_PLATFORMS)[number]

const registry: Record<SupportedImportPlatform, PlatformParser> = {
  tradezella: parseTradezellaCsv,
  topstep: parseTopstepCsv,
  ftmo: parseFtmoCsv,
  tradovate: parseTradovateCsv,
}

export function getPlatformParser(
  type: string,
): PlatformParser | null {
  if ((SUPPORTED_IMPORT_PLATFORMS as readonly string[]).includes(type)) {
    return registry[type as SupportedImportPlatform]
  }
  return null
}

export function isSupportedImportPlatform(type: string): type is SupportedImportPlatform {
  return (SUPPORTED_IMPORT_PLATFORMS as readonly string[]).includes(type)
}
