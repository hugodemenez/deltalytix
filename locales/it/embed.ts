export default {
  embed: {
    charts: {
      timeRangePerformance: 'Prestazione per Intervallo di Tempo',
      dailyPnl: 'PnL Giornaliero',
      timeOfDay: 'Prestazione per Ora del Giorno',
      timeInPosition: 'Tempo in Posizione',
      pnlBySide: 'PnL per Direzione',
      tradeDistribution: 'Distribuzione delle Operazioni',
      weekdayPnl: 'PnL per Giorno della Settimana',
      pnlPerContract: 'PnL per Contratto',
      pnlPerContractDaily: 'PnL per Contratto (Giornaliero)',
      tickDistribution: 'Distribuzione dei Tick',
      commissionsPnl: 'PnL delle Commissioni',
      contractQuantity: 'Quantità di Contratti',
    },

    descriptions: {
      timeRangePerformance:
        'Mostra il PnL medio e il tasso di vincita per le operazioni raggruppate per tempo in posizione',
      pnlBySide: 'Confronta le prestazioni long vs short. Alterna tra media/totale.',
      dailyPnl:
        'PnL totale giornaliero aggregato dalle operazioni. Il tooltip mostra i conteggi long/short.',
      timeOfDay:
        'Distribuzione delle prestazioni nelle ore del giorno per rivelare i periodi di trading ottimali.',
      timeInPosition:
        'Quanto tempo vengono tipicamente mantenute le posizioni prima della chiusura.',
      tradeDistribution:
        'Distribuzione delle operazioni per PnL per visualizzare asimmetria e code.',
      weekdayPnl:
        'Prestazione media per giorno della settimana per identificare modelli settimanali.',
      pnlPerContract:
        'Prestazione raggruppata per strumento/contratto per confrontare i vantaggi.',
      pnlPerContractDaily:
        'Ripartizione giornaliera del PnL per strumento/contratto selezionato.',
      tickDistribution:
        'Istogramma del PnL in tick per analizzare la dispersione dei risultati delle operazioni.',
      commissionsPnl:
        'Impatto delle commissioni sul PnL per comprendere la redditività netta.',
      contractQuantity:
        'Distribuzione delle dimensioni delle posizioni (quantità) tra le operazioni.',
    },

    labels: {
      averagePnl: 'PnL Medio',
      totalPnl: 'PnL Totale',
      pnl: 'PnL',
      timeRange: 'Intervallo di Tempo',
      winRate: 'Tasso di Vincita',
      totalTrades: 'Totale Operazioni',
      trades: 'Operazioni',
      date: 'Data',
      long: 'Long',
      short: 'Short',
      longTrades: 'Operazioni long',
      shortTrades: 'Operazioni short',
      average: 'Media',
      total: 'Totale',
      instrument: 'Strumento',
      quantity: 'Quantità',
      commission: 'Commissione',
    },

    actions: {
      showTotal: 'Mostra totale',
      showAverage: 'Mostra media',
    },

    tooltips: {
      timeRangePerformance:
        'Mostra il PnL medio e il tasso di vincita per le operazioni raggruppate per tempo in posizione',
      pnlBySide: 'Confronta le prestazioni long vs short. Alterna tra media/totale.',
      dailyPnl:
        'PnL totale giornaliero aggregato dalle operazioni. Il tooltip mostra i conteggi long/short.',
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
      noTradesProvided: 'Nessuna operazione fornita',
      generatingRandomTrades: 'Generazione di {count} operazioni casuali',
      errorProcessingMessage: 'Errore durante l\'elaborazione del messaggio',
    },

    aria: {
      clickToAddToSelection: 'Fai clic per aggiungere "{name}" alla selezione',
    },
    // Component-specific translations
    pnl: {
      title: 'Profitto/perdita giornaliero',
      description: 'Visualizzazione del P&L giornaliero nel tempo',
      tooltip: {
        date: 'Data',
        pnl: 'P/L',
        longTrades: 'Operazioni long',
        shortTrades: 'Operazioni short',
      },
    },

    pnlBySide: {
      title: 'P&L per Direzione',
      description: 'Confronto tra profitti/perdite tra operazioni long e short',
      tooltip: {
        averageTotal: 'P&L Medio',
        winRate: 'Tasso di Vincita',
        trades: 'Operazioni',
      },
      toggle: {
        showAverage: 'Mostra Media',
      },
    },

    pnlPerContract: {
      title: 'P&L Netto Medio per Contratto',
      description: 'Profitto/perdita netto medio per contratto per strumento di trading (dopo commissioni)',
      tooltip: {
        averagePnl: 'P&L Netto Medio per Contratto',
        totalPnl: 'P&L Netto Totale',
        trades: 'Operazioni',
        totalContracts: 'Contratti Totali',
      },
    },

    pnlPerContractDaily: {
      title: 'P&L Netto Medio Giornaliero per Contratto',
      description: 'Profitto/perdita netto medio per contratto al giorno per strumento selezionato (dopo commissioni)',
      tooltip: {
        date: 'Data',
        averagePnl: 'P&L Netto Medio per Contratto',
        totalPnl: 'P&L Netto Totale',
        trades: 'Operazioni',
        totalContracts: 'Contratti Totali',
      },
    },

    pnlTime: {
      title: 'P&L medio per ora',
      description: 'Profitto/perdita medio per ogni ora del giorno',
      tooltip: {
        time: 'Ora',
        averagePnl: 'P&L medio',
        trades: 'Operazioni',
      },
    },

    timeInPosition: {
      title: 'Tempo medio in posizione',
      description: 'Tempo medio in posizione per ogni ora del giorno',
      tooltip: {
        time: 'Ora',
        averageDuration: 'Durata media',
        trades: 'Operazioni',
      },
    },

    weekdayPnl: {
      title: 'P&L medio per giorno',
      description: 'Profitto/perdita medio per ogni giorno della settimana',
      tooltip: {
        day: 'Giorno',
        averagePnl: 'P&L medio',
        trades: 'Operazioni',
      },
    },

    tradeDistribution: {
      title: 'Trade Distribution',
      description: 'Distribution of trades',
      tooltip: {
        type: 'Type',
        percentage: 'Percentage',
      },
    },

    tickDistribution: {
      title: 'Tick Distribution',
      description: 'Distribution by ticks',
    },

    commissions: {
      title: 'P&L vs Commissioni',
      tooltip: {
        description: 'Distribuzione del profitto/perdita netto rispetto alle commissioni pagate',
        percentage: 'Percentuale',
      },
      legend: {
        netPnl: 'P&L Netto',
        commissions: 'Commissioni',
      },
    },

    contracts: {
      title: 'Numero Totale di Contratti',
      description: 'Mostra il numero totale di contratti negoziati per ogni ora del giorno. Le barre più scure indicano più operazioni.',
      tooltip: {
        hour: 'h',
        totalContracts: 'Contratti Totali',
        numberOfTrades: 'Numero di Operazioni',
      },
    },

    timeRangePerformance: {
      title: 'Time Range Performance',
      description: 'Performance by time range',
      tooltip: {
        timeRange: 'Time Range',
        avgPnl: 'Average P/L',
        winRate: 'Win Rate',
      },
      ranges: {
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
    },

    calendar: {
      weekdays: {
        sun: 'Dom',
        mon: 'Lun',
        tue: 'Mar',
        wed: 'Mer',
        thu: 'Gio',
        fri: 'Ven',
        sat: 'Sab',
      },
      charts: {
        trades: 'operazioni',
      },
    },

  },
}
