export type AccountDeletedStatus = 'complete' | 'partial' | 'partial_unrecorded'

export const ACCOUNT_DELETED_PARAM = 'account_deleted'

export function parseAccountDeletedParam(
  value: string | null | undefined,
): AccountDeletedStatus | null {
  if (
    value === 'complete' ||
    value === 'partial' ||
    value === 'partial_unrecorded'
  ) {
    return value
  }
  return null
}

export function accountDeletedHomeHref(
  locale: string,
  status: AccountDeletedStatus,
): string {
  const base = locale === 'fr' ? '/fr' : '/'
  const params = new URLSearchParams({ [ACCOUNT_DELETED_PARAM]: status })
  return `${base}?${params.toString()}`
}
