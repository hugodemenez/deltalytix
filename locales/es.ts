import embed from './es/embed'

export default {
  ...embed,
  timeRangePerformance: {
    title: 'Rendimiento por Rango de Tiempo',
    description: 'Distribución del P&L promedio y la tasa de ganancia en diferentes tiempos de retención',
    tooltip: {
      timeRange: 'Rango de Tiempo',
      avgPnl: 'P&L Promedio',
      winRate: 'Tasa de Ganancia',
      trades: {
        one: '{count} operación',
        other: '{count} operaciones'
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
      over5hours: 'Más de 5h'
    },
    clearFilter: 'Limpiar filtro'
  },
}
