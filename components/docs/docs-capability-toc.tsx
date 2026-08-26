import Link from "next/link"
import { getI18n } from "@/locales/server"
import { MdxTd, MdxTh, MdxThead, MdxTr } from "@/components/mdx/table"

const TOC_HEADING_ID = {
  en: "what-you-can-do",
  fr: "ce-que-vous-pouvez-faire",
} as const

const CAPABILITIES = [
  {
    scope: "profile:read",
    href: "#authentication",
    copyKey: "docs.toc.profileRead",
  },
  { scope: "trades:read", href: "#trades", copyKey: "docs.toc.tradesRead" },
  { scope: "trades:write", href: "#trades", copyKey: "docs.toc.tradesWrite" },
  {
    scope: "accounts:read",
    href: "#accounts",
    copyKey: "docs.toc.accountsRead",
  },
  {
    scope: "connections:read",
    href: "#connections",
    copyKey: "docs.toc.connectionsRead",
  },
  {
    scope: "connections:write",
    href: "#connections",
    copyKey: "docs.toc.connectionsWrite",
  },
  { scope: "imports:write", href: "#imports", copyKey: "docs.toc.importsWrite" },
  { scope: "metrics:read", href: "#metrics", copyKey: "docs.toc.metricsRead" },
] as const

type CapabilityCopyKey = (typeof CAPABILITIES)[number]["copyKey"]

export function docsTocHeadingId(locale: string) {
  return locale === "fr" ? TOC_HEADING_ID.fr : TOC_HEADING_ID.en
}

export async function DocsCapabilityToc({ locale }: { locale: string }) {
  const t = await getI18n()
  const headingId = docsTocHeadingId(locale)

  // Resolved eagerly with literal keys: calling `t(row.copyKey)` inside the map
  // makes TypeScript widen over every translation key at once, which overflows
  // the union size limit (TS2590).
  const labels: Record<CapabilityCopyKey, string> = {
    "docs.toc.profileRead": t("docs.toc.profileRead"),
    "docs.toc.tradesRead": t("docs.toc.tradesRead"),
    "docs.toc.tradesWrite": t("docs.toc.tradesWrite"),
    "docs.toc.accountsRead": t("docs.toc.accountsRead"),
    "docs.toc.connectionsRead": t("docs.toc.connectionsRead"),
    "docs.toc.connectionsWrite": t("docs.toc.connectionsWrite"),
    "docs.toc.importsWrite": t("docs.toc.importsWrite"),
    "docs.toc.metricsRead": t("docs.toc.metricsRead"),
  }

  return (
    <section
      id={headingId}
      className="scroll-mt-24 border-b border-black/10 py-12 dark:border-white/10 sm:py-16"
    >
      <h2 className="text-balance text-2xl font-normal tracking-[-0.03em] sm:text-3xl">
        {t("docs.toc.title")}
      </h2>
      <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-black/60 dark:text-white/60">
        {t("docs.toc.lead")}
      </p>
      <div className="mt-8 max-w-full overflow-auto overscroll-x-contain rounded-sm border border-neutral-200 dark:border-neutral-800">
        <table className="w-max min-w-full border-collapse text-left text-sm">
          <MdxThead>
            <MdxTr>
              <MdxTh>{t("docs.toc.youCan")}</MdxTh>
              <MdxTh>{t("docs.toc.scope")}</MdxTh>
            </MdxTr>
          </MdxThead>
          <tbody>
            {CAPABILITIES.map((row) => (
              <MdxTr key={row.scope}>
                <MdxTd>
                  <Link
                    href={row.href}
                    className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/10"
                  >
                    {labels[row.copyKey]}
                  </Link>
                </MdxTd>
                <MdxTd>
                  <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.875em] text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                    {row.scope}
                  </code>
                </MdxTd>
              </MdxTr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
