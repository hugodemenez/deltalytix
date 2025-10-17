export default {
  embed: {
    charts: {
      timeRangePerformance: 'Leistung nach Zeitbereich',
      dailyPnl: 'Täglicher PnL',
      timeOfDay: 'Leistung nach Tageszeit',
      timeInPosition: 'Zeit in Position',
      pnlBySide: 'PnL nach Richtung',
      tradeDistribution: 'Handelsverteilung',
      weekdayPnl: 'Wochentag PnL',
      pnlPerContract: 'PnL pro Kontrakt',
      pnlPerContractDaily: 'PnL pro Kontrakt (Täglich)',
      tickDistribution: 'Tick-Verteilung',
      commissionsPnl: 'Provisionen PnL',
      contractQuantity: 'Kontraktmenge',
    },

    descriptions: {
      timeRangePerformance:
        'Zeigt durchschnittlichen PnL und Gewinnrate für Trades gruppiert nach Zeit in Position',
      pnlBySide: 'Vergleiche Long- vs. Short-Leistung. Wechsle zwischen Durchschnitt/Gesamt.',
      dailyPnl:
        'Täglicher Gesamt-PnL aggregiert aus Trades. Tooltip zeigt Long/Short Zählungen.',
      timeOfDay:
        'Leistungsverteilung über die Stunden des Tages zur Aufdeckung optimaler Handelszeiten.',
      timeInPosition:
        'Wie lange Positionen typischerweise gehalten werden, bevor sie geschlossen werden.',
      tradeDistribution:
        'Verteilung der Trades nach PnL zur Visualisierung von Schiefe und Enden.',
      weekdayPnl:
        'Durchschnittliche Leistung nach Wochentag zur Identifizierung wöchentlicher Muster.',
      pnlPerContract:
        'Leistung gruppiert nach Instrument/Kontrakt zum Vergleich von Vorteilen.',
      pnlPerContractDaily:
        'Tägliche PnL-Aufschlüsselung pro ausgewähltem Instrument/Kontrakt.',
      tickDistribution:
        'Histogramm des PnL in Ticks zur Analyse der Handelsergebnisstreuung.',
      commissionsPnl:
        'Provisionsauswirkungen auf PnL zum Verständnis der Nettorentabilität.',
      contractQuantity:
        'Verteilung der Positionsgrößen (Menge) über Trades hinweg.',
    },

    labels: {
      averagePnl: 'Durchschnittlicher PnL',
      totalPnl: 'Gesamt PnL',
      pnl: 'PnL',
      timeRange: 'Zeitbereich',
      winRate: 'Gewinnrate',
      totalTrades: 'Gesamte Trades',
      trades: 'Trades',
      date: 'Datum',
      long: 'Long',
      short: 'Short',
      longTrades: 'Long-Trades',
      shortTrades: 'Short-Trades',
      average: 'Durchschnitt',
      total: 'Gesamt',
      instrument: 'Instrument',
      quantity: 'Menge',
      commission: 'Provision',
    },

    actions: {
      showTotal: 'Gesamt anzeigen',
      showAverage: 'Durchschnitt anzeigen',
    },

    tooltips: {
      timeRangePerformance:
        'Zeigt durchschnittlichen PnL und Gewinnrate für Trades gruppiert nach Zeit in Position',
      pnlBySide: 'Vergleiche Long- vs. Short-Leistung. Wechsle zwischen Durchschnitt/Gesamt.',
      dailyPnl:
        'Täglicher Gesamt-PnL aggregiert aus Trades. Tooltip zeigt Long/Short Zählungen.',
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
      noTradesProvided: 'Keine Trades angegeben',
      generatingRandomTrades: 'Generiere {count} zufällige Trades',
      errorProcessingMessage: 'Fehler bei der Verarbeitung der Nachricht',
    },

    aria: {
      clickToAddToSelection: 'Klicken, um "{name}" zur Auswahl hinzuzufügen',
    },
  },
}
