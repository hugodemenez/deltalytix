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
  },
}
