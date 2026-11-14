export type AccountDeletedStatus = 'complete' | 'partial'

export const ACCOUNT_DELETED_PARAM = 'account_deleted'

export function parseAccountDeletedParam(
  value: string | null | undefined,
): AccountDeletedStatus | null {
  if (value === 'complete' || value === 'partial') return value
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
