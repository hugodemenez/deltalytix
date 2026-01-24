const embed = {
  embed: {
    charts: {
      timeRangePerformance: "Rendimiento por Rango de Tiempo",
      dailyPnl: "PnL Diario",
      timeOfDay: "Rendimiento por Hora del Día",
      timeInPosition: "Tiempo en Posición",
      pnlBySide: "PnL por Dirección",
      tradeDistribution: "Distribución de Operaciones",
      weekdayPnl: "PnL por Día de la Semana",
      pnlPerContract: "PnL por Contrato",
      pnlPerContractDaily: "PnL por Contrato (Diario)",
      tickDistribution: "Distribución de Ticks",
      commissionsPnl: "PnL de Comisiones",
      contractQuantity: "Cantidad de Contratos",
    },

    descriptions: {
      timeRangePerformance:
        "Muestra el PnL promedio y la tasa de ganancia para operaciones agrupadas por tiempo en posición",
      pnlBySide:
        "Compara el rendimiento de long vs short. Alterna entre promedio/total.",
      dailyPnl:
        "PnL total diario agregado de operaciones. El tooltip muestra conteos de long/short.",
      timeOfDay:
        "Distribución del rendimiento a lo largo de las horas del día para revelar periodos óptimos de trading.",
      timeInPosition:
        "Cuánto tiempo se mantienen típicamente las posiciones antes de cerrarse.",
      tradeDistribution:
        "Distribución de operaciones por PnL para visualizar asimetría y colas.",
      weekdayPnl:
        "Rendimiento promedio por día de la semana para identificar patrones semanales.",
      pnlPerContract:
        "Rendimiento agrupado por instrumento/contrato para comparar ventajas.",
      pnlPerContractDaily:
        "Desglose diario del PnL por instrumento/contrato seleccionado.",
      tickDistribution:
        "Histograma del PnL en ticks para analizar la dispersión de resultados de operaciones.",
      commissionsPnl:
        "Impacto de las comisiones en el PnL para entender la rentabilidad neta.",
      contractQuantity:
        "Distribución de tamaños de posición (cantidad) a través de operaciones.",
    },

    labels: {
      averagePnl: "PnL Promedio",
      totalPnl: "PnL Total",
      pnl: "PnL",
      timeRange: "Rango de Tiempo",
      winRate: "Tasa de Ganancia",
      totalTrades: "Total de Operaciones",
      trades: "Operaciones",
      date: "Fecha",
      long: "Long",
      short: "Short",
      longTrades: "Operaciones long",
      shortTrades: "Operaciones short",
      average: "Promedio",
      total: "Total",
      instrument: "Instrumento",
      quantity: "Cantidad",
      commission: "Comisión",
    },

    actions: {
      showTotal: "Mostrar total",
      showAverage: "Mostrar promedio",
    },

    tooltips: {
      timeRangePerformance:
        "Muestra el PnL promedio y la tasa de ganancia para operaciones agrupadas por tiempo en posición",
      pnlBySide:
        "Compara el rendimiento de long vs short. Alterna entre promedio/total.",
      dailyPnl:
        "PnL total diario agregado de operaciones. El tooltip muestra conteos de long/short.",
    },

    timeRanges: {
      under1min: "< 1 min",
      "1to5min": "1-5 min",
      "5to10min": "5-10 min",
      "10to15min": "10-15 min",
      "15to30min": "15-30 min",
      "30to60min": "30-60 min",
      "1to2hours": "1-2 h",
      "2to5hours": "2-5 h",
      over5hours: "> 5 h",
    },

    toasts: {
      noTradesProvided: "No se proporcionaron operaciones",
      generatingRandomTrades: "Generando {count} operaciones aleatorias",
      errorProcessingMessage: "Error al procesar el mensaje",
    },

    aria: {
      clickToAddToSelection: 'Haz clic para agregar "{name}" a la selección',
    },
    // Component-specific translations
    pnl: {
      title: "Ganancia/pérdida diaria",
      description: "Mostrando P&L diario a lo largo del tiempo",
      tooltip: {
        date: "Fecha",
        pnl: "P/L",
        longTrades: "Operaciones long",
        shortTrades: "Operaciones short",
      },
    },

    pnlBySide: {
      title: "P&L por Dirección",
      description:
        "Comparación de ganancias/pérdidas entre operaciones long y short",
      tooltip: {
        averageTotal: "P&L Promedio",
        winRate: "Tasa de Ganancia",
        trades: "Operaciones",
      },
      toggle: {
        showAverage: "Mostrar Promedio",
      },
    },

    pnlPerContract: {
      title: "P&L Neto Prom. por Contrato",
      description:
        "Ganancia/pérdida neta promedio por contrato por instrumento de trading (después de comisiones)",
      tooltip: {
        averagePnl: "P&L Neto Prom. por Contrato",
        totalPnl: "P&L Neto Total",
        trades: "Operaciones",
        totalContracts: "Contratos Totales",
      },
    },

    pnlPerContractDaily: {
      title: "P&L Neto Prom. Diario por Contrato",
      description:
        "Ganancia/pérdida neta promedio por contrato por día para instrumento seleccionado (después de comisiones)",
      tooltip: {
        date: "Fecha",
        averagePnl: "P&L Neto Prom. por Contrato",
        totalPnl: "P&L Neto Total",
        trades: "Operaciones",
        totalContracts: "Contratos Totales",
      },
    },

    pnlTime: {
      title: "P&L promedio por hora",
      description: "Ganancia/pérdida promedio para cada hora del día",
      tooltip: {
        time: "Hora",
        averagePnl: "P&L promedio",
        trades: "Operaciones",
      },
    },

    timeInPosition: {
      title: "Tiempo promedio en posición",
      description: "Tiempo promedio en posición para cada hora del día",
      tooltip: {
        time: "Hora",
        averageDuration: "Duración promedio",
        trades: "Operaciones",
      },
    },

    weekdayPnl: {
      title: "P&L promedio por día",
      description: "Ganancia/pérdida promedio para cada día de la semana",
      tooltip: {
        day: "Día",
        averagePnl: "P&L promedio",
        trades: "Operaciones",
      },
    },

    tradeDistribution: {
      title: "Distribución de operaciones",
      description:
        "Distribución de operaciones por resultado (ganancia/pérdida/equilibrio)",
      tooltip: {
        type: "Tipo",
        percentage: "Porcentaje",
      },
      winTrades: "Operaciones ganadoras",
      lossTrades: "Operaciones perdedoras",
      breakevenTrades: "Operaciones en equilibrio",
    },

    tickDistribution: {
      title: "Distribución de ticks",
      description: "Distribución de operaciones por valor de tick",
      tooltip: {
        ticks: "Ticks",
        frequency: "Frecuencia",
      },
    },

    commissions: {
      title: "P&L vs Comisiones",
      tooltip: {
        description:
          "Distribución de ganancias/pérdidas netas versus comisiones pagadas",
        percentage: "Porcentaje",
      },
      legend: {
        netPnl: "P&L Neto",
        commissions: "Comisiones",
      },
    },

    contracts: {
      title: "Número Total de Contratos",
      description:
        "Mostrando el número total de contratos negociados para cada hora del día. Las barras más oscuras indican más operaciones.",
      tooltip: {
        hour: "h",
        totalContracts: "Contratos Totales",
        numberOfTrades: "Número de Operaciones",
      },
    },

    timeRangePerformance: {
      title: "Rendimiento por rango de tiempo",
      description: "Rendimiento por rango de tiempo",
      tooltip: {
        timeRange: "Rango de tiempo",
        avgPnl: "P/L promedio",
        winRate: "Tasa de ganancia",
        "trades#zero": "Sin operaciones",
        "trades#one": "1 operación",
        "trades#other": "{count} operaciones",
      },
      ranges: {
        under1min: "< 1 min",
        "1to5min": "1-5 min",
        "5to10min": "5-10 min",
        "10to15min": "10-15 min",
        "15to30min": "15-30 min",
        "30to60min": "30-60 min",
        "1to2hours": "1-2 h",
        "2to5hours": "2-5 h",
        over5hours: "> 5 h",
      },
    },

    calendar: {
      weekdays: {
        sun: "Dom",
        mon: "Lun",
        tue: "Mar",
        wed: "Mié",
        thu: "Jue",
        fri: "Vie",
        sat: "Sáb",
      },
      charts: {
        trades: "operaciones",
      },
    },
  },
};

export default embed;
