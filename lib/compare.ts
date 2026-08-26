import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import { cache } from "react";
import {
  type CompareJournalMeta,
  type CompareStatus,
  type HubJournalRow,
  DELTALYTIX_HUB_ROW,
  DELTALYTIX_HUB_ROW_FR,
  compareJournalSort,
  toHubJournalRow,
} from "./compare-shared";

export {
  COMPARE_STATUSES,
  DELTALYTIX_HUB_ROW,
  DELTALYTIX_HUB_ROW_FR,
  compareJournalSort,
  filterJournalsByName,
  toHubJournalRow,
} from "./compare-shared";
export type {
  CompareJournalMeta,
  CompareStatus,
  HubJournalRow,
} from "./compare-shared";

const compareDirectory = path.join(process.cwd(), "content/compare");

function isCompareStatus(value: unknown): value is CompareStatus {
  return value === "live" || value === "soon";
}

function localeDirectory(locale: string) {
  return path.join(compareDirectory, locale);
}

function hasMdxFiles(directory: string) {
  if (!fs.existsSync(directory)) {
    return false;
  }

  return fs
    .readdirSync(directory)
    .some((file) => path.extname(file) === ".mdx");
}

export function resolveCompareLocale(locale: string) {
  const requested = localeDirectory(locale);
  if (hasMdxFiles(requested)) {
    return locale;
  }

  return "en";
}

function getJournalPath(slug: string, locale: string) {
  return path.join(localeDirectory(resolveCompareLocale(locale)), `${slug}.mdx`);
}

function normalizeJournalMeta(
  meta: Record<string, unknown>,
  slug: string,
): CompareJournalMeta {
  if (typeof meta.name !== "string" || meta.name.trim() === "") {
    throw new Error(
      `Compare journal "${slug}" is missing required frontmatter field "name"`,
    );
  }

  if (!isCompareStatus(meta.status)) {
    throw new Error(
      `Compare journal "${slug}" has invalid status "${String(meta.status)}". Use "live" or "soon".`,
    );
  }

  if (typeof meta.oneLiner !== "string" || meta.oneLiner.trim() === "") {
    throw new Error(
      `Compare journal "${slug}" is missing required frontmatter field "oneLiner"`,
    );
  }

  const order =
    typeof meta.order === "number" && Number.isFinite(meta.order)
      ? meta.order
      : 1000;

  return {
    slug,
    name: meta.name.trim(),
    status: meta.status,
    oneLiner: meta.oneLiner.trim(),
    lede: typeof meta.lede === "string" ? meta.lede.trim() : "",
    order,
  };
}

export const getCompareJournalMetadata = cache(
  async (slug: string, locale: string): Promise<CompareJournalMeta | null> => {
    const fullPath = getJournalPath(slug, locale);

    try {
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data: meta } = matter(fileContents);
      return normalizeJournalMeta(meta, slug);
    } catch (error) {
      console.error(`Error reading compare metadata: ${fullPath}`, error);
      return null;
    }
  },
);

async function loadAllCompareMetadata(
  locale: string,
): Promise<CompareJournalMeta[]> {
  const resolvedLocale = resolveCompareLocale(locale);
  const directory = localeDirectory(resolvedLocale);

  try {
    const files = fs.readdirSync(directory);
    const journals = await Promise.all(
      files
        .filter((file) => path.extname(file) === ".mdx")
        .map((file) =>
          getCompareJournalMetadata(path.basename(file, ".mdx"), resolvedLocale),
        ),
    );

    return journals
      .filter((journal): journal is CompareJournalMeta => journal !== null)
      .sort(compareJournalSort);
  } catch (error) {
    console.error(`Error reading compare directory: ${directory}`, error);
    return [];
  }
}

export const getAllCompareMetadata = cache(async (locale: string) => {
  return loadAllCompareMetadata(locale);
});

export const getLiveCompareMetadata = cache(async (locale: string) => {
  const journals = await getAllCompareMetadata(locale);
  return journals.filter((journal) => journal.status === "live");
});

export const getHubJournalRows = cache(
  async (locale: string): Promise<HubJournalRow[]> => {
    const journals = await getLiveCompareMetadata(locale);
    const hubRow = locale.startsWith("fr")
      ? DELTALYTIX_HUB_ROW_FR
      : DELTALYTIX_HUB_ROW;
    return [hubRow, ...journals.map(toHubJournalRow)];
  },
);

export const getCompareJournal = cache(async (
  slug: string,
  locale: string,
  components: MDXRemoteProps["components"] = {},
) => {
  const fullPath = getJournalPath(slug, locale);

  try {
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data: meta, content: rawContent } = matter(fileContents);
    const journal = normalizeJournalMeta(meta, slug);

    if (journal.status !== "live") {
      return null;
    }

    const { content } = await compileMDX({
      source: rawContent,
      components,
    });

    return {
      meta: journal,
      content,
      slug,
    };
  } catch (error) {
    console.error(`Error reading compare MDX: ${fullPath}`, error);
    return null;
  }
});
