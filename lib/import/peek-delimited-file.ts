export const PEEK_BYTES = 32_768;

export type PeekedDelimitedFile = {
  headers: string[];
  sampleRows: string[][];
  delimiter: string;
  peekText: string;
};

export function detectDelimiter(firstLine: string): string {
  const tab = (firstLine.match(/\t/g) ?? []).length;
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  if (tab > semi && tab > comma) return "\t";
  return semi > comma ? ";" : ",";
}

export function parsePeekText(text: string): PeekedDelimitedFile {
  const lines = text.split(/\r?\n/);
  if (lines.length > 1) lines.pop();
  const nonempty = lines.filter((line) => line.trim().length > 0);
  const firstLine = nonempty[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = nonempty.map((line) => line.split(delimiter));
  return {
    headers: rows[0] ?? [],
    sampleRows: rows.slice(1, 9),
    delimiter,
    peekText: nonempty.slice(0, 16).join("\n"),
  };
}

export async function peekDelimitedFile(
  file: File,
): Promise<PeekedDelimitedFile> {
  const slice = file.slice(0, PEEK_BYTES);
  const text = await slice.text();
  return parsePeekText(text);
}
