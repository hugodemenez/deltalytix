import fs from 'node:fs'
import path from 'node:path'
import protobuf from 'protobufjs'
import WebSocket from 'ws'
import {
  EXCHANGE_NOTIFY_FILL,
  ORDER_PLANT,
  RithmicTemplateId,
} from './templates'
import type {
  RithmicProtocolAccount,
  RithmicProtocolConnectResult,
  RithmicProtocolFill,
} from './types'
import {
  getRithmicProtocolAppName,
  getRithmicProtocolAppVersion,
  normalizeGatewayUri,
} from './systems'

const PROTO_DIR = path.join(process.cwd(), 'lib/rithmic-protocol/proto')

const PROTO_FILES = [
  'base.proto',
  'request_login.proto',
  'response_login.proto',
  'request_logout.proto',
  'response_logout.proto',
  'request_heartbeat.proto',
  'response_heartbeat.proto',
  'request_rithmic_system_info.proto',
  'response_rithmic_system_info.proto',
  'request_rithmic_system_gateway_info.proto',
  'response_rithmic_system_gateway_info.proto',
  'request_login_info.proto',
  'response_login_info.proto',
  'request_account_list.proto',
  'response_account_list.proto',
  'request_show_order_history_dates.proto',
  'response_show_order_history_dates.proto',
  'request_show_order_history_summary.proto',
  'response_show_order_history_summary.proto',
  'request_show_fill_history.proto',
  'response_show_fill_history.proto',
  'request_replay_executions.proto',
  'response_replay_executions.proto',
  'exchange_order_notification.proto',
  'rithmic_order_notification.proto',
  'reject.proto',
]

let rootPromise: Promise<protobuf.Root> | null = null

function loadRoot(): Promise<protobuf.Root> {
  if (!rootPromise) {
    rootPromise = (async () => {
      const root = new protobuf.Root()
      for (const file of PROTO_FILES) {
        const full = path.join(PROTO_DIR, file)
        if (!fs.existsSync(full)) {
          throw new Error(`Missing Rithmic proto file: ${file}`)
        }
        await root.load(full, { keepCase: false })
      }
      return root
    })()
  }
  return rootPromise
}

function encodeMessage(
  root: protobuf.Root,
  typeName: string,
  payload: Record<string, unknown>,
): Buffer {
  const type = root.lookupType(typeName)
  const err = type.verify(payload)
  if (err) throw new Error(`${typeName} verify failed: ${err}`)
  const message = type.create(payload)
  return Buffer.from(type.encode(message).finish())
}

function decodeMessage<T extends object>(
  root: protobuf.Root,
  typeName: string,
  buf: Buffer,
): T {
  const type = root.lookupType(typeName)
  return type.toObject(type.decode(buf), {
    longs: Number,
    enums: Number,
    bytes: String,
    defaults: false,
  }) as T
}

function rpOk(rpCode: unknown): boolean {
  if (!Array.isArray(rpCode) || rpCode.length === 0) return false
  return String(rpCode[0]) === '0'
}

/** Rithmic uses rp_code `7` / "no data" for empty history — not a hard failure. */
function rpIsNoData(rpCode: unknown): boolean {
  if (!Array.isArray(rpCode) || rpCode.length === 0) return false
  const code = String(rpCode[0]).trim()
  if (code === '7') return true
  const joined = rpCode.map(String).join(' ').toLowerCase()
  return joined.includes('no data')
}

function rpMessage(rpCode: unknown): string {
  if (!Array.isArray(rpCode)) return 'Unknown Rithmic error'
  return rpCode.map(String).join(' ')
}

type InboundMessage = {
  templateId: number
  raw: Buffer
}

export class RithmicProtocolClient {
  private ws: WebSocket | null = null
  private root: protobuf.Root | null = null
  private queue: InboundMessage[] = []
  private waiters: Array<{
    resolve: (msg: InboundMessage) => void
    reject: (err: Error) => void
    timeout: NodeJS.Timeout
  }> = []
  private closed = false

  async connect(gatewayUri: string): Promise<void> {
    this.root = await loadRoot()
    const uri = normalizeGatewayUri(gatewayUri)

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(uri, {
        // Rithmic samples disable cert verification for Protocol endpoints.
        rejectUnauthorized: false,
      })
      this.ws = ws

      const onError = (err: Error) => {
        cleanup()
        reject(err)
      }
      const onOpen = () => {
        cleanup()
        resolve()
      }
      const cleanup = () => {
        ws.off('open', onOpen)
        ws.off('error', onError)
      }

      ws.once('open', onOpen)
      ws.once('error', onError)

      ws.on('message', (data) => {
        try {
          const raw = Buffer.isBuffer(data)
            ? data
            : Buffer.from(data as ArrayBuffer)
          const base = decodeMessage<{ templateId: number }>(
            this.root!,
            'rti.Base',
            raw,
          )
          const msg: InboundMessage = {
            templateId: base.templateId,
            raw,
          }
          const waiter = this.waiters.shift()
          if (waiter) {
            clearTimeout(waiter.timeout)
            waiter.resolve(msg)
          } else {
            this.queue.push(msg)
          }
        } catch (error) {
          console.error('[RITHMIC-PROTOCOL] Failed to decode inbound message', error)
        }
      })

      ws.on('close', () => {
        this.closed = true
        while (this.waiters.length > 0) {
          const waiter = this.waiters.shift()
          if (!waiter) break
          clearTimeout(waiter.timeout)
          waiter.reject(new Error('Rithmic WebSocket closed'))
        }
      })
    })
  }

  private async nextMessage(timeoutMs = 30_000): Promise<InboundMessage> {
    if (this.queue.length > 0) {
      return this.queue.shift()!
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.waiters.findIndex((w) => w.timeout === timeout)
        if (idx >= 0) this.waiters.splice(idx, 1)
        reject(new Error(`Timed out waiting for Rithmic message after ${timeoutMs}ms`))
      }, timeoutMs)
      this.waiters.push({ resolve, reject, timeout })
    })
  }

  /**
   * Wait for the next message matching `accept`, ignoring heartbeats/noise.
   * Enforces an overall deadline so a heartbeat stream cannot hang forever.
   */
  private async nextMatchingMessage(
    accept: (templateId: number) => boolean,
    options?: { perMessageTimeoutMs?: number; overallTimeoutMs?: number },
  ): Promise<InboundMessage> {
    const overallTimeoutMs = options?.overallTimeoutMs ?? 60_000
    const perMessageTimeoutMs = options?.perMessageTimeoutMs ?? 30_000
    const deadline = Date.now() + overallTimeoutMs

    while (Date.now() < deadline) {
      const remaining = deadline - Date.now()
      const msg = await this.nextMessage(
        Math.max(1_000, Math.min(perMessageTimeoutMs, remaining)),
      )

      if (
        msg.templateId === RithmicTemplateId.HEARTBEAT_REQUEST ||
        msg.templateId === RithmicTemplateId.HEARTBEAT_RESPONSE ||
        msg.templateId === RithmicTemplateId.RITHMIC_ORDER_NOTIFICATION
      ) {
        continue
      }

      if (accept(msg.templateId)) return msg
    }

    throw new Error(
      `Timed out waiting for matching Rithmic message after ${overallTimeoutMs}ms`,
    )
  }

  private async send(typeName: string, payload: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.root) {
      throw new Error('Rithmic Protocol client is not connected')
    }
    const buf = encodeMessage(this.root, typeName, payload)
    this.ws.send(buf)
  }

  async login(params: {
    systemName: string
    username: string
    password: string
  }): Promise<{ fcmId?: string; ibId?: string; uniqueUserId?: string }> {
    await this.send('rti.RequestLogin', {
      templateId: RithmicTemplateId.LOGIN_REQUEST,
      templateVersion: '3.9',
      userMsg: ['deltalytix-login'],
      user: params.username,
      password: params.password,
      appName: getRithmicProtocolAppName(),
      appVersion: getRithmicProtocolAppVersion(),
      systemName: params.systemName,
      infraType: ORDER_PLANT,
    })

    const msg = await this.nextMatchingMessage(
      (id) => id === RithmicTemplateId.LOGIN_RESPONSE,
      { overallTimeoutMs: 45_000 },
    )
    const decoded = decodeMessage<{
      rpCode?: string[]
      fcmId?: string
      ibId?: string
      uniqueUserId?: string
    }>(this.root!, 'rti.ResponseLogin', msg.raw)

    if (!rpOk(decoded.rpCode)) {
      throw new Error(`Rithmic login failed: ${rpMessage(decoded.rpCode)}`)
    }

    return {
      fcmId: decoded.fcmId,
      ibId: decoded.ibId,
      uniqueUserId: decoded.uniqueUserId,
    }
  }

  async loginInfo(): Promise<{
    fcmId?: string
    ibId?: string
    userType?: number
  }> {
    await this.send('rti.RequestLoginInfo', {
      templateId: RithmicTemplateId.LOGIN_INFO_REQUEST,
      userMsg: ['deltalytix-login-info'],
    })
    const msg = await this.nextMatchingMessage(
      (id) => id === RithmicTemplateId.LOGIN_INFO_RESPONSE,
      { overallTimeoutMs: 30_000 },
    )
    const decoded = decodeMessage<{
      rpCode?: string[]
      fcmId?: string
      ibId?: string
      userType?: number
    }>(this.root!, 'rti.ResponseLoginInfo', msg.raw)
    if (!rpOk(decoded.rpCode)) {
      throw new Error(`Login info failed: ${rpMessage(decoded.rpCode)}`)
    }
    return {
      fcmId: decoded.fcmId,
      ibId: decoded.ibId,
      userType: decoded.userType,
    }
  }

  async listAccounts(params: {
    fcmId?: string
    ibId?: string
    userType?: number
  }): Promise<RithmicProtocolAccount[]> {
    await this.send('rti.RequestAccountList', {
      templateId: RithmicTemplateId.ACCOUNT_LIST_REQUEST,
      userMsg: ['deltalytix-accounts'],
      fcmId: params.fcmId,
      ibId: params.ibId,
      userType: params.userType ?? 3,
    })

    const accounts: RithmicProtocolAccount[] = []
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      const msg = await this.nextMatchingMessage(
        (id) =>
          id === RithmicTemplateId.ACCOUNT_LIST_RESPONSE ||
          id === RithmicTemplateId.REJECT,
        {
          overallTimeoutMs: Math.max(1_000, deadline - Date.now()),
          perMessageTimeoutMs: 30_000,
        },
      )

      if (msg.templateId === RithmicTemplateId.REJECT) {
        throw new Error('Account list rejected by Rithmic')
      }

      const decoded = decodeMessage<{
        rpCode?: string[]
        rqHandlerRpCode?: string[]
        accountId?: string
        accountName?: string
        fcmId?: string
        ibId?: string
        accountCurrency?: string
      }>(this.root!, 'rti.ResponseAccountList', msg.raw)

      if (decoded.accountId) {
        accounts.push({
          accountId: decoded.accountId,
          accountName: decoded.accountName,
          fcmId: decoded.fcmId,
          ibId: decoded.ibId,
          currency: decoded.accountCurrency,
        })
      }

      // Final response carries rp_code; intermediate rows use rq_handler_rp_code.
      if (Array.isArray(decoded.rpCode) && decoded.rpCode.length > 0) {
        if (rpIsNoData(decoded.rpCode)) break
        if (!rpOk(decoded.rpCode)) {
          throw new Error(`Account list failed: ${rpMessage(decoded.rpCode)}`)
        }
        break
      }
    }

    return accounts
  }

  /**
   * Fetch fills via ShowFillHistory (template 3512).
   * Prefer trade_date index (YYYYMMDD ints).
   */
  async getFillHistory(params: {
    fcmId?: string
    ibId?: string
    accountId: string
    startDateYyyymmdd: number
    endDateYyyymmdd: number
    maxRecords?: number
  }): Promise<RithmicProtocolFill[]> {
    await this.send('rti.RequestShowFillHistory', {
      templateId: RithmicTemplateId.SHOW_FILL_HISTORY_REQUEST,
      userMsg: ['deltalytix-fill-history'],
      fcmId: params.fcmId,
      ibId: params.ibId,
      accountId: params.accountId,
      indexFormat: 'trade_date',
      startIndex: params.startDateYyyymmdd,
      finishIndex: params.endDateYyyymmdd,
      maxRecordCount: Math.min(params.maxRecords ?? 10_000, 10_000),
    })

    const fills: RithmicProtocolFill[] = []
    // Keep each ShowFillHistory call short so empty / stalled ranges cannot
    // exhaust the serverless maxDuration across many windows.
    const deadline = Date.now() + 45_000

    while (Date.now() < deadline) {
      const msg = await this.nextMatchingMessage(
        (id) =>
          id === RithmicTemplateId.SHOW_FILL_HISTORY_RESPONSE ||
          id === RithmicTemplateId.EXCHANGE_ORDER_NOTIFICATION ||
          id === RithmicTemplateId.REJECT,
        {
          overallTimeoutMs: Math.max(1_000, deadline - Date.now()),
          perMessageTimeoutMs: 20_000,
        },
      )

      if (msg.templateId === RithmicTemplateId.REJECT) {
        throw new Error('Fill history rejected by Rithmic')
      }

      if (msg.templateId === RithmicTemplateId.EXCHANGE_ORDER_NOTIFICATION) {
        const fill = this.decodeExchangeFill(msg.raw, params.accountId)
        if (fill) fills.push(fill)
        continue
      }

      const decoded = decodeMessage<{
        rpCode?: string[]
        rqHandlerRpCode?: string[]
        accountId?: string
        fcmId?: string
        ibId?: string
        symbol?: string
        exchange?: string
        transactionType?: string
        fillPrice?: number
        fillSize?: number | string
        fillId?: string
        fillDate?: string
        fillTime?: string
        basketId?: string
        sequenceNumber?: string
        ssboe?: number
        usecs?: number
        avgFillPrice?: number
      }>(this.root!, 'rti.ResponseShowFillHistory', msg.raw)

      if (decoded.symbol && decoded.fillPrice != null) {
        fills.push({
          accountId: decoded.accountId || params.accountId,
          fcmId: decoded.fcmId,
          ibId: decoded.ibId,
          symbol: decoded.symbol,
          exchange: decoded.exchange,
          transactionType: String(decoded.transactionType ?? ''),
          fillPrice: Number(decoded.fillPrice),
          fillSize: Number(decoded.fillSize ?? 0),
          fillId: decoded.fillId,
          fillDate: decoded.fillDate,
          fillTime: decoded.fillTime,
          basketId: decoded.basketId,
          sequenceNumber: decoded.sequenceNumber,
          ssboe: decoded.ssboe,
          usecs: decoded.usecs,
          avgFillPrice:
            decoded.avgFillPrice != null
              ? Number(decoded.avgFillPrice)
              : undefined,
        })
      }

      if (Array.isArray(decoded.rpCode) && decoded.rpCode.length > 0) {
        if (rpIsNoData(decoded.rpCode)) break
        if (!rpOk(decoded.rpCode)) {
          throw new Error(`Fill history failed: ${rpMessage(decoded.rpCode)}`)
        }
        break
      }
    }

    return fills
  }

  /**
   * Fallback: pull summary fills day-by-day via exchange notifications.
   * Always bounded — never walk thousands of history dates in one serverless run.
   */
  async getFillsViaOrderHistory(params: {
    fcmId?: string
    ibId?: string
    accountId: string
    /** Pre-fetched / filtered YYYYMMDD dates. Listed from Rithmic when omitted. */
    dates?: string[]
    startDateYyyymmdd?: string
    /** Hard cap on day requests (default 60). */
    maxDates?: number
  }): Promise<RithmicProtocolFill[]> {
    const dates =
      params.dates ??
      (await this.listOrderHistoryDates()).filter(
        (d) => !params.startDateYyyymmdd || d >= params.startDateYyyymmdd,
      )
    const maxDates = Math.max(1, params.maxDates ?? 60)
    const selected =
      dates.length > maxDates ? dates.slice(dates.length - maxDates) : dates

    if (dates.length > selected.length) {
      console.warn(
        `[RITHMIC-PROTOCOL] Order-history fallback capped to last ${selected.length} of ${dates.length} date(s) for ${params.accountId}`,
      )
    }

    const fills: RithmicProtocolFill[] = []
    for (const date of selected) {
      try {
        const dayFills = await this.getOrderHistorySummaryFills({
          ...params,
          date,
        })
        fills.push(...dayFills)
      } catch (error) {
        console.warn(
          `[RITHMIC-PROTOCOL] Order history summary skipped for ${params.accountId} on ${date}`,
          error instanceof Error ? error.message : error,
        )
      }
    }
    return fills
  }

  private async getOrderHistorySummaryFills(params: {
    fcmId?: string
    ibId?: string
    accountId: string
    date: string
  }): Promise<RithmicProtocolFill[]> {
    await this.send('rti.RequestShowOrderHistorySummary', {
      templateId: RithmicTemplateId.SHOW_ORDER_HISTORY_SUMMARY_REQUEST,
      userMsg: ['deltalytix-history-summary'],
      fcmId: params.fcmId,
      ibId: params.ibId,
      accountId: params.accountId,
      date: params.date,
    })

    const fills: RithmicProtocolFill[] = []
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      const msg = await this.nextMatchingMessage(
        (id) =>
          id === RithmicTemplateId.EXCHANGE_ORDER_NOTIFICATION ||
          id === RithmicTemplateId.SHOW_ORDER_HISTORY_SUMMARY_RESPONSE ||
          id === RithmicTemplateId.REJECT,
        {
          overallTimeoutMs: Math.max(1_000, deadline - Date.now()),
          perMessageTimeoutMs: 30_000,
        },
      )

      if (msg.templateId === RithmicTemplateId.REJECT) {
        throw new Error('Order history summary rejected')
      }

      if (msg.templateId === RithmicTemplateId.EXCHANGE_ORDER_NOTIFICATION) {
        const fill = this.decodeExchangeFill(msg.raw, params.accountId)
        if (fill) fills.push(fill)
        continue
      }

      const decoded = decodeMessage<{ rpCode?: string[] }>(
        this.root!,
        'rti.ResponseShowOrderHistorySummary',
        msg.raw,
      )
      if (Array.isArray(decoded.rpCode) && decoded.rpCode.length > 0) {
        if (rpIsNoData(decoded.rpCode)) break
        if (!rpOk(decoded.rpCode)) {
          throw new Error(
            `Order history summary failed: ${rpMessage(decoded.rpCode)}`,
          )
        }
        break
      }
    }
    return fills
  }

  /**
   * List trade dates that have order history. Empty / "no data" → [].
   */
  async listOrderHistoryDates(): Promise<string[]> {
    await this.send('rti.RequestShowOrderHistoryDates', {
      templateId: RithmicTemplateId.SHOW_ORDER_HISTORY_DATES_REQUEST,
      userMsg: ['deltalytix-history-dates'],
    })

    const dates: string[] = []
    const deadline = Date.now() + 45_000
    while (Date.now() < deadline) {
      const msg = await this.nextMatchingMessage(
        (id) =>
          id === RithmicTemplateId.SHOW_ORDER_HISTORY_DATES_RESPONSE ||
          id === RithmicTemplateId.REJECT,
        {
          overallTimeoutMs: Math.max(1_000, deadline - Date.now()),
          perMessageTimeoutMs: 30_000,
        },
      )

      if (msg.templateId === RithmicTemplateId.REJECT) {
        throw new Error('History dates rejected by Rithmic')
      }

      const decoded = decodeMessage<{
        rpCode?: string[]
        date?: string[]
      }>(this.root!, 'rti.ResponseShowOrderHistoryDates', msg.raw)
      if (Array.isArray(decoded.date)) {
        dates.push(...decoded.date.map(String))
      }
      if (Array.isArray(decoded.rpCode) && decoded.rpCode.length > 0) {
        if (rpIsNoData(decoded.rpCode)) break
        if (!rpOk(decoded.rpCode)) {
          throw new Error(`History dates failed: ${rpMessage(decoded.rpCode)}`)
        }
        break
      }
    }
    return dates.map((d) => d.replace(/-/g, '')).sort()
  }

  private decodeExchangeFill(
    raw: Buffer,
    fallbackAccountId: string,
  ): RithmicProtocolFill | null {
    const decoded = decodeMessage<{
      notifyType?: number
      isSnapshot?: boolean
      accountId?: string
      fcmId?: string
      ibId?: string
      symbol?: string
      exchange?: string
      transactionType?: number | string
      fillPrice?: number
      fillSize?: number
      fillId?: string
      fillDate?: string
      fillTime?: string
      basketId?: string
      sequenceNumber?: string
      ssboe?: number
      usecs?: number
      avgFillPrice?: number
      price?: number
      quantity?: number
    }>(this.root!, 'rti.ExchangeOrderNotification', raw)

    if (decoded.notifyType != null && decoded.notifyType !== EXCHANGE_NOTIFY_FILL) {
      return null
    }

    const fillPrice = Number(decoded.fillPrice ?? decoded.avgFillPrice ?? decoded.price ?? 0)
    const fillSize = Number(decoded.fillSize ?? decoded.quantity ?? 0)
    if (!decoded.symbol || !fillPrice || !fillSize) return null

    return {
      accountId: decoded.accountId || fallbackAccountId,
      fcmId: decoded.fcmId,
      ibId: decoded.ibId,
      symbol: decoded.symbol,
      exchange: decoded.exchange,
      transactionType: String(decoded.transactionType ?? ''),
      fillPrice,
      fillSize,
      fillId: decoded.fillId,
      fillDate: decoded.fillDate,
      fillTime: decoded.fillTime,
      basketId: decoded.basketId,
      sequenceNumber: decoded.sequenceNumber,
      ssboe: decoded.ssboe,
      usecs: decoded.usecs,
      avgFillPrice:
        decoded.avgFillPrice != null ? Number(decoded.avgFillPrice) : undefined,
    }
  }

  async logout(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.root) return
    try {
      await this.send('rti.RequestLogout', {
        templateId: RithmicTemplateId.LOGOUT_REQUEST,
        userMsg: ['deltalytix-logout'],
      })
    } catch {
      // ignore logout errors
    }
  }

  async close(): Promise<void> {
    await this.logout()
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // ignore
      }
      this.ws = null
    }
    this.closed = true
  }
}

export async function connectAndListAccounts(params: {
  gatewayUri: string
  systemName: string
  username: string
  password: string
}): Promise<RithmicProtocolConnectResult> {
  const client = new RithmicProtocolClient()
  try {
    await client.connect(params.gatewayUri)
    const login = await client.login(params)
    const info = await client.loginInfo()
    const accounts = await client.listAccounts({
      fcmId: info.fcmId || login.fcmId,
      ibId: info.ibId || login.ibId,
      userType: info.userType,
    })
    return {
      accounts,
      fcmId: info.fcmId || login.fcmId,
      ibId: info.ibId || login.ibId,
      uniqueUserId: login.uniqueUserId,
    }
  } finally {
    await client.close()
  }
}

/** Earliest trade_date index we request when syncing all-time history. */
const ALL_TIME_START_YMD = 19900101
const FILL_HISTORY_PAGE_MAX = 10_000
/**
 * Leave headroom under Vercel's 300s maxDuration for auth, save, and teardown.
 * Fill fetch must finish (or stop cleanly) before this budget.
 */
const FILL_SYNC_BUDGET_MS = 240_000
/** Max day-by-day order-history requests if ShowFillHistory fails. */
const ORDER_HISTORY_FALLBACK_MAX_DATES = 60

function toYmdNumber(d: Date): number {
  return Number(
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`,
  )
}

function ymdToUtcDate(ymd: number): Date {
  const s = String(ymd).padStart(8, '0')
  return new Date(
    Date.UTC(
      Number(s.slice(0, 4)),
      Number(s.slice(4, 6)) - 1,
      Number(s.slice(6, 8)),
    ),
  )
}

function addDaysToYmd(ymd: number, days: number): number {
  const d = ymdToUtcDate(ymd)
  d.setUTCDate(d.getUTCDate() + days)
  return toYmdNumber(d)
}

function midpointYmd(startYmd: number, endYmd: number): number {
  const start = ymdToUtcDate(startYmd).getTime()
  const end = ymdToUtcDate(endYmd).getTime()
  return toYmdNumber(new Date(Math.floor((start + end) / 2)))
}

/**
 * Fetch fills for one account across [startYmd, endYmd].
 * One ShowFillHistory for the full span first; bisect only when a page hits
 * the 10k record cap (avoids dozens of year-chunk round-trips on empty accounts).
 */
async function getFillHistoryAllPages(
  client: RithmicProtocolClient,
  params: {
    fcmId?: string
    ibId?: string
    accountId: string
    startDateYyyymmdd: number
    endDateYyyymmdd: number
    deadlineMs: number
  },
): Promise<RithmicProtocolFill[]> {
  const fills: RithmicProtocolFill[] = []

  async function fetchRange(startYmd: number, endYmd: number): Promise<void> {
    if (startYmd > endYmd) return
    if (Date.now() >= params.deadlineMs) {
      throw new Error(
        `Fill history sync budget exceeded while fetching ${params.accountId} (${startYmd}-${endYmd})`,
      )
    }

    console.info(
      `[RITHMIC-PROTOCOL] ${params.accountId}: ShowFillHistory ${startYmd}-${endYmd}`,
    )

    const page = await client.getFillHistory({
      fcmId: params.fcmId,
      ibId: params.ibId,
      accountId: params.accountId,
      startDateYyyymmdd: startYmd,
      endDateYyyymmdd: endYmd,
      maxRecords: FILL_HISTORY_PAGE_MAX,
    })

    if (page.length >= FILL_HISTORY_PAGE_MAX && startYmd < endYmd) {
      const mid = midpointYmd(startYmd, endYmd)
      if (mid <= startYmd || mid >= endYmd) {
        // Single-day saturation — keep what we got and move on.
        fills.push(...page)
        return
      }
      await fetchRange(startYmd, mid)
      await fetchRange(addDaysToYmd(mid, 1), endYmd)
      return
    }

    fills.push(...page)
  }

  await fetchRange(params.startDateYyyymmdd, params.endDateYyyymmdd)
  return fills
}

export async function fetchFillsForAccounts(params: {
  gatewayUri: string
  systemName: string
  username: string
  password: string
  fcmId?: string
  ibId?: string
  accountIds: string[]
  /** When omitted/null, fetch all available history. */
  lookbackDays?: number | null
}): Promise<RithmicProtocolFill[]> {
  const client = new RithmicProtocolClient()
  const fills: RithmicProtocolFill[] = []
  const syncDeadline = Date.now() + FILL_SYNC_BUDGET_MS
  try {
    await client.connect(params.gatewayUri)
    const login = await client.login({
      systemName: params.systemName,
      username: params.username,
      password: params.password,
    })
    const info = await client.loginInfo()
    const fcmId = params.fcmId || info.fcmId || login.fcmId
    const ibId = params.ibId || info.ibId || login.ibId

    const end = new Date()
    const endYmd = toYmdNumber(end)
    const startYmd =
      params.lookbackDays != null && params.lookbackDays > 0
        ? toYmdNumber(
            new Date(
              end.getTime() - params.lookbackDays * 24 * 60 * 60 * 1000,
            ),
          )
        : ALL_TIME_START_YMD

    console.info(
      `[RITHMIC-PROTOCOL] Logged in; fetching history for ${params.accountIds.join(', ')}`,
    )

    for (const accountId of params.accountIds) {
      let rangeStart = startYmd
      let rangeEnd = endYmd
      let historyDatesInRange: string[] = []

      try {
        const historyDates = await client.listOrderHistoryDates()
        historyDatesInRange = historyDates.filter((d) => {
          const n = Number(d)
          return Number.isFinite(n) && n >= startYmd && n <= endYmd
        })
        console.info(
          `[RITHMIC-PROTOCOL] ${accountId}: ${historyDates.length} history date(s), ${historyDatesInRange.length} in range`,
        )
        if (historyDatesInRange.length === 0) {
          // Empty account — do not hang on fill/order history probes.
          console.info(
            `[RITHMIC-PROTOCOL] ${accountId}: no history dates — treating as 0 fills`,
          )
          continue
        }
        rangeStart = Number(historyDatesInRange[0])
        rangeEnd = Number(historyDatesInRange[historyDatesInRange.length - 1])
      } catch (error) {
        console.warn(
          `[RITHMIC-PROTOCOL] Could not list history dates for ${accountId}; probing recent fill history`,
          error instanceof Error ? error.message : error,
        )
        // Avoid scanning back to 1990 when dates are unavailable.
        rangeStart =
          params.lookbackDays != null && params.lookbackDays > 0
            ? startYmd
            : toYmdNumber(
                new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000),
              )
      }

      let accountFills: RithmicProtocolFill[] = []
      let fillHistorySucceeded = false
      try {
        accountFills = await getFillHistoryAllPages(client, {
          fcmId,
          ibId,
          accountId,
          startDateYyyymmdd: rangeStart,
          endDateYyyymmdd: rangeEnd,
          deadlineMs: syncDeadline,
        })
        fillHistorySucceeded = true
      } catch (error) {
        console.warn(
          `[RITHMIC-PROTOCOL] Fill history failed for ${accountId}`,
          error instanceof Error ? error.message : error,
        )
      }

      // Only fall back when ShowFillHistory failed. A successful empty result
      // must not walk thousands of history dates day-by-day (Vercel 300s kill).
      if (
        accountFills.length === 0 &&
        !fillHistorySucceeded &&
        historyDatesInRange.length > 0 &&
        Date.now() < syncDeadline
      ) {
        console.warn(
          `[RITHMIC-PROTOCOL] ${accountId}: bounded order-history fallback (max ${ORDER_HISTORY_FALLBACK_MAX_DATES} days)`,
        )
        accountFills = await client.getFillsViaOrderHistory({
          fcmId,
          ibId,
          accountId,
          dates: historyDatesInRange,
          maxDates: ORDER_HISTORY_FALLBACK_MAX_DATES,
        })
      } else if (
        accountFills.length === 0 &&
        fillHistorySucceeded &&
        historyDatesInRange.length > 0
      ) {
        console.info(
          `[RITHMIC-PROTOCOL] ${accountId}: ShowFillHistory returned 0 fills across ${historyDatesInRange.length} history date(s) — skipping day-by-day fallback`,
        )
      }

      console.info(
        `[RITHMIC-PROTOCOL] ${accountId}: ${accountFills.length} fills`,
      )
      fills.push(...accountFills)
    }

    return fills
  } finally {
    await client.close()
  }
}
