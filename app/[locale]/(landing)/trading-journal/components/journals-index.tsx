"use client";

import { useId } from "react";
import Link from "next/link";
import { localizeLandingHref } from "@/lib/landing-nav-paths";
import type { HubJournalRow } from "@/lib/compare-shared";
import { getCompareCopy } from "../compare-copy";

function StatusChip({
  kind,
  locale,
}: {
  kind: HubJournalRow["status"];
  locale: string;
}) {
  const copy = getCompareCopy(locale);
  if (kind === "us") {
    return (
      <span className="inline-flex items-center rounded-[4px] bg-[oklch(0.17_0_0)] px-1.5 py-0.5 text-[11px] font-medium leading-none text-white dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]">
        {copy.hub.usChip}
      </span>
    );
  }

  return null;
}

function JournalAction({
  journal,
  locale,
}: {
  journal: HubJournalRow;
  locale: string;
}) {
  const copy = getCompareCopy(locale);
  if (journal.status === "us") {
    return (
      <span className="text-sm text-black/40 dark:text-white/40">
        {copy.hub.youAreHere}
      </span>
    );
  }

  return (
    <Link
      href={localizeLandingHref(
        locale,
        `/trading-journal/futures/${journal.slug}`,
      )}
      className="text-sm font-medium text-foreground transition-colors hover:text-black/70 dark:hover:text-white/70"
    >
      {copy.hub.viewMore}
    </Link>
  );
}

export function JournalsIndex({
  journals,
  locale,
}: {
  journals: HubJournalRow[];
  locale: string;
}) {
  const headingId = useId();
  const copy = getCompareCopy(locale);

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="text-[clamp(2.25rem,5vw,4.5rem)] font-normal leading-[0.96] tracking-[-0.05em]"
      >
        {copy.hub.journalsHeading}
      </h2>

      <div className="mt-6 hidden md:block">
        <table className="w-full border-collapse text-start">
          <tbody>
            {journals.map((journal) => (
              <tr
                key={journal.slug}
                className="border-b border-[#E5E5E5] dark:border-white/10"
              >
                <th
                  scope="row"
                  className="py-5 pe-6 text-start align-top font-normal"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-medium">{journal.name}</span>
                    <StatusChip kind={journal.status} locale={locale} />
                  </div>
                </th>
                <td className="py-5 pe-6 align-top text-base leading-relaxed text-black/60 dark:text-white/60">
                  {journal.oneLiner}
                </td>
                <td className="py-5 text-end align-top">
                  <JournalAction journal={journal} locale={locale} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-6 space-y-3 md:hidden">
        {journals.map((journal) => (
          <li
            key={journal.slug}
            className="rounded-[4px] border border-[#E5E5E5] bg-white px-4 py-4 dark:border-white/10 dark:bg-[oklch(0.17_0_0)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-base font-medium">{journal.name}</span>
                <StatusChip kind={journal.status} locale={locale} />
              </div>
              <div className="shrink-0 pt-0.5">
                <JournalAction journal={journal} locale={locale} />
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
              {journal.oneLiner}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
