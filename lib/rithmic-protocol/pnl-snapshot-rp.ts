function rpOk(rpCode: unknown): boolean {
  if (!Array.isArray(rpCode) || rpCode.length === 0) return false
  return String(rpCode[0]) === '0'
}

function rpIsNoData(rpCode: unknown): boolean {
  if (!Array.isArray(rpCode) || rpCode.length === 0) return false
  return String(rpCode[0]) === '7'
}

/**
 * PnL 403 `7 no data` means the plant has no snapshot payload — not that the
 * account is flat. Empty `rp_code` / `0` is a completed book (possibly empty).
 */
export function classifyPnLSnapshotRpCode(
  rpCode: unknown,
): 'ok' | 'no_data' | 'error' {
  if (!Array.isArray(rpCode) || rpCode.length === 0) return 'ok'
  if (rpOk(rpCode)) return 'ok'
  if (rpIsNoData(rpCode)) return 'no_data'
  return 'error'
}

export function protocolAccountPlantIds(
  accountId: string,
  accounts: Array<{ accountId: string; fcmId?: string; ibId?: string }> | undefined,
  login: { fcmId?: string; ibId?: string },
): { fcmId?: string; ibId?: string } {
  const meta = accounts?.find((account) => account.accountId === accountId)
  return {
    fcmId: meta?.fcmId || login.fcmId,
    ibId: meta?.ibId || login.ibId,
  }
}
