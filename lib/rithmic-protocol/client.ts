import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

/** Proto dir next to this module — traced into Vercel/serverless via next.config. */
const PROTO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'proto')

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

    const msg = await this.nextMessage()
    if (msg.templateId !== RithmicTemplateId.LOGIN_RESPONSE) {
      throw new Error(`Unexpected login response template ${msg.templateId}`)
    }
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
    const msg = await this.nextMessage()
    if (msg.templateId !== RithmicTemplateId.LOGIN_INFO_RESPONSE) {
      throw new Error(`Unexpected login info template ${msg.templateId}`)
    }
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
    const requestUserType = params.userType ?? 3
    await this.send('rti.RequestAccountList', {
      templateId: RithmicTemplateId.ACCOUNT_LIST_REQUEST,
      userMsg: ['deltalytix-accounts'],
      fcmId: params.fcmId,
      ibId: params.ibId,
      userType: requestUserType,
    })

    const accounts: RithmicProtocolAccount[] = []
    let responseCount = 0
    for (;;) {
      const msg = await this.nextMessage()
      if (msg.templateId === RithmicTemplateId.ACCOUNT_LIST_RESPONSE) {
        responseCount += 1
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
          if (!rpOk(decoded.rpCode)) {
            throw new Error(`Account list failed: ${rpMessage(decoded.rpCode)}`)
          }
          break
        }
        continue
      }

      if (msg.templateId === RithmicTemplateId.REJECT) {
        throw new Error('Account list rejected by Rithmic')
      }

      // Ignore unrelated push messages during account list.
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

    for (;;) {
      const msg = await this.nextMessage(60_000)

      if (msg.templateId === RithmicTemplateId.SHOW_FILL_HISTORY_RESPONSE) {
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
          if (!rpOk(decoded.rpCode)) {
            throw new Error(`Fill history failed: ${rpMessage(decoded.rpCode)}`)
          }
          break
        }
        continue
      }

      // Summary/detail streams may also emit exchange notifications.
      if (msg.templateId === RithmicTemplateId.EXCHANGE_ORDER_NOTIFICATION) {
        const fill = this.decodeExchangeFill(msg.raw, params.accountId)
        if (fill) fills.push(fill)
        continue
      }

      if (msg.templateId === RithmicTemplateId.REJECT) {
        throw new Error('Fill history rejected by Rithmic')
      }

      if (
        msg.templateId === RithmicTemplateId.HEARTBEAT_RESPONSE ||
        msg.templateId === RithmicTemplateId.RITHMIC_ORDER_NOTIFICATION
      ) {
        continue
      }
    }

    return fills
  }

  /**
   * Fallback: list history dates then pull summary fills via exchange notifications.
   */
  async getFillsViaOrderHistory(params: {
    fcmId?: string
    ibId?: string
    accountId: string
    startDateYyyymmdd: string
  }): Promise<RithmicProtocolFill[]> {
    await this.send('rti.RequestShowOrderHistoryDates', {
      templateId: RithmicTemplateId.SHOW_ORDER_HISTORY_DATES_REQUEST,
      userMsg: ['deltalytix-history-dates'],
    })

    const dates: string[] = []
    for (;;) {
      const msg = await this.nextMessage()
      if (msg.templateId !== RithmicTemplateId.SHOW_ORDER_HISTORY_DATES_RESPONSE) {
        continue
      }
      const decoded = decodeMessage<{
        rpCode?: string[]
        date?: string[]
      }>(this.root!, 'rti.ResponseShowOrderHistoryDates', msg.raw)
      if (Array.isArray(decoded.date)) {
        dates.push(...decoded.date.map(String))
      }
      if (Array.isArray(decoded.rpCode) && decoded.rpCode.length > 0) {
        if (!rpOk(decoded.rpCode)) {
          throw new Error(`History dates failed: ${rpMessage(decoded.rpCode)}`)
        }
        break
      }
    }

    const filtered = dates
      .map(String)
      .filter((d) => d.replace(/-/g, '') >= params.startDateYyyymmdd)
      .sort()

    const fills: RithmicProtocolFill[] = []
    for (const date of filtered) {
      const dayFills = await this.getOrderHistorySummaryFills({
        ...params,
        date: date.replace(/-/g, ''),
      })
      fills.push(...dayFills)
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
    for (;;) {
      const msg = await this.nextMessage(60_000)

      if (msg.templateId === RithmicTemplateId.EXCHANGE_ORDER_NOTIFICATION) {
        const fill = this.decodeExchangeFill(msg.raw, params.accountId)
        if (fill) fills.push(fill)
        continue
      }

      if (
        msg.templateId === RithmicTemplateId.SHOW_ORDER_HISTORY_SUMMARY_RESPONSE
      ) {
        const decoded = decodeMessage<{ rpCode?: string[] }>(
          this.root!,
          'rti.ResponseShowOrderHistorySummary',
          msg.raw,
        )
        if (Array.isArray(decoded.rpCode) && decoded.rpCode.length > 0) {
          if (!rpOk(decoded.rpCode)) {
            throw new Error(
              `Order history summary failed: ${rpMessage(decoded.rpCode)}`,
            )
          }
          break
        }
        continue
      }

      if (msg.templateId === RithmicTemplateId.REJECT) {
        throw new Error('Order history summary rejected')
      }
    }
    return fills
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

  /**
   * Pre-login probe: RequestRithmicSystemInfo → list of system_name values.
   * Rithmic expects this on a short-lived connection before RequestLogin.
   */
  async requestSystemInfo(): Promise<string[]> {
    await this.send('rti.RequestRithmicSystemInfo', {
      templateId: RithmicTemplateId.RITHMIC_SYSTEM_INFO_REQUEST,
      userMsg: ['deltalytix-system-info'],
    })
    const msg = await this.nextMessage()
    if (msg.templateId !== RithmicTemplateId.RITHMIC_SYSTEM_INFO_RESPONSE) {
      throw new Error(`Unexpected system info template ${msg.templateId}`)
    }
    const decoded = decodeMessage<{
      rpCode?: string[]
      systemName?: string[]
    }>(this.root!, 'rti.ResponseRithmicSystemInfo', msg.raw)
    if (!rpOk(decoded.rpCode)) {
      throw new Error(`System info failed: ${rpMessage(decoded.rpCode)}`)
    }
    return Array.isArray(decoded.systemName)
      ? decoded.systemName.map(String).filter(Boolean)
      : []
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

  /** Close the socket without sending Logout (used for pre-login probes). */
  async disconnect(): Promise<void> {
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

  async close(): Promise<void> {
    await this.logout()
    await this.disconnect()
  }
}

/**
 * Open a short-lived websocket, ask for available system names, then close.
 * Matches Rithmic's recommended pre-login sequence.
 */
export async function fetchAvailableSystems(
  gatewayUri: string,
): Promise<string[]> {
  const client = new RithmicProtocolClient()
  try {
    await client.connect(gatewayUri)
    return await client.requestSystemInfo()
  } finally {
    await client.disconnect()
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

export async function fetchFillsForAccounts(params: {
  gatewayUri: string
  systemName: string
  username: string
  password: string
  fcmId?: string
  ibId?: string
  accountIds: string[]
  lookbackDays: number
}): Promise<RithmicProtocolFill[]> {
  const client = new RithmicProtocolClient()
  const fills: RithmicProtocolFill[] = []
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
    const start = new Date(end.getTime() - params.lookbackDays * 24 * 60 * 60 * 1000)
    const toYmd = (d: Date) =>
      Number(
        `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`,
      )
    const startYmd = toYmd(start)
    const endYmd = toYmd(end)
    const startYmdStr = String(startYmd)

    for (const accountId of params.accountIds) {
      try {
        const accountFills = await client.getFillHistory({
          fcmId,
          ibId,
          accountId,
          startDateYyyymmdd: startYmd,
          endDateYyyymmdd: endYmd,
        })
        fills.push(...accountFills)
      } catch (error) {
        console.warn(
          `[RITHMIC-PROTOCOL] Fill history failed for ${accountId}, falling back to order history`,
          error instanceof Error ? error.message : error,
        )
        const fallback = await client.getFillsViaOrderHistory({
          fcmId,
          ibId,
          accountId,
          startDateYyyymmdd: startYmdStr,
        })
        fills.push(...fallback)
      }
    }

    return fills
  } finally {
    await client.close()
  }
}
