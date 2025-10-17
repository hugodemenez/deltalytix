export default {
  embed: {
    charts: {
      timeRangePerformance: 'Time Range Performance',
      dailyPnl: 'Daily PnL',
      timeOfDay: 'Time of Day Performance',
      timeInPosition: 'Time in Position',
      pnlBySide: 'PnL by Side',
      tradeDistribution: 'Trade Distribution',
      weekdayPnl: 'Weekday PnL',
      pnlPerContract: 'PnL per Contract',
      pnlPerContractDaily: 'PnL per Contract (Daily)',
      tickDistribution: 'Tick Distribution',
      commissionsPnl: 'Commissions PnL',
      contractQuantity: 'Contract Quantity',
    },

    descriptions: {
      timeRangePerformance:
        'Shows average PnL and win rate for trades grouped by time in position',
      pnlBySide: 'Compare long vs short performance. Toggle average/total.',
      dailyPnl:
        'Daily total PnL aggregated from trades. Tooltip shows long/short counts.',
      timeOfDay:
        'Performance distribution across hours of the day to reveal optimal trading periods.',
      timeInPosition:
        'How long positions are typically held before being closed.',
      tradeDistribution:
        'Distribution of trades by PnL to visualize skewness and tails.',
      weekdayPnl:
        'Average performance by day of the week to identify weekly patterns.',
      pnlPerContract:
        'Performance grouped by instrument/contract to compare edges.',
      pnlPerContractDaily:
        'Daily PnL breakdown per selected instrument/contract.',
      tickDistribution:
        'Histogram of PnL in ticks to analyze trade outcome dispersion.',
      commissionsPnl:
        'Commissions impact on PnL to understand net profitability.',
      contractQuantity:
        'Distribution of position sizes (quantity) across trades.',
    },

    labels: {
      averagePnl: 'Average PnL',
      totalPnl: 'Total PnL',
      pnl: 'PnL',
      timeRange: 'Time Range',
      winRate: 'Win Rate',
      totalTrades: 'Total Trades',
      trades: 'Trades',
      date: 'Date',
      long: 'Long',
      short: 'Short',
      longTrades: 'Long trades',
      shortTrades: 'Short trades',
      average: 'Average',
      total: 'Total',
      instrument: 'Instrument',
      quantity: 'Quantity',
      commission: 'Commission',
    },

    actions: {
      showTotal: 'Show total',
      showAverage: 'Show average',
    },

    tooltips: {
      timeRangePerformance:
        'Shows average PnL and win rate for trades grouped by time in position',
      pnlBySide: 'Compare long vs short performance. Toggle average/total.',
      dailyPnl:
        'Daily total PnL aggregated from trades. Tooltip shows long/short counts.',
    },

    timeRanges: {
      under1min: '< 1m',
      '1to5min': '1-5m',
      '5to10min': '5-10m',
      '10to15min': '10-15m',
      '15to30min': '15-30m',
      '30to60min': '30-60m',
      '1to2hours': '1-2h',
      '2to5hours': '2-5h',
      over5hours: '> 5h',
    },

    toasts: {
      noTradesProvided: 'No trades provided',
      generatingRandomTrades: 'Generating {count} random trades',
      errorProcessingMessage: 'Error processing message',
    },

    aria: {
      clickToAddToSelection: 'Click to add "{name}" to selection',
    },
  },
}
