import { formatInTimeZone } from "date-fns-tz";
import type { Locale } from "date-fns";

type DateLike = string | Date | number;

/** Normalize MDX frontmatter dates (string or YAML Date) to YYYY-MM-DD. */
export function toDateOnlyString(value: DateLike): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatInTimeZone(value, "UTC", "yyyy-MM-dd");
  }

  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatInTimeZone(parsed, "UTC", "yyyy-MM-dd");
  }

  throw new RangeError(`Invalid date-only value: ${String(value)}`);
}

/**
 * Format a date-only string (YYYY-MM-DD) for display.
 * Frontmatter dates are calendar dates, not timestamps — anchor at UTC noon so
 * the formatted day never shifts with build/runtime timezone.
 */
export function formatDateOnly(
  dateStr: DateLike,
  formatStr: string,
  options?: { locale?: Locale }
): string {
  const dateOnly = toDateOnlyString(dateStr);
  return formatInTimeZone(
    `${dateOnly}T12:00:00.000Z`,
    "UTC",
    formatStr,
    options
  );
}
