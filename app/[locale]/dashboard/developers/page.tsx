import { permanentRedirect } from "next/navigation"
import { resolveLocale } from "@/lib/locale-params"

/**
 * API tokens and OAuth apps moved into Settings → Connections.
 * `next.config.ts` sends the HTTP 308 before this runs. This stays so a
 * request that reaches the page still lands on the same section.
 */
export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = await resolveLocale(params)
  permanentRedirect(`/${locale}/dashboard/settings#connections`)
}
