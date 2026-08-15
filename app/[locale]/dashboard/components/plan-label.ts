export function resolvePlanLabel(
  planName: string | undefined,
  interval: string | undefined,
  freeLabel: string,
  lifetimeLabel: string
): { label: string; isFree: boolean } {
  if (interval === 'lifetime') {
    return { label: lifetimeLabel, isFree: false }
  }
  if (!planName) {
    return { label: freeLabel, isFree: true }
  }
  const normalized = planName.trim().toLowerCase()
  if (!normalized || normalized === 'free' || normalized === 'basic') {
    return { label: freeLabel, isFree: true }
  }
  return { label: planName, isFree: false }
}
