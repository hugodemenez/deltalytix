/**
 * Format an Excel Date cell for ATAS import.
 *
 * read-excel-file exposes workbook datetimes as JS Date objects whose UTC
 * components represent the wall-clock time from the file. Downstream
 * parseAtasDate treats those components as local time in the user's profile
 * timezone, so we must not use the browser's local getters here.
 */
export function formatAtasExcelDateCell(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");

  return (
    [
      date.getUTCFullYear(),
      pad(date.getUTCMonth() + 1),
      pad(date.getUTCDate()),
    ].join("-") +
    ` ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}
