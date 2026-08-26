export const COMPARE_STATUSES = ["live", "soon"] as const;
export type CompareStatus = (typeof COMPARE_STATUSES)[number];

export type CompareJournalMeta = {
  slug: string;
  name: string;
  status: CompareStatus;
  oneLiner: string;
  lede: string;
  order: number;
};

export function deltalytixHubRow(oneLiner: string) {
  return {
    slug: "deltalytix",
    name: "Deltalytix",
    status: "us" as const,
    oneLiner,
  };
}

export const DELTALYTIX_HUB_ROW = deltalytixHubRow(
  "Import your futures. Read P&L in one journal.",
);

export const DELTALYTIX_HUB_ROW_FR = deltalytixHubRow(
  "Importez vos futures. Lisez le P&L dans un seul journal.",
);

export type HubJournalRow = {
  slug: string;
  name: string;
  status: "us" | CompareStatus;
  oneLiner: string;
};

export function compareJournalSort(
  a: Pick<CompareJournalMeta, "order" | "name">,
  b: Pick<CompareJournalMeta, "order" | "name">,
) {
  if (a.order !== b.order) {
    return a.order - b.order;
  }

  return a.name.localeCompare(b.name);
}

export function filterJournalsByName<T extends { name: string }>(
  journals: readonly T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...journals];
  }

  return journals.filter((journal) =>
    journal.name.toLowerCase().includes(normalized),
  );
}

export function toHubJournalRow(journal: CompareJournalMeta): HubJournalRow {
  return {
    slug: journal.slug,
    name: journal.name,
    status: journal.status,
    oneLiner: journal.oneLiner,
  };
}
