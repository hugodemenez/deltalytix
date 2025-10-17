export default {
  embed: {
    charts: {
      timeRangePerformance: 'Desempenho por Intervalo de Tempo',
      dailyPnl: 'PnL Diário',
      timeOfDay: 'Desempenho por Hora do Dia',
      timeInPosition: 'Tempo em Posição',
      pnlBySide: 'PnL por Direção',
      tradeDistribution: 'Distribuição de Operações',
      weekdayPnl: 'PnL por Dia da Semana',
      pnlPerContract: 'PnL por Contrato',
      pnlPerContractDaily: 'PnL por Contrato (Diário)',
      tickDistribution: 'Distribuição de Ticks',
      commissionsPnl: 'PnL de Comissões',
      contractQuantity: 'Quantidade de Contratos',
    },

    descriptions: {
      timeRangePerformance:
        'Mostra o PnL médio e a taxa de vitória para operações agrupadas por tempo em posição',
      pnlBySide: 'Compare o desempenho de long vs short. Alterne entre média/total.',
      dailyPnl:
        'PnL total diário agregado de operações. O tooltip mostra contagens de long/short.',
      timeOfDay:
        'Distribuição de desempenho ao longo das horas do dia para revelar períodos ideais de negociação.',
      timeInPosition:
        'Quanto tempo as posições são tipicamente mantidas antes de serem fechadas.',
      tradeDistribution:
        'Distribuição de operações por PnL para visualizar assimetria e caudas.',
      weekdayPnl:
        'Desempenho médio por dia da semana para identificar padrões semanais.',
      pnlPerContract:
        'Desempenho agrupado por instrumento/contrato para comparar vantagens.',
      pnlPerContractDaily:
        'Detalhamento diário do PnL por instrumento/contrato selecionado.',
      tickDistribution:
        'Histograma do PnL em ticks para analisar a dispersão dos resultados das operações.',
      commissionsPnl:
        'Impacto das comissões no PnL para entender a rentabilidade líquida.',
      contractQuantity:
        'Distribuição de tamanhos de posição (quantidade) através das operações.',
    },

    labels: {
      averagePnl: 'PnL Médio',
      totalPnl: 'PnL Total',
      pnl: 'PnL',
      timeRange: 'Intervalo de Tempo',
      winRate: 'Taxa de Vitória',
      totalTrades: 'Total de Operações',
      trades: 'Operações',
      date: 'Data',
      long: 'Long',
      short: 'Short',
      longTrades: 'Operações long',
      shortTrades: 'Operações short',
      average: 'Média',
      total: 'Total',
      instrument: 'Instrumento',
      quantity: 'Quantidade',
      commission: 'Comissão',
    },

    actions: {
      showTotal: 'Mostrar total',
      showAverage: 'Mostrar média',
    },

    tooltips: {
      timeRangePerformance:
        'Mostra o PnL médio e a taxa de vitória para operações agrupadas por tempo em posição',
      pnlBySide: 'Compare o desempenho de long vs short. Alterne entre média/total.',
      dailyPnl:
        'PnL total diário agregado de operações. O tooltip mostra contagens de long/short.',
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
      noTradesProvided: 'Nenhuma operação fornecida',
      generatingRandomTrades: 'Gerando {count} operações aleatórias',
      errorProcessingMessage: 'Erro ao processar mensagem',
    },

    aria: {
      clickToAddToSelection: 'Clique para adicionar "{name}" à seleção',
    },
  },
}
