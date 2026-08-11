export interface RithmicPerformanceImportData {
  headers: string[]
  processedData: string[][]
}

const ENTRY_ORDER_HEADER = 'Entry Order Number'

const isAccountNumber = (value: string) => {
  return value.length > 8 &&
    !/^[A-Z]{3}\d$/.test(value) &&
    !/^\d+$/.test(value) &&
    value !== 'Account' &&
    value !== ENTRY_ORDER_HEADER
}

const isInstrument = (value: string) => {
  // Match common futures instrument patterns such as ESZ4, MESZ4, and ZNH3.
  return /^[A-Z]{2,4}\d{1,2}$/.test(value)
}

export const processRithmicPerformance = (
  data: string[][],
): RithmicPerformanceImportData => {
  const processedData: string[][] = []
  let currentAccountNumber = ''
  let currentInstrument = ''
  let headers: string[] = []

  data.forEach((row) => {
    const firstCell = row[0]?.trim() ?? ''
    const isTradeHeader = row.some(
      (value) => value.trim() === ENTRY_ORDER_HEADER,
    )

    // Newer Rithmic exports prefix the trade fields with "Trade Date". Detect
    // the identifying order column anywhere in the row so both layouts work.
    if (isTradeHeader) {
      headers = ['AccountNumber', 'Instrument', ...row]
    } else if (firstCell && isAccountNumber(firstCell)) {
      currentAccountNumber = firstCell
    } else if (firstCell && isInstrument(firstCell)) {
      currentInstrument = firstCell
    } else if (headers.length > 0 && firstCell && firstCell !== 'Account') {
      processedData.push([currentAccountNumber, currentInstrument, ...row])
    }
  })

  return { headers, processedData }
}
