/**
 * Ensure unit tests can exercise encrypt-on-write paths without reading
 * production secrets. Overridden per-test when a suite sets its own key.
 */
if (!process.env.JOURNAL_ENCRYPTION_KEY && !process.env.ENCRYPTION_KEY) {
  process.env.JOURNAL_ENCRYPTION_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
}
