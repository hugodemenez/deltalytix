/**
 * Formats a timestamp to ensure consistent date format across the application.
 * Converts ISO strings ending with 'Z' to '+00:00' format for consistency.
 */
export function formatTimestamp(timestamp: string): string {
  // If the timestamp already has the correct format, return it
  if (timestamp.includes('+00:00')) {
    return timestamp
  }
  // If it ends with 'Z', convert to +00:00 format
  if (timestamp.endsWith('Z')) {
    return timestamp.replace('Z', '+00:00')
  }
  // Return as-is if it doesn't match either pattern
  return timestamp
}

/**
 * Formats a Date object to a consistent timestamp string.
 * This ensures all dates are stored in the same format in the database.
 */
export function formatDateToTimestamp(date: Date): string {
  return formatTimestamp(date.toISOString())
}

