import embed from './it/embed'

export default {
  ...embed,
  timeRangePerformance: {
    title: 'Prestazione per Intervallo di Tempo',
    description: 'Distribuzione del P&L medio e del tasso di vincita su diversi tempi di detenzione',
    tooltip: {
      timeRange: 'Intervallo di Tempo',
      avgPnl: 'P&L Medio',
      winRate: 'Tasso di Vincita',
      trades: {
        one: '{count} operazione',
        other: '{count} operazioni'
      }
    },
    ranges: {
      under1min: 'Meno di 1m',
      '1to5min': '1-5m',
      '5to10min': '5-10m',
      '10to15min': '10-15m',
      '15to30min': '15-30m',
      '30to60min': '30-60m',
      '1to2hours': '1-2h',
      '2to5hours': '2-5h',
      over5hours: 'Oltre 5h'
    },
    clearFilter: 'Cancella filtro'
  },
}
