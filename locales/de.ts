import embed from './de/embed'

export default {
  ...embed,
  timeRangePerformance: {
    title: 'Leistung nach Zeitbereich',
    description: 'Durchschnittlicher P&L und Gewinnratenverteilung über verschiedene Haltezeiten',
    tooltip: {
      timeRange: 'Zeitbereich',
      avgPnl: 'Durchschnittlicher P&L',
      winRate: 'Gewinnrate',
      trades: {
        one: '{count} Trade',
        other: '{count} Trades'
      }
    },
    ranges: {
      under1min: 'Unter 1m',
      '1to5min': '1-5m',
      '5to10min': '5-10m',
      '10to15min': '10-15m',
      '15to30min': '15-30m',
      '30to60min': '30-60m',
      '1to2hours': '1-2h',
      '2to5hours': '2-5h',
      over5hours: 'Über 5h'
    },
    clearFilter: 'Filter löschen'
  },
}
