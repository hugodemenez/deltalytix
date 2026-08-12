import { describe, expect, it } from 'vitest'
import { processRithmicPerformance } from './rithmic-performance-import'

describe('processRithmicPerformance', () => {
  it('keeps supporting exports where Entry Order Number is the first trade column', () => {
    const result = processRithmicPerformance([
      ['BX-M407010817610'],
      ['MESZ4'],
      ['Entry Order Number', 'Entry Buy/Sell', 'Entry Time'],
      ['1001', 'B', '2025-03-10 09:35:12'],
    ])

    expect(result).toEqual({
      headers: [
        'AccountNumber',
        'Instrument',
        'Entry Order Number',
        'Entry Buy/Sell',
        'Entry Time',
      ],
      processedData: [[
        'BX-M407010817610',
        'MESZ4',
        '1001',
        'B',
        '2025-03-10 09:35:12',
      ]],
    })
  })

  it('recognizes newer exports with Trade Date before Entry Order Number', () => {
    const result = processRithmicPerformance([
      ['Account', 'Trade P&L', 'Commission & Fees'],
      ['BX-M407010817610', '47.50', '2.44'],
      ['MESU6', '47.50', '2.44'],
      [
        'Trade Date',
        'Entry Order Number',
        'Entry Buy/Sell',
        'Entry Time',
      ],
      ['20260811', '2605467589', 'S', '2026-08-11 13:07:41'],
    ])

    expect(result).toEqual({
      headers: [
        'AccountNumber',
        'Instrument',
        'Trade Date',
        'Entry Order Number',
        'Entry Buy/Sell',
        'Entry Time',
      ],
      processedData: [[
        'BX-M407010817610',
        'MESU6',
        '20260811',
        '2605467589',
        'S',
        '2026-08-11 13:07:41',
      ]],
    })
  })
})
