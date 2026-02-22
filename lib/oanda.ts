/**
 * OANDA API client for real-time trading data
 * https://developer.oanda.com/
 */

export interface OANDAPosition {
  instrument: string
  long: {
    units: string
    realizedPL: string
    unrealizedPL: string
    averagePrice: string
  }
  short: {
    units: string
    realizedPL: string
    unrealizedPL: string
    averagePrice: string
  }
}

export interface OANDAAccount {
  id: string
  alias: string
  currency: string
  balance: string
  unrealizedPL: string
  marginRate: string
  marginUsed: string
  marginAvailable: string
  openTradeCount: number
  openPositionCount: number
  withdrawalLimit: string
  homeConversionFactors: Record<string, string>
}

export interface OANDATrade {
  id: string
  instrument: string
  openTime: string
  state: 'OPEN' | 'CLOSED' | 'CLOSE_WHEN_REACHABLE'
  initialUnits: string
  initialMarginRequired: string
  currentUnits: string
  realizedPL: string
  unrealizedPL: string
  averageClosePrice: string
  closingTime: string
  clientExtensions?: {
    comment?: string
    tag?: string
  }
  financing: string
  dividendAdjustment: string
  closeTime?: string
  financing?: string
  averagePrice: string
  priceProfitLoss: string
  tradeOpenedID: string
  tradeReducedID?: string
  tradeClosedIDs?: string[]
}

const BASE_URLS = {
  practice: 'https://api-fxpractice.oanda.com/v3',
  live: 'https://api-fxtrade.oanda.com/v3',
}

const STREAM_BASE_URLS = {
  practice: 'https://stream-fxpractice.oanda.com/v3',
  live: 'https://stream-fxtrade.oanda.com/v3',
}

export class OANDAClient {
  private apiKey: string
  private accountId: string
  private environment: 'practice' | 'live'
  private baseUrl: string
  private streamBaseUrl: string

  constructor(
    apiKey: string = process.env.DELTALYTIX_OANDA_API_KEY || '',
    accountId: string = process.env.DELTALYTIX_OANDA_ACCOUNT_ID || '',
    environment: 'practice' | 'live' = (process.env.DELTALYTIX_OANDA_ENVIRONMENT as 'practice' | 'live') || 'practice'
  ) {
    this.apiKey = apiKey
    this.accountId = accountId
    this.environment = environment
    this.baseUrl = BASE_URLS[environment]
    this.streamBaseUrl = STREAM_BASE_URLS[environment]
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'AcceptDatetimeFormat': 'UNIX',
      'Content-Type': 'application/json',
    }
  }

  /**
   * Get account details
   */
  async getAccount(): Promise<OANDAAccount> {
    const response = await fetch(`${this.baseUrl}/accounts/${this.accountId}`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`OANDA API error: ${response.status}`)
    }

    const data = await response.json()
    return data.account
  }

  /**
   * Get all positions
   */
  async getPositions(): Promise<OANDAPosition[]> {
    const response = await fetch(`${this.baseUrl}/accounts/${this.accountId}/openPositions`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`OANDA API error: ${response.status}`)
    }

    const data = await response.json()
    return data.positions
  }

  /**
   * Get open trades
   */
  async getOpenTrades(): Promise<OANDATrade[]> {
    const response = await fetch(`${this.baseUrl}/accounts/${this.accountId}/openTrades`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`OANDA API error: ${response.status}`)
    }

    const data = await response.json()
    return data.trades
  }

  /**
   * Get closed trades (trades history)
   */
  async getClosedTrades(limit: number = 500): Promise<OANDATrade[]> {
    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/trades?state=CLOSED&count=${limit}`,
      { headers: this.getHeaders() }
    )

    if (!response.ok) {
      throw new Error(`OANDA API error: ${response.status}`)
    }

    const data = await response.json()
    return data.trades
  }

  /**
   * Get all trades since a specific time
   */
  async getTradesSince(fromTime: string): Promise<OANDATrade[]> {
    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/trades?from=${fromTime}`,
      { headers: this.getHeaders() }
    )

    if (!response.ok) {
      throw new Error(`OANDA API error: ${response.status}`)
    }

    const data = await response.json()
    return data.trades
  }

  /**
   * Stream pricing data for real-time updates
   */
  streamPrices(instruments: string[], onMessage: (price: any) => void, onError: (error: Error) => void) {
    const params = new URLSearchParams({
      instruments: instruments.join(','),
    })

    const url = `${this.streamBaseUrl}/accounts/${this.accountId}/pricing/stream?${params}`

    const eventSource = new EventSource(url)

    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error('Failed to parse price update:', error)
      }
    })

    eventSource.addEventListener('error', () => {
      onError(new Error('Price stream connection error'))
      eventSource.close()
    })

    return () => eventSource.close()
  }

  /**
   * Verify API connection and credentials
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const account = await this.getAccount()
      return !!account.id
    } catch (error) {
      console.error('OANDA connection verification failed:', error)
      return false
    }
  }
}

export const createOANDAClient = () => {
  return new OANDAClient()
}
