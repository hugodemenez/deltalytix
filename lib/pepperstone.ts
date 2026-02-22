/**
 * Pepperstone FIX API Client
 * https://help.ctrader.com/fix/
 * 
 * FIX Configuration:
 * - Host: live-uk-eqx-02.p.c-trader.com
 * - Port: 5212 (SSL) or 5202 (Plain text)
 * - SenderCompID: live.pepperstoneuk.{accountId}
 * - TargetCompID: cServer
 * - SenderSubID: TRADE
 */

import net from 'net'
import tls from 'tls'

export interface PepperstonePosition {
  symbol: string
  quantity: number
  averagePrice: number
  unrealizedPL: number
  side: 'BUY' | 'SELL'
}

export interface PepperstoneAccount {
  accountId: string
  currency: string
  balance: number
  equity: number
  margin: number
  freeMargin: number
  marginLevel: number
  openPositions: number
}

export interface PepperstoneTrade {
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  openPrice: number
  openTime: Date
  closePrice?: number
  closeTime?: Date
  profit: number
  status: 'OPEN' | 'CLOSED'
}

class FIXMessage {
  private fields: Map<string, string> = new Map()
  private messageType: string = ''

  constructor(messageType: string) {
    this.messageType = messageType
    this.setField('35', messageType)
  }

  setField(tag: string, value: string): void {
    this.fields.set(tag, value)
  }

  getField(tag: string): string | undefined {
    return this.fields.get(tag)
  }

  encode(): Buffer {
    let message = ''
    const orderedFields = new Map(this.fields)
    
    // FIX message format: tag=value|tag=value|...
    let bodyLength = 0
    let body = ''
    
    orderedFields.forEach((value, tag) => {
      if (tag !== '8' && tag !== '9' && tag !== '10') { // Skip BeginString, BodyLength, Checksum
        const field = `${tag}=${value}\x01`
        body += field
        bodyLength += field.length
      }
    })

    message = `8=FIX.4.4\x01`
    message += `9=${bodyLength}\x01`
    message += body

    // Calculate checksum
    let checksum = 0
    for (let i = 0; i < message.length; i++) {
      checksum += message.charCodeAt(i)
    }
    checksum = checksum % 256

    message += `10=${String(checksum).padStart(3, '0')}\x01`
    
    return Buffer.from(message)
  }

  static parse(buffer: Buffer): FIXMessage | null {
    const str = buffer.toString()
    const fields = str.split('\x01')
    
    if (fields.length < 2) return null

    const msg = new FIXMessage('')
    
    for (const field of fields) {
      const [tag, value] = field.split('=')
      if (tag && value) {
        msg.setField(tag, value)
      }
    }

    const msgType = msg.getField('35')
    if (msgType) {
      msg.messageType = msgType
    }

    return msg
  }
}

export class PepperstoneFIXClient {
  private socket: net.Socket | tls.TLSSocket | null = null
  private host: string = 'live-uk-eqx-02.p.c-trader.com'
  private port: number = 5212
  private senderCompId: string
  private password: string
  private accountId: string
  private useSSL: boolean = true
  private connected: boolean = false
  private messageSequence: number = 1
  private responseCallbacks: Map<number, (msg: FIXMessage) => void> = new Map()

  constructor(
    accountId: string = process.env.DELTALYTIX_PEPPERSTONE_ACCOUNT_ID || '',
    password: string = process.env.DELTALYTIX_PEPPERSTONE_PASSWORD || '',
    host?: string,
    port?: number,
    useSSL: boolean = true
  ) {
    this.accountId = accountId
    this.password = password
    this.senderCompId = `live.pepperstoneuk.${accountId}`
    this.host = host || 'live-uk-eqx-02.p.c-trader.com'
    this.port = port || (useSSL ? 5212 : 5202)
    this.useSSL = useSSL
  }

  /**
   * Connect to FIX server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.useSSL) {
          this.socket = tls.connect(
            this.port,
            this.host,
            { rejectUnauthorized: false },
            () => this.handleConnect(resolve, reject)
          )
        } else {
          this.socket = net.createConnection(
            { host: this.host, port: this.port },
            () => this.handleConnect(resolve, reject)
          )
        }

        this.socket!.on('data', (data) => this.handleData(data))
        this.socket!.on('error', (err) => reject(err))
        this.socket!.on('close', () => {
          this.connected = false
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  private handleConnect(resolve: () => void, reject: (err: Error) => void): void {
    // Send Logon message
    const logon = new FIXMessage('A')
    logon.setField('34', this.messageSequence.toString())
    logon.setField('49', this.senderCompId)
    logon.setField('56', 'cServer')
    logon.setField('57', 'TRADE')
    logon.setField('52', new Date().toISOString())
    logon.setField('98', '0')
    logon.setField('108', '30')
    logon.setField('141', 'Y')
    logon.setField('553', this.accountId)
    logon.setField('554', this.password)

    this.messageSequence++
    this.send(logon)
    this.connected = true
    resolve()
  }

  private handleData(data: Buffer): void {
    const message = FIXMessage.parse(data)
    if (!message) return

    const msgType = message.getField('35')
    const msgSeq = message.getField('34')

    if (msgSeq) {
      const callback = this.responseCallbacks.get(parseInt(msgSeq))
      if (callback) {
        callback(message)
        this.responseCallbacks.delete(parseInt(msgSeq))
      }
    }

    // Handle heartbeats
    if (msgType === '0') {
      const heartbeat = new FIXMessage('0')
      heartbeat.setField('34', this.messageSequence.toString())
      heartbeat.setField('49', this.senderCompId)
      heartbeat.setField('56', 'cServer')
      this.messageSequence++
      this.send(heartbeat)
    }
  }

  private send(message: FIXMessage): void {
    if (!this.socket || !this.connected) {
      throw new Error('Not connected to FIX server')
    }
    const encoded = message.encode()
    this.socket.write(encoded)
  }

  /**
   * Request account details
   */
  async getAccount(): Promise<PepperstoneAccount> {
    // Send Account Info Request (type 15)
    const request = new FIXMessage('15')
    request.setField('34', this.messageSequence.toString())
    request.setField('49', this.senderCompId)
    request.setField('56', 'cServer')
    request.setField('57', 'TRADE')

    return new Promise((resolve, reject) => {
      this.responseCallbacks.set(this.messageSequence, (response) => {
        const msgType = response.getField('35')
        
        if (msgType === 'AE' || msgType === 'U1') { // Allocation or Account Update
          const account: PepperstoneAccount = {
            accountId: this.accountId,
            currency: 'USD',
            balance: parseFloat(response.getField('901') || '0'),
            equity: parseFloat(response.getField('902') || '0'),
            margin: parseFloat(response.getField('903') || '0'),
            freeMargin: parseFloat(response.getField('904') || '0'),
            marginLevel: parseFloat(response.getField('905') || '0'),
            openPositions: parseInt(response.getField('35') || '0'),
          }
          resolve(account)
        } else {
          reject(new Error('Invalid response type'))
        }
      })

      this.messageSequence++
      this.send(request)

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Account request timeout'))
      }, 5000)
    })
  }

  /**
   * Request open positions
   */
  async getPositions(): Promise<PepperstonePosition[]> {
    const request = new FIXMessage('AN')
    request.setField('34', this.messageSequence.toString())
    request.setField('49', this.senderCompId)
    request.setField('56', 'cServer')
    request.setField('57', 'TRADE')
    request.setField('581', '0') // Account request type: all positions

    return new Promise((resolve, reject) => {
      this.responseCallbacks.set(this.messageSequence, (response) => {
        const positions: PepperstonePosition[] = []
        
        // Parse position data from response
        // FIX response will contain multiple position records
        let i = 0
        while (response.getField(`${453}.${++i}`) !== undefined) {
          const symbol = response.getField(`${453}.${i}.55`) || ''
          const quantity = parseFloat(response.getField(`${453}.${i}.38`) || '0')
          const price = parseFloat(response.getField(`${453}.${i}.44`) || '0')
          const pnl = parseFloat(response.getField(`${453}.${i}.256`) || '0')
          const side = response.getField(`${453}.${i}.54`) === '1' ? 'BUY' : 'SELL'

          if (symbol) {
            positions.push({
              symbol,
              quantity,
              averagePrice: price,
              unrealizedPL: pnl,
              side,
            })
          }
        }

        resolve(positions)
      })

      this.messageSequence++
      this.send(request)

      setTimeout(() => {
        reject(new Error('Position request timeout'))
      }, 5000)
    })
  }

  /**
   * Request trade history
   */
  async getTrades(): Promise<PepperstoneTrade[]> {
    const request = new FIXMessage('AD')
    request.setField('34', this.messageSequence.toString())
    request.setField('49', this.senderCompId)
    request.setField('56', 'cServer')
    request.setField('57', 'TRADE')

    return new Promise((resolve, reject) => {
      this.responseCallbacks.set(this.messageSequence, (response) => {
        const trades: PepperstoneTrade[] = []

        // Parse trade data from response
        let i = 0
        while (response.getField(`${382}.${++i}`) !== undefined) {
          const symbol = response.getField(`${382}.${i}.55`) || ''
          const side = response.getField(`${382}.${i}.54`) === '1' ? 'BUY' : 'SELL'
          const quantity = parseFloat(response.getField(`${382}.${i}.38`) || '0')
          const openPrice = parseFloat(response.getField(`${382}.${i}.44`) || '0')
          const openTime = new Date(response.getField(`${382}.${i}.60`) || new Date())
          const status = response.getField(`${382}.${i}.39`) === 'F' ? 'CLOSED' : 'OPEN'
          const closePrice = parseFloat(response.getField(`${382}.${i}.423`) || '0')
          const profit = parseFloat(response.getField(`${382}.${i}.256`) || '0')

          if (symbol) {
            trades.push({
              symbol,
              side,
              quantity,
              openPrice,
              openTime,
              status,
              profit,
              closePrice: closePrice || undefined,
              closeTime: status === 'CLOSED' ? new Date() : undefined,
            })
          }
        }

        resolve(trades)
      })

      this.messageSequence++
      this.send(request)

      setTimeout(() => {
        reject(new Error('Trade request timeout'))
      }, 5000)
    })
  }

  /**
   * Disconnect from FIX server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy()
      this.connected = false
    }
  }

  /**
   * Verify connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.connect()
      const account = await this.getAccount()
      this.disconnect()
      return !!account.accountId
    } catch (error) {
      console.error('Pepperstone FIX connection verification failed:', error)
      return false
    }
  }
}

export const createPepperstoneClient = () => {
  return new PepperstoneFIXClient()
}

