/** Throws if the loaded row is not the subscriber the cron already resolved. */
export function assertWeeklyRecapRecipient(
  loaded: { id: string; email: string },
  expected: { userId: string; email: string },
): void {
  if (loaded.id !== expected.userId || loaded.email !== expected.email) {
    throw new Error("Weekly recap user mismatch")
  }
}
