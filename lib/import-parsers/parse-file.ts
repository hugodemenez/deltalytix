import Papa from "papaparse"
import { readSheet } from "read-excel-file/node"

export type ParsedTabularFile = {
  headers: string[]
  rows: string[][]
  objects: Record<string, string>[]
}

function cellToString(value: unknown): string {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function toTabular(matrix: unknown[][]): ParsedTabularFile {
  if (matrix.length === 0) {
    return { headers: [], rows: [], objects: [] }
  }

  const headers = matrix[0].map((cell) => cellToString(cell))
  const dataRows = matrix.slice(1).map((row) =>
    headers.map((_, i) => cellToString((row as unknown[])[i])),
  )
  const objects = dataRows.map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? ""
    })
    return obj
  })
  return { headers, rows: dataRows, objects }
}

export async function parseTabularFile(
  buffer: Buffer,
  filename: string,
): Promise<ParsedTabularFile> {
  const lower = filename.toLowerCase()

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const sheetData = await readSheet(buffer)
    return toTabular(sheetData as unknown[][])
  }

  const text = buffer.toString("utf8")
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
  })

  const allRows = (parsed.data || []).filter(
    (row) =>
      Array.isArray(row) && row.some((cell) => String(cell ?? "").trim() !== ""),
  ) as string[][]

  return toTabular(allRows)
}
