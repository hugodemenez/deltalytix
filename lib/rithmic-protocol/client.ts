import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import protobuf from 'protobufjs'
import WebSocket from 'ws'
import {
  EXCHANGE_NOTIFY_FILL,
  ORDER_PLANT,
  PNL_PLANT,
  RithmicTemplateId,
} from './templates'
import type {
  RithmicProtocolAccount,
  RithmicProtocolAccountBalance,
  RithmicProtocolConnectResult,
  RithmicProtocolFill,
} from './types'
import { mapAccountPnLUpdateToBalance } from './balances'
import {
  indexProductRmsCommissionRates,
  mapProductRmsCommissionRow,
  type ProductRmsCommissionRow,
} from './commission-rates'
import {
  getRithmicProtocolAppName,
  getRithmicProtocolAppVersion,
  normalizeGatewayUri,
} from './systems'

/** Wall-clock budget for a full PnL snapshot sweep across a user's accounts. */
const PNL_SNAPSHOT_TOTAL_BUDGET_MS = 30_000
/** Per-message wait inside that sweep. */
const PNL_SNAPSHOT_MESSAGE_TIMEOUT_MS = 15_000

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
  'request_product_rms_info.proto',
  'response_product_rms_info.proto',
  'request_pnl_position_snapshot.proto',
  'response_pnl_position_snapshot.proto',
  'account_pnl_position_update.proto',
  'instrument_pnl_position_update.proto',
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

/** Rithmic rp_code `7 no data` — empty history window, not a hard failure. */
function rpIsNoData(rpCode: unknown): boolean {
  if (!Array.isArray(rpCode) || rpCode.length === 0) return false
  return String(rpCode[0]) === '7'
}

function rpMessage(rpCode: unknown): string {
  if (!Array.isArray(rpCode)) return 'Unknown Rithmic error'
  return rpCode.map(String).join(' ')
}

/**
 * Map a ResponseShowFillHistory row. Some plants populate `price` /
 * `avg_fill_price` without `fill_price` — accept any of the three.
 */
export function mapShowFillHistoryRow(
  decoded: {
    accountId?: string
    fcmId?: string
    ibId?: string
    symbol?: string
    exchange?: string
    transactionType?: string | number
    price?: number
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
  },
  fallbackAccountId: string,
): RithmicProtocolFill | null {
  if (!decoded.symbol) return null
  const fillPrice = Number(
    decoded.fillPrice ?? decoded.avgFillPrice ?? decoded.price ?? NaN,
  )
  if (!Number.isFinite(fillPrice)) return null
  const fillSize = Number(decoded.fillSize ?? 0)
  if (!Number.isFinite(fillSize) || fillSize <= 0) return null

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
    /** Defaults to ORDER_PLANT. Use PNL_PLANT for live account balances. */
    infraType?: number
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
      infraType: params.infraType ?? ORDER_PLANT,
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
   * Product RMS rows (template 306/307), including per-product commission_fill_rate.
   * Same source as R | API+ ProductRmsListInfo / the Orders CSV Commission Fill Rate.
   */
  async getProductRmsInfo(params: {
    fcmId?: string
    ibId?: string
    accountId: string
  }): Promise<ProductRmsCommissionRow[]> {
    await this.send('rti.RequestProductRmsInfo', {
      templateId: RithmicTemplateId.PRODUCT_RMS_INFO_REQUEST,
      userMsg: [`deltalytix-product-rms-${params.accountId}`],
      fcmId: params.fcmId,
      ibId: params.ibId,
      accountId: params.accountId,
    })

    const rows: ProductRmsCommissionRow[] = []
    for (;;) {
      const msg = await this.nextMessage()
      if (msg.templateId === RithmicTemplateId.PRODUCT_RMS_INFO_RESPONSE) {
        const decoded = decodeMessage<{
          rpCode?: string[]
          accountId?: string
          productCode?: string
          commissionFillRate?: number
          presenceBits?: number
        }>(this.root!, 'rti.ResponseProductRmsInfo', msg.raw)

        const mapped = mapProductRmsCommissionRow({
          accountId: decoded.accountId || params.accountId,
          productCode: decoded.productCode,
          commissionFillRate: decoded.commissionFillRate,
          presenceBits: decoded.presenceBits,
        })
        if (mapped) rows.push(mapped)

        if (Array.isArray(decoded.rpCode) && decoded.rpCode.length > 0) {
          if (rpIsNoData(decoded.rpCode)) break
          if (!rpOk(decoded.rpCode)) {
            throw new Error(
              `Product RMS info failed: ${rpMessage(decoded.rpCode)}`,
            )
          }
          break
        }
        continue
      }

      if (msg.templateId === RithmicTemplateId.REJECT) {
        throw new Error('Product RMS info rejected by Rithmic')
      }

      if (
        msg.templateId === RithmicTemplateId.HEARTBEAT_RESPONSE ||
        msg.templateId === RithmicTemplateId.RITHMIC_ORDER_NOTIFICATION
      ) {
        continue
      }
    }

    return rows
  }

  /**
   * PnL plant: request an account balance / PnL snapshot (template 402).
   * Collects AccountPnLPositionUpdate (451) until ResponsePnLPositionSnapshot (403).
   */
  async getAccountPnLSnapshots(params: {
    fcmId?: string
    ibId?: string
    accountIds: string[]
    /** Wall-clock budget for the whole sweep, not per account. */
    deadlineMs?: number
  }): Promise<RithmicProtocolAccountBalance[]> {
    const balancesByAccountId = new Map<string, RithmicProtocolAccountBalance>()
    const deadline =
      Date.now() + (params.deadlineMs ?? PNL_SNAPSHOT_TOTAL_BUDGET_MS)

    for (const accountId of params.accountIds) {
      if (!accountId?.trim()) continue

      // Accounts are swept sequentially, so one silent account must not be
      // allowed to burn the budget of every account behind it.
      if (Date.now() >= deadline) {
        console.warn(
          '[RITHMIC-PROTOCOL] PnL snapshot budget exhausted, skipping remaining accounts',
        )
        break
      }

      try {
        await this.send('rti.RequestPnLPositionSnapshot', {
          templateId: RithmicTemplateId.PNL_POSITION_SNAPSHOT_REQUEST,
          userMsg: [`deltalytix-pnl-${accountId}`],
          fcmId: params.fcmId,
          ibId: params.ibId,
          accountId,
        })
      } catch (error) {
        console.warn(
          `[RITHMIC-PROTOCOL] PnL snapshot send failed for ${accountId}, returning balances collected so far`,
          error,
        )
        break
      }

      let outOfTime = false
      let socketClosed = false
      try {
        for (;;) {
          const remaining = deadline - Date.now()
          if (remaining <= 0) {
            outOfTime = true
            break
          }

          const msg = await this.nextMessage(
            Math.min(PNL_SNAPSHOT_MESSAGE_TIMEOUT_MS, remaining),
          )

          if (msg.templateId === RithmicTemplateId.ACCOUNT_PNL_POSITION_UPDATE) {
            const decoded = decodeMessage<{
              accountId?: string
              fcmId?: string
              ibId?: string
              accountBalance?: string | number
              cashOnHand?: string | number
              marginBalance?: string | number
              availableBuyingPower?: string | number
              openPositionPnl?: string | number
              closedPositionPnl?: string | number
              dayPnl?: string | number
            }>(this.root!, 'rti.AccountPnLPositionUpdate', msg.raw)
            const balance = mapAccountPnLUpdateToBalance(decoded)
            if (balance) {
              balancesByAccountId.set(balance.account_id, balance)
            }
            continue
          }

          if (msg.templateId === RithmicTemplateId.INSTRUMENT_PNL_POSITION_UPDATE) {
            // Instrument rows arrive interleaved with account snapshots — ignore.
            continue
          }

          if (msg.templateId === RithmicTemplateId.PNL_POSITION_SNAPSHOT_RESPONSE) {
            const decoded = decodeMessage<{ rpCode?: string[] }>(
              this.root!,
              'rti.ResponsePnLPositionSnapshot',
              msg.raw,
            )
            if (
              Array.isArray(decoded.rpCode) &&
              decoded.rpCode.length > 0 &&
              !rpOk(decoded.rpCode) &&
              !rpIsNoData(decoded.rpCode)
            ) {
              console.warn(
                `[RITHMIC-PROTOCOL] PnL snapshot failed for ${accountId}: ${rpMessage(decoded.rpCode)}`,
              )
            }
            break
          }

          if (msg.templateId === RithmicTemplateId.REJECT) {
            console.warn(
              `[RITHMIC-PROTOCOL] PnL snapshot rejected for account ${accountId}`,
            )
            break
          }

          // Ignore heartbeats / unrelated pushes during the snapshot.
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        socketClosed = message.includes('WebSocket closed')
        console.warn(
          `[RITHMIC-PROTOCOL] PnL snapshot interrupted for ${accountId}, keeping earlier balances`,
          error,
        )
        if (socketClosed) break
        continue
      }

      if (outOfTime) {
        console.warn(
          `[RITHMIC-PROTOCOL] PnL snapshot budget exhausted while waiting on ${accountId}`,
        )
        break
      }
    }

    return [...balancesByAccountId.values()]
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
          price?: number
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

        const mapped = mapShowFillHistoryRow(decoded, params.accountId)
        if (mapped) fills.push(mapped)

        if (Array.isArray(decoded.rpCode) && decoded.rpCode.length > 0) {
          if (rpOk(decoded.rpCode) || rpIsNoData(decoded.rpCode)) {
            break
          }
          throw new Error(`Fill history failed: ${rpMessage(decoded.rpCode)}`)
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
   * Replay recent executions (template 3506). On Rithmic Test, same-day fills often
   * appear here before ShowFillHistory / order-history dates publish the trade date.
   */
  async replayExecutions(params: {
    fcmId?: string
    ibId?: string
    accountId: string
    startSsboe: number
    finishSsboe: number
  }): Promise<RithmicProtocolFill[]> {
    await this.send('rti.RequestReplayExecutions', {
      templateId: RithmicTemplateId.REPLAY_EXECUTIONS_REQUEST,
      userMsg: ['deltalytix-replay-executions'],
      fcmId: params.fcmId,
      ibId: params.ibId,
      accountId: params.accountId,
      startIndex: params.startSsboe,
      finishIndex: params.finishSsboe,
    })

    const fills: RithmicProtocolFill[] = []
    for (;;) {
      const msg = await this.nextMessage(60_000)

      if (msg.templateId === RithmicTemplateId.EXCHANGE_ORDER_NOTIFICATION) {
        const fill = this.decodeExchangeFill(msg.raw, params.accountId)
        if (fill) fills.push(fill)
        continue
      }

      if (msg.templateId === RithmicTemplateId.REPLAY_EXECUTIONS_RESPONSE) {
        const decoded = decodeMessage<{ rpCode?: string[] }>(
          this.root!,
          'rti.ResponseReplayExecutions',
          msg.raw,
        )
        if (Array.isArray(decoded.rpCode) && decoded.rpCode.length > 0) {
          if (rpOk(decoded.rpCode) || rpIsNoData(decoded.rpCode)) {
            break
          }
          throw new Error(
            `Replay executions failed: ${rpMessage(decoded.rpCode)}`,
          )
        }
        continue
      }

      if (msg.templateId === RithmicTemplateId.REJECT) {
        throw new Error('Replay executions rejected by Rithmic')
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
          if (rpIsNoData(decoded.rpCode)) {
            break
          }
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
          if (rpIsNoData(decoded.rpCode)) {
            break
          }
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
      notifyType?: number | string
      reportType?: string
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

    if (decoded.notifyType != null) {
      const notify = decoded.notifyType
      const isFill =
        notify === EXCHANGE_NOTIFY_FILL ||
        String(notify).toUpperCase() === 'FILL'
      if (!isFill) return null
    } else if (
      decoded.reportType != null &&
      String(decoded.reportType).toLowerCase() !== 'fill'
    ) {
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

/**
 * Product RMS commission_fill_rate per account, without pulling fill history.
 * Used by Protocol e2e and as the same Order-plant call sync uses.
 */
export async function fetchProductCommissionRates(params: {
  gatewayUri: string
  systemName: string
  username: string
  password: string
  fcmId?: string
  ibId?: string
  accountIds: string[]
  accounts?: Array<{ accountId: string; fcmId?: string; ibId?: string }>
}): Promise<{
  rates: Map<string, number>
  rows: ProductRmsCommissionRow[]
  uniqueUserId?: string
  accounts: RithmicProtocolAccount[]
}> {
  const client = new RithmicProtocolClient()
  try {
    console.log(
      `[RITHMIC-PROTOCOL] Product RMS connect gateway=${params.gatewayUri} system=${params.systemName}`,
    )
    await client.connect(params.gatewayUri)
    const login = await client.login({
      systemName: params.systemName,
      username: params.username,
      password: params.password,
    })
    const info = await client.loginInfo()
    const loginFcmId = params.fcmId || info.fcmId || login.fcmId
    const loginIbId = params.ibId || info.ibId || login.ibId
    console.log(
      `[RITHMIC-PROTOCOL] Product RMS login ok unique_user_id=${login.uniqueUserId ?? '(none)'} fcm=${loginFcmId ?? '(none)'} ib=${loginIbId ?? '(none)'}`,
    )
    const listed = await client.listAccounts({
      fcmId: loginFcmId,
      ibId: loginIbId,
      userType: info.userType,
    })
    console.log(
      `[RITHMIC-PROTOCOL] Product RMS listed ${listed.length} account(s): ${listed.map((account) => account.accountId).join(', ') || '(none)'}`,
    )
    const accountMeta = new Map(
      [...(params.accounts ?? []), ...listed].map((account) => [
        account.accountId,
        account,
      ]),
    )
    const accountIds =
      params.accountIds.length > 0
        ? params.accountIds
        : listed.map((account) => account.accountId)

    const rows: ProductRmsCommissionRow[] = []
    for (const accountId of accountIds) {
      const meta = accountMeta.get(accountId)
      const productRms = await client.getProductRmsInfo({
        fcmId: meta?.fcmId || loginFcmId,
        ibId: meta?.ibId || loginIbId,
        accountId,
      })
      rows.push(...productRms)
      console.log(
        `[RITHMIC-PROTOCOL] Product RMS for ${accountId}: ${productRms.length} commission rate(s)` +
          (productRms.length > 0
            ? ` (${productRms.map((row) => `${row.productCode}=${row.commissionFillRate}`).join(', ')})`
            : ''),
      )
    }

    return {
      rates: indexProductRmsCommissionRates(rows),
      rows,
      uniqueUserId: login.uniqueUserId,
      accounts: listed,
    }
  } finally {
    await client.close()
  }
}

/**
 * Live account balances via the Protocol PnL plant (AccountPnLPositionUpdate).
 * Uses a dedicated PNL_PLANT login — separate from ORDER_PLANT fill sync.
 */
export async function fetchAccountBalances(params: {
  gatewayUri: string
  systemName: string
  username: string
  password: string
  fcmId?: string
  ibId?: string
  accountIds: string[]
  /** Wall-clock budget for the snapshot sweep once logged in. */
  deadlineMs?: number
}): Promise<{
  balances: RithmicProtocolAccountBalance[]
  fcmId?: string
  ibId?: string
}> {
  const accountIds = [...new Set(params.accountIds.map((id) => id.trim()).filter(Boolean))]
  if (accountIds.length === 0) {
    return { balances: [], fcmId: params.fcmId, ibId: params.ibId }
  }

  const client = new RithmicProtocolClient()
  try {
    await client.connect(params.gatewayUri)
    const login = await client.login({
      systemName: params.systemName,
      username: params.username,
      password: params.password,
      infraType: PNL_PLANT,
    })
    const fcmId = params.fcmId || login.fcmId
    const ibId = params.ibId || login.ibId
    const balances = await client.getAccountPnLSnapshots({
      fcmId,
      ibId,
      accountIds,
      deadlineMs: params.deadlineMs,
    })
    return { balances, fcmId, ibId }
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
  /** Optional cached per-account FCM/IB from connect time. */
  accounts?: Array<{ accountId: string; fcmId?: string; ibId?: string }>
  /**
   * Preferred: UTC YYYY-MM-DD when the account started trading.
   * Sync walks from this date through today in serial ≤30-day windows.
   */
  historyStartDate?: string
  /** Fallback when `historyStartDate` is missing (legacy connections). */
  lookbackDays?: number
}): Promise<{
  fills: RithmicProtocolFill[]
  uniqueUserId?: string
  commissionRates: Map<string, number>
}> {
  /** Rithmic guidance: ≤30 days of fill history per ShowFillHistory request. */
  const MAX_FILL_WINDOW_DAYS = 30
  const client = new RithmicProtocolClient()
  const fills: RithmicProtocolFill[] = []
  const rmsRows: ProductRmsCommissionRow[] = []
  try {
    await client.connect(params.gatewayUri)
    const login = await client.login({
      systemName: params.systemName,
      username: params.username,
      password: params.password,
    })
    const info = await client.loginInfo()
    const loginFcmId = params.fcmId || info.fcmId || login.fcmId
    const loginIbId = params.ibId || info.ibId || login.ibId
    const uniqueUserId = login.uniqueUserId

    console.log(
      `[RITHMIC-PROTOCOL] Sync session unique_user_id=${uniqueUserId ?? '(none)'} at ${new Date().toISOString()} (UTC)`,
    )

    // Prop-firm systems (e.g. LucidTrading) often stamp a different FCM/IB on
    // each trading account than ResponseLogin. Prefer a fresh list from this
    // session; fall back to cached connect-time metadata.
    const accountMeta = new Map<
      string,
      { accountId: string; fcmId?: string; ibId?: string }
    >()
    for (const account of params.accounts ?? []) {
      accountMeta.set(account.accountId, account)
    }
    try {
      const listedAccounts = await client.listAccounts({
        fcmId: loginFcmId,
        ibId: loginIbId,
        userType: info.userType,
      })
      for (const account of listedAccounts) {
        accountMeta.set(account.accountId, account)
      }
    } catch (error) {
      console.warn(
        '[RITHMIC-PROTOCOL] Re-list accounts during sync failed; using cached FCM/IB',
        error instanceof Error ? error.message : error,
      )
    }

    const accountIds =
      params.accountIds.length > 0
        ? params.accountIds
        : [...accountMeta.keys()]

    const end = utcCalendarDay(new Date())
    const start = resolveHistoryStartUtc(params.historyStartDate, params.lookbackDays, end)
    const windows = buildUtcFillHistoryWindowsFromRange(start, end, MAX_FILL_WINDOW_DAYS)
    const startYmdStr = toYyyymmddString(start)
    const lookbackDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    )

    console.log(
      `[RITHMIC-PROTOCOL] Fill history range ${startYmdStr}–${toYyyymmddString(end)} (${windows.length} × ≤${MAX_FILL_WINDOW_DAYS}d windows)`,
    )

    // Accounts and ≤30-day windows are requested serially (await each response fully).
    for (const accountId of accountIds) {
      const meta = accountMeta.get(accountId)
      const fcmId = meta?.fcmId || loginFcmId
      const ibId = meta?.ibId || loginIbId
      console.log(
        `[RITHMIC-PROTOCOL] Account ${accountId} using fcm=${fcmId ?? '(none)'} ib=${ibId ?? '(none)'}`,
      )

      try {
        const productRms = await client.getProductRmsInfo({
          fcmId,
          ibId,
          accountId,
        })
        rmsRows.push(...productRms)
        console.log(
          `[RITHMIC-PROTOCOL] Product RMS for ${accountId}: ${productRms.length} commission rate(s)`,
        )
      } catch (error) {
        console.warn(
          `[RITHMIC-PROTOCOL] Product RMS info failed for ${accountId}`,
          error instanceof Error ? error.message : error,
        )
      }

      let historyFills = 0
      let usedOrderHistoryFallback = false
      for (const window of windows) {
        try {
          const accountFills = await client.getFillHistory({
            fcmId,
            ibId,
            accountId,
            startDateYyyymmdd: toYyyymmddNumber(window.start),
            endDateYyyymmdd: toYyyymmddNumber(window.end),
          })
          historyFills += accountFills.length
          fills.push(...accountFills)
        } catch (error) {
          console.warn(
            `[RITHMIC-PROTOCOL] Fill history failed for ${accountId} (${toYyyymmddString(window.start)}–${toYyyymmddString(window.end)}), falling back to order history`,
            error instanceof Error ? error.message : error,
          )
          if (!usedOrderHistoryFallback) {
            usedOrderHistoryFallback = true
            const fallback = await client.getFillsViaOrderHistory({
              fcmId,
              ibId,
              accountId,
              startDateYyyymmdd: startYmdStr,
            })
            console.log(
              `[RITHMIC-PROTOCOL] Order-history fallback for ${accountId}: ${fallback.length} fill(s)`,
            )
            fills.push(...fallback)
          }
          break
        }
      }

      // ShowFillHistory can return rp_code 7 (no data) with no exception — common
      // on some prop-firm plants. Still try order-history dates before giving up.
      if (historyFills === 0 && !usedOrderHistoryFallback) {
        try {
          const fallback = await client.getFillsViaOrderHistory({
            fcmId,
            ibId,
            accountId,
            startDateYyyymmdd: startYmdStr,
          })
          console.log(
            `[RITHMIC-PROTOCOL] Empty ShowFillHistory for ${accountId}; order-history fallback: ${fallback.length} fill(s)`,
          )
          fills.push(...fallback)
        } catch (error) {
          console.warn(
            `[RITHMIC-PROTOCOL] Order-history fallback failed for ${accountId}`,
            error instanceof Error ? error.message : error,
          )
        }
      } else {
        console.log(
          `[RITHMIC-PROTOCOL] ShowFillHistory for ${accountId}: ${historyFills} fill(s)`,
        )
      }

      // Same-day fills on Test often land in ReplayExecutions before ShowFillHistory
      // publishes the trade date (history dates currently lag behind UTC "today").
      const finishSsboe = Math.floor(Date.now() / 1000) + 60
      const startSsboe = finishSsboe - Math.min(lookbackDays, 2) * 24 * 60 * 60
      try {
        const replayed = await client.replayExecutions({
          fcmId,
          ibId,
          accountId,
          startSsboe,
          finishSsboe,
        })
        if (replayed.length > 0) {
          console.log(
            `[RITHMIC-PROTOCOL] ReplayExecutions returned ${replayed.length} fill(s) for ${accountId}`,
          )
          fills.push(...replayed)
        }
      } catch (error) {
        console.warn(
          `[RITHMIC-PROTOCOL] ReplayExecutions failed for ${accountId}`,
          error instanceof Error ? error.message : error,
        )
      }
    }

    return {
      fills: dedupeFills(fills),
      uniqueUserId,
      commissionRates: indexProductRmsCommissionRates(rmsRows),
    }
  } finally {
    await client.close()
  }
}

function toYyyymmddNumber(d: Date): number {
  return Number(toYyyymmddString(d))
}

function toYyyymmddString(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
}

function dedupeFills(fills: RithmicProtocolFill[]): RithmicProtocolFill[] {
  const seen = new Set<string>()
  const out: RithmicProtocolFill[] = []
  for (const fill of fills) {
    const key = [
      fill.accountId,
      fill.basketId ?? '',
      fill.fillId ?? '',
      fill.symbol,
      fill.transactionType,
      fill.fillPrice,
      fill.fillSize,
      fill.ssboe ?? '',
      fill.fillDate ?? '',
      fill.fillTime ?? '',
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(fill)
  }
  return out
}

function utcCalendarDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function parseUtcYyyyMmDd(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

function resolveHistoryStartUtc(
  historyStartDate: string | undefined,
  lookbackDays: number | undefined,
  end: Date,
): Date {
  if (historyStartDate) {
    const parsed = parseUtcYyyyMmDd(historyStartDate)
    if (parsed && parsed.getTime() <= end.getTime()) {
      return parsed
    }
  }
  const days = Math.max(1, lookbackDays ?? 30)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return start
}

/** Oldest → newest windows of at most `maxWindowDays` (UTC calendar days), inclusive. */
function buildUtcFillHistoryWindowsFromRange(
  start: Date,
  end: Date,
  maxWindowDays: number,
): Array<{ start: Date; end: Date }> {
  const windows: Array<{ start: Date; end: Date }> = []
  let cursor = utcCalendarDay(start)
  const last = utcCalendarDay(end)

  while (cursor.getTime() <= last.getTime()) {
    const windowEnd = new Date(cursor)
    windowEnd.setUTCDate(windowEnd.getUTCDate() + (maxWindowDays - 1))
    if (windowEnd.getTime() > last.getTime()) {
      windowEnd.setTime(last.getTime())
    }
    windows.push({ start: new Date(cursor), end: new Date(windowEnd) })
    cursor = new Date(windowEnd)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return windows
}
