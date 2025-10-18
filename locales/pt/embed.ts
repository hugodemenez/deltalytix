export default {
  embed: {
    charts: {
      timeRangePerformance: "Desempenho por Intervalo de Tempo",
      dailyPnl: "PnL Diário",
      timeOfDay: "Desempenho por Hora do Dia",
      timeInPosition: "Tempo em Posição",
      pnlBySide: "PnL por Direção",
      tradeDistribution: "Distribuição de Operações",
      weekdayPnl: "PnL por Dia da Semana",
      pnlPerContract: "PnL por Contrato",
      pnlPerContractDaily: "PnL por Contrato (Diário)",
      tickDistribution: "Distribuição de Ticks",
      commissionsPnl: "PnL de Comissões",
      contractQuantity: "Quantidade de Contratos",
    },

    descriptions: {
      timeRangePerformance:
        "Mostra o PnL médio e a taxa de vitória para operações agrupadas por tempo em posição",
      pnlBySide:
        "Compare o desempenho de long vs short. Alterne entre média/total.",
      dailyPnl:
        "PnL total diário agregado de operações. O tooltip mostra contagens de long/short.",
      timeOfDay:
        "Distribuição de desempenho ao longo das horas do dia para revelar períodos ideais de negociação.",
      timeInPosition:
        "Quanto tempo as posições são tipicamente mantidas antes de serem fechadas.",
      tradeDistribution:
        "Distribuição de operações por PnL para visualizar assimetria e caudas.",
      weekdayPnl:
        "Desempenho médio por dia da semana para identificar padrões semanais.",
      pnlPerContract:
        "Desempenho agrupado por instrumento/contrato para comparar vantagens.",
      pnlPerContractDaily:
        "Detalhamento diário do PnL por instrumento/contrato selecionado.",
      tickDistribution:
        "Histograma do PnL em ticks para analisar a dispersão dos resultados das operações.",
      commissionsPnl:
        "Impacto das comissões no PnL para entender a rentabilidade líquida.",
      contractQuantity:
        "Distribuição de tamanhos de posição (quantidade) através das operações.",
    },

    labels: {
      averagePnl: "PnL Médio",
      totalPnl: "PnL Total",
      pnl: "PnL",
      timeRange: "Intervalo de Tempo",
      winRate: "Taxa de Vitória",
      totalTrades: "Total de Operações",
      trades: "Operações",
      date: "Data",
      long: "Long",
      short: "Short",
      longTrades: "Operações long",
      shortTrades: "Operações short",
      average: "Média",
      total: "Total",
      instrument: "Instrumento",
      quantity: "Quantidade",
      commission: "Comissão",
    },

    actions: {
      showTotal: "Mostrar total",
      showAverage: "Mostrar média",
    },

    tooltips: {
      timeRangePerformance:
        "Mostra o PnL médio e a taxa de vitória para operações agrupadas por tempo em posição",
      pnlBySide:
        "Compare o desempenho de long vs short. Alterne entre média/total.",
      dailyPnl:
        "PnL total diário agregado de operações. O tooltip mostra contagens de long/short.",
    },

    timeRanges: {
      under1min: "< 1m",
      "1to5min": "1-5m",
      "5to10min": "5-10m",
      "10to15min": "10-15m",
      "15to30min": "15-30m",
      "30to60min": "30-60m",
      "1to2hours": "1-2h",
      "2to5hours": "2-5h",
      over5hours: "> 5h",
    },

    toasts: {
      noTradesProvided: "Nenhuma operação fornecida",
      generatingRandomTrades: "Gerando {count} operações aleatórias",
      errorProcessingMessage: "Erro ao processar mensagem",
    },

    aria: {
      clickToAddToSelection: 'Clique para adicionar "{name}" à seleção',
    },
    // Component-specific translations
    pnl: {
      title: "Lucro/prejuízo diário",
      description: "Exibindo P&L diário ao longo do tempo",
      tooltip: {
        date: "Data",
        pnl: "P/L",
        longTrades: "Operações long",
        shortTrades: "Operações short",
      },
    },

    pnlBySide: {
      title: "P&L por Direção",
      description: "Comparação de lucro/prejuízo entre operações long e short",
      tooltip: {
        averageTotal: "P&L Médio",
        winRate: "Taxa de Vitória",
        trades: "Operações",
      },
      toggle: {
        showAverage: "Mostrar Média",
      },
    },

    pnlPerContract: {
      title: "P&L Líquido Médio por Contrato",
      description:
        "Lucro/prejuízo líquido médio por contrato por instrumento de trading (após comissões)",
      tooltip: {
        averagePnl: "P&L Líquido Médio por Contrato",
        totalPnl: "P&L Líquido Total",
        trades: "Operações",
        totalContracts: "Contratos Totais",
      },
    },

    pnlPerContractDaily: {
      title: "P&L Líquido Médio Diário por Contrato",
      description:
        "Lucro/prejuízo líquido médio por contrato por dia para instrumento selecionado (após comissões)",
      tooltip: {
        date: "Data",
        averagePnl: "P&L Líquido Médio por Contrato",
        totalPnl: "P&L Líquido Total",
        trades: "Operações",
        totalContracts: "Contratos Totais",
      },
    },

    pnlTime: {
      title: "P&L médio por hora",
      description: "Lucro/prejuízo médio para cada hora do dia",
      tooltip: {
        time: "Hora",
        averagePnl: "P&L médio",
        trades: "Operações",
      },
    },

    timeInPosition: {
      title: "Tempo médio em posição",
      description: "Tempo médio em posição para cada hora do dia",
      tooltip: {
        time: "Hora",
        averageDuration: "Duração média",
        trades: "Operações",
      },
    },

    weekdayPnl: {
      title: "P&L médio por dia",
      description: "Lucro/prejuízo médio para cada dia da semana",
      tooltip: {
        day: "Dia",
        averagePnl: "P&L médio",
        trades: "Operações",
      },
    },

    tradeDistribution: {
      title: "Distribuição de operações",
      description:
        "Distribuição de operações por resultado (ganho/perda/equilíbrio)",
      tooltip: {
        type: "Tipo",
        percentage: "Porcentagem",
      },
      winTrades: "Operações vencedoras",
      lossTrades: "Operações perdedoras",
      breakevenTrades: "Operações de equilíbrio",
    },

    tickDistribution: {
      title: "Distribuição de ticks",
      description: "Distribuição de operações por valor de tick",
      tooltip: {
        ticks: "Ticks",
        frequency: "Frequência",
      },
    },

    commissions: {
      title: "P&L vs Comissões",
      tooltip: {
        description:
          "Distribuição do lucro/prejuízo líquido versus comissões pagas",
        percentage: "Porcentagem",
      },
      legend: {
        netPnl: "P&L Líquido",
        commissions: "Comissões",
      },
    },

    contracts: {
      title: "Número Total de Contratos",
      description:
        "Mostrando o número total de contratos negociados para cada hora do dia. Barras mais escuras indicam mais operações.",
      tooltip: {
        hour: "h",
        totalContracts: "Contratos Totais",
        numberOfTrades: "Número de Operações",
      },
    },

    timeRangePerformance: {
      title: "Desempenho por intervalo de tempo",
      description: "Desempenho por intervalo de tempo",
      tooltip: {
        timeRange: "Intervalo de tempo",
        avgPnl: "P&L médio",
        winRate: "Taxa de vitória",
        "trades#zero": "Sem operações",
        "trades#one": "1 operação",
        "trades#other": "{count} operações",
      },
      ranges: {
        under1min: "< 1m",
        "1to5min": "1-5m",
        "5to10min": "5-10m",
        "10to15min": "10-15m",
        "15to30min": "15-30m",
        "30to60min": "30-60m",
        "1to2hours": "1-2h",
        "2to5hours": "2-5h",
        over5hours: "> 5h",
      },
    },

    calendar: {
      weekdays: {
        sun: "Dom",
        mon: "Seg",
        tue: "Ter",
        wed: "Qua",
        thu: "Qui",
        fri: "Sex",
        sat: "Sáb",
      },
      charts: {
        trades: "operações",
      },
    },
  },
};
