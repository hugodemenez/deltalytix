import { formatInTimeZone } from "date-fns-tz";
import type { Locale } from "date-fns";

/**
 * Format a date-only string (YYYY-MM-DD) for display.
 * Frontmatter dates are calendar dates, not timestamps — anchor at UTC noon so
 * the formatted day never shifts with build/runtime timezone.
 */
export function formatDateOnly(
  dateStr: string,
  formatStr: string,
  options?: { locale?: Locale }
): string {
  const dateOnly = dateStr.slice(0, 10);
  return formatInTimeZone(
    `${dateOnly}T12:00:00.000Z`,
    "UTC",
    formatStr,
    options
  );
}
