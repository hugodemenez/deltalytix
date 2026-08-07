import { describe, expect, it } from 'vitest'
import {
  matchExecutionsFifo,
  parseFlexStatement,
  type FlexExecution,
} from './ibkr-flex-trades'

function statement(trades: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<FlexQueryResponse queryName="Deltalytix" type="AF">
<FlexStatements count="1">
<FlexStatement accountId="U1234567" fromDate="20250101" toDate="20250131">
<Trades>
${trades}
</Trades>
</FlexStatement>
</FlexStatements>
</FlexQueryResponse>`
}

function execution(overrides: Partial<FlexExecution> = {}): FlexExecution {
  return {
    accountId: 'U1234567',
    tradeId: 'T1',
    rawSymbol: 'MESZ5',
    instrument: 'MES',
    assetCategory: 'FUT',
    currency: 'USD',
    multiplier: 5,
    side: 'BUY',
    quantity: 1,
    price: 5000,
    commission: 0,
    timestamp: '2025-01-15T09:30:00.000+00:00',
    ...overrides,
  }
}

describe('parseFlexStatement', () => {
  it('reads execution rows into normalized executions', () => {
    const xml = statement(
      `<Trade accountId="U1234567" currency="USD" assetCategory="FUT" symbol="MESZ5" underlyingSymbol="MES" multiplier="5" tradeID="111" dateTime="20250115;093000" buySell="BUY" quantity="2" tradePrice="5000.25" ibCommission="-1.24" levelOfDetail="EXECUTION" />`,
    )

    const { executions, stats } = parseFlexStatement(xml)

    expect(executions).toHaveLength(1)
    expect(executions[0]).toMatchObject({
      accountId: 'U1234567',
      tradeId: '111',
      rawSymbol: 'MESZ5',
      instrument: 'MES',
      multiplier: 5,
      side: 'BUY',
      quantity: 2,
      price: 5000.25,
      // Flex reports commissions as negative; we store the magnitude.
      commission: 1.24,
      timestamp: '2025-01-15T09:30:00.000+00:00',
    })
    expect(stats.accountIds).toEqual(['U1234567'])
    expect(stats.currencies).toEqual(['USD'])
  })

  it('uses the plain symbol for equities and the underlying for futures', () => {
    const xml = statement(
      `<Trade assetCategory="STK" symbol="AAPL" underlyingSymbol="" tradeID="1" dateTime="20250115;093000" buySell="BUY" quantity="10" tradePrice="200" levelOfDetail="EXECUTION" />
       <Trade assetCategory="FUT" symbol="MESZ5" underlyingSymbol="MES" tradeID="2" dateTime="20250115;093100" buySell="BUY" quantity="1" tradePrice="5000" levelOfDetail="EXECUTION" />`,
    )

    const { executions } = parseFlexStatement(xml)
    expect(executions.map((e) => e.instrument)).toEqual(['AAPL', 'MES'])
  })

  it('ignores CLOSED_LOT and ORDER rows so positions are not double counted', () => {
    const xml = statement(
      `<Trade symbol="MESZ5" underlyingSymbol="MES" assetCategory="FUT" tradeID="1" dateTime="20250115;093000" buySell="BUY" quantity="1" tradePrice="5000" levelOfDetail="EXECUTION" />
       <Trade symbol="MESZ5" underlyingSymbol="MES" assetCategory="FUT" tradeID="1" dateTime="20250115;093000" buySell="BUY" quantity="1" tradePrice="5000" levelOfDetail="ORDER" />
       <Trade symbol="MESZ5" underlyingSymbol="MES" assetCategory="FUT" tradeID="1" dateTime="20250115;093000" buySell="BUY" quantity="1" tradePrice="5000" levelOfDetail="CLOSED_LOT" />`,
    )

    const { executions, stats } = parseFlexStatement(xml)
    expect(executions).toHaveLength(1)
    expect(stats.closedLotRows).toBe(1)
    expect(stats.tradeRows).toBe(3)
  })

  it('counts rows it cannot date instead of importing them at the wrong time', () => {
    const xml = statement(
      `<Trade symbol="AAPL" assetCategory="STK" tradeID="1" dateTime="03/04/2025" buySell="BUY" quantity="1" tradePrice="200" levelOfDetail="EXECUTION" />`,
    )

    const { executions, stats } = parseFlexStatement(xml)
    expect(executions).toHaveLength(0)
    expect(stats.skippedUnparseableDate).toBe(1)
  })

  it('sorts executions oldest first regardless of document order', () => {
    const xml = statement(
      `<Trade symbol="AAPL" assetCategory="STK" tradeID="2" dateTime="20250115;120000" buySell="SELL" quantity="1" tradePrice="210" levelOfDetail="EXECUTION" />
       <Trade symbol="AAPL" assetCategory="STK" tradeID="1" dateTime="20250115;093000" buySell="BUY" quantity="1" tradePrice="200" levelOfDetail="EXECUTION" />`,
    )

    const { executions } = parseFlexStatement(xml)
    expect(executions.map((e) => e.tradeId)).toEqual(['1', '2'])
  })

  it('treats a quoted attribute containing > as data, not as the end of the tag', () => {
    const xml = statement(
      `<Trade symbol="AAPL" assetCategory="STK" description="A &gt; B" tradeID="1" dateTime="20250115;093000" buySell="BUY" quantity="1" tradePrice="200" levelOfDetail="EXECUTION" />`,
    )

    const { executions } = parseFlexStatement(xml)
    expect(executions).toHaveLength(1)
    expect(executions[0].tradeId).toBe('1')
  })
})

describe('matchExecutionsFifo', () => {
  it('pairs a simple long round-turn and applies the multiplier', () => {
    const trades = matchExecutionsFifo([
      execution({ tradeId: 'A', side: 'BUY', quantity: 1, price: 5000 }),
      execution({
        tradeId: 'B',
        side: 'SELL',
        quantity: 1,
        price: 5010,
        timestamp: '2025-01-15T10:00:00.000+00:00',
      }),
    ])

    expect(trades).toHaveLength(1)
    expect(trades[0]).toMatchObject({
      side: 'Long',
      quantity: 1,
      entryPrice: 5000,
      closePrice: 5010,
      // 10 points x 1 contract x $5 multiplier
      pnl: 50,
      timeInPosition: 1800,
      entryId: 'A',
      closeId: 'B',
    })
  })

  it('signs a short round-turn correctly', () => {
    const trades = matchExecutionsFifo([
      execution({ tradeId: 'A', side: 'SELL', quantity: 1, price: 5010 }),
      execution({
        tradeId: 'B',
        side: 'BUY',
        quantity: 1,
        price: 5000,
        timestamp: '2025-01-15T10:00:00.000+00:00',
      }),
    ])

    expect(trades).toHaveLength(1)
    expect(trades[0]).toMatchObject({ side: 'Short', pnl: 50 })
  })

  it('splits a closing execution across several open lots in FIFO order', () => {
    const trades = matchExecutionsFifo([
      execution({ tradeId: 'A', side: 'BUY', quantity: 1, price: 5000 }),
      execution({
        tradeId: 'B',
        side: 'BUY',
        quantity: 1,
        price: 5020,
        timestamp: '2025-01-15T09:45:00.000+00:00',
      }),
      execution({
        tradeId: 'C',
        side: 'SELL',
        quantity: 2,
        price: 5010,
        timestamp: '2025-01-15T10:00:00.000+00:00',
      }),
    ])

    expect(trades).toHaveLength(2)
    // Oldest lot closes first: +10 points, then -10 points.
    expect(trades[0]).toMatchObject({ entryId: 'A', entryPrice: 5000, pnl: 50 })
    expect(trades[1]).toMatchObject({ entryId: 'B', entryPrice: 5020, pnl: -50 })
  })

  it('prorates commission across a partially matched execution', () => {
    const trades = matchExecutionsFifo([
      execution({ tradeId: 'A', side: 'BUY', quantity: 2, price: 5000, commission: 2 }),
      execution({
        tradeId: 'B',
        side: 'SELL',
        quantity: 1,
        price: 5010,
        commission: 1,
        timestamp: '2025-01-15T10:00:00.000+00:00',
      }),
    ])

    expect(trades).toHaveLength(1)
    // Half of the 2.00 entry commission plus all of the 1.00 exit commission.
    expect(trades[0].commission).toBe(2)
    expect(trades[0].quantity).toBe(1)
  })

  it('closes the outstanding position before opening the other side on a flip', () => {
    const trades = matchExecutionsFifo([
      execution({ tradeId: 'A', side: 'BUY', quantity: 1, price: 5000 }),
      execution({
        tradeId: 'B',
        side: 'SELL',
        quantity: 3,
        price: 5010,
        timestamp: '2025-01-15T10:00:00.000+00:00',
      }),
      execution({
        tradeId: 'C',
        side: 'BUY',
        quantity: 2,
        price: 5005,
        timestamp: '2025-01-15T11:00:00.000+00:00',
      }),
    ])

    // One long round-turn, then the 2-lot short opened by the flip and closed by C.
    expect(trades).toHaveLength(2)
    expect(trades[0]).toMatchObject({ side: 'Long', quantity: 1 })
    expect(trades[1]).toMatchObject({ side: 'Short', quantity: 2, pnl: 50 })
  })

  it('does not emit anything for a position that is still open', () => {
    expect(matchExecutionsFifo([execution({ side: 'BUY', quantity: 1 })])).toEqual([])
  })

  it('keeps different contracts and accounts in separate FIFO queues', () => {
    const trades = matchExecutionsFifo([
      execution({ tradeId: 'A', rawSymbol: 'MESZ5', side: 'BUY', quantity: 1, price: 5000 }),
      execution({
        tradeId: 'B',
        rawSymbol: 'MNQZ5',
        side: 'SELL',
        quantity: 1,
        price: 18000,
        timestamp: '2025-01-15T10:00:00.000+00:00',
      }),
    ])

    // Opposite sides, but different contracts — nothing should pair.
    expect(trades).toEqual([])
  })
})
