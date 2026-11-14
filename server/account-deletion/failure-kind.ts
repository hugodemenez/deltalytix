export type PendingAccountCleanupFailureKind = 'STORAGE' | 'STRIPE' | 'BOTH'

export function failureKindFromFlags(
  storageFailed: boolean,
  stripeFailed: boolean,
): PendingAccountCleanupFailureKind {
  if (storageFailed && stripeFailed) return 'BOTH'
  if (storageFailed) return 'STORAGE'
  return 'STRIPE'
}
