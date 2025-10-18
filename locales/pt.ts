import embed from './pt/embed'

export default {
  ...embed,
  timeRangePerformance: {
    title: 'Desempenho por Intervalo de Tempo',
    description: 'Distribuição do P&L médio e taxa de vitória em diferentes tempos de retenção',
    tooltip: {
      timeRange: 'Intervalo de Tempo',
      avgPnl: 'P&L Médio',
      winRate: 'Taxa de Vitória',
      trades: {
        one: '{count} operação',
        other: '{count} operações'
      }
    },
    ranges: {
      under1min: 'Menos de 1m',
      '1to5min': '1-5m',
      '5to10min': '5-10m',
      '10to15min': '10-15m',
      '15to30min': '15-30m',
      '30to60min': '30-60m',
      '1to2hours': '1-2h',
      '2to5hours': '2-5h',
      over5hours: 'Mais de 5h'
    },
    clearFilter: 'Limpar filtro'
  },
}
