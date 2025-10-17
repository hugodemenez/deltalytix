export default {
  embed: {
    charts: {
      timeRangePerformance: 'Rendimiento por Rango de Tiempo',
      dailyPnl: 'PnL Diario',
      timeOfDay: 'Rendimiento por Hora del Día',
      timeInPosition: 'Tiempo en Posición',
      pnlBySide: 'PnL por Dirección',
      tradeDistribution: 'Distribución de Operaciones',
      weekdayPnl: 'PnL por Día de la Semana',
      pnlPerContract: 'PnL por Contrato',
      pnlPerContractDaily: 'PnL por Contrato (Diario)',
      tickDistribution: 'Distribución de Ticks',
      commissionsPnl: 'PnL de Comisiones',
      contractQuantity: 'Cantidad de Contratos',
    },

    descriptions: {
      timeRangePerformance:
        'Muestra el PnL promedio y la tasa de ganancia para operaciones agrupadas por tiempo en posición',
      pnlBySide: 'Compara el rendimiento de long vs short. Alterna entre promedio/total.',
      dailyPnl:
        'PnL total diario agregado de operaciones. El tooltip muestra conteos de long/short.',
      timeOfDay:
        'Distribución del rendimiento a lo largo de las horas del día para revelar periodos óptimos de trading.',
      timeInPosition:
        'Cuánto tiempo se mantienen típicamente las posiciones antes de cerrarse.',
      tradeDistribution:
        'Distribución de operaciones por PnL para visualizar asimetría y colas.',
      weekdayPnl:
        'Rendimiento promedio por día de la semana para identificar patrones semanales.',
      pnlPerContract:
        'Rendimiento agrupado por instrumento/contrato para comparar ventajas.',
      pnlPerContractDaily:
        'Desglose diario del PnL por instrumento/contrato seleccionado.',
      tickDistribution:
        'Histograma del PnL en ticks para analizar la dispersión de resultados de operaciones.',
      commissionsPnl:
        'Impacto de las comisiones en el PnL para entender la rentabilidad neta.',
      contractQuantity:
        'Distribución de tamaños de posición (cantidad) a través de operaciones.',
    },

    labels: {
      averagePnl: 'PnL Promedio',
      totalPnl: 'PnL Total',
      pnl: 'PnL',
      timeRange: 'Rango de Tiempo',
      winRate: 'Tasa de Ganancia',
      totalTrades: 'Total de Operaciones',
      trades: 'Operaciones',
      date: 'Fecha',
      long: 'Long',
      short: 'Short',
      longTrades: 'Operaciones long',
      shortTrades: 'Operaciones short',
      average: 'Promedio',
      total: 'Total',
      instrument: 'Instrumento',
      quantity: 'Cantidad',
      commission: 'Comisión',
    },

    actions: {
      showTotal: 'Mostrar total',
      showAverage: 'Mostrar promedio',
    },

    tooltips: {
      timeRangePerformance:
        'Muestra el PnL promedio y la tasa de ganancia para operaciones agrupadas por tiempo en posición',
      pnlBySide: 'Compara el rendimiento de long vs short. Alterna entre promedio/total.',
      dailyPnl:
        'PnL total diario agregado de operaciones. El tooltip muestra conteos de long/short.',
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
      noTradesProvided: 'No se proporcionaron operaciones',
      generatingRandomTrades: 'Generando {count} operaciones aleatorias',
      errorProcessingMessage: 'Error al procesar el mensaje',
    },

    aria: {
      clickToAddToSelection: 'Haz clic para agregar "{name}" a la selección',
    },
  },
}
