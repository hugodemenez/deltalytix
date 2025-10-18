export default {
  embed: {
    charts: {
      timeRangePerformance: "Leistung nach Zeitbereich",
      dailyPnl: "Täglicher PnL",
      timeOfDay: "Leistung nach Tageszeit",
      timeInPosition: "Zeit in Position",
      pnlBySide: "PnL nach Richtung",
      tradeDistribution: "Handelsverteilung",
      weekdayPnl: "Wochentag PnL",
      pnlPerContract: "PnL pro Kontrakt",
      pnlPerContractDaily: "PnL pro Kontrakt (Täglich)",
      tickDistribution: "Tick-Verteilung",
      commissionsPnl: "Provisionen PnL",
      contractQuantity: "Kontraktmenge",
    },

    descriptions: {
      timeRangePerformance:
        "Zeigt durchschnittlichen PnL und Gewinnrate für Trades gruppiert nach Zeit in Position",
      pnlBySide:
        "Vergleiche Long- vs. Short-Leistung. Wechsle zwischen Durchschnitt/Gesamt.",
      dailyPnl:
        "Täglicher Gesamt-PnL aggregiert aus Trades. Tooltip zeigt Long/Short Zählungen.",
      timeOfDay:
        "Leistungsverteilung über die Stunden des Tages zur Aufdeckung optimaler Handelszeiten.",
      timeInPosition:
        "Wie lange Positionen typischerweise gehalten werden, bevor sie geschlossen werden.",
      tradeDistribution:
        "Verteilung der Trades nach PnL zur Visualisierung von Schiefe und Enden.",
      weekdayPnl:
        "Durchschnittliche Leistung nach Wochentag zur Identifizierung wöchentlicher Muster.",
      pnlPerContract:
        "Leistung gruppiert nach Instrument/Kontrakt zum Vergleich von Vorteilen.",
      pnlPerContractDaily:
        "Tägliche PnL-Aufschlüsselung pro ausgewähltem Instrument/Kontrakt.",
      tickDistribution:
        "Histogramm des PnL in Ticks zur Analyse der Handelsergebnisstreuung.",
      commissionsPnl:
        "Provisionsauswirkungen auf PnL zum Verständnis der Nettorentabilität.",
      contractQuantity:
        "Verteilung der Positionsgrößen (Menge) über Trades hinweg.",
    },

    labels: {
      averagePnl: "Durchschnittlicher PnL",
      totalPnl: "Gesamt PnL",
      pnl: "PnL",
      timeRange: "Zeitbereich",
      winRate: "Gewinnrate",
      totalTrades: "Gesamte Trades",
      trades: "Trades",
      date: "Datum",
      long: "Long",
      short: "Short",
      longTrades: "Long-Trades",
      shortTrades: "Short-Trades",
      average: "Durchschnitt",
      total: "Gesamt",
      instrument: "Instrument",
      quantity: "Menge",
      commission: "Provision",
    },

    actions: {
      showTotal: "Gesamt anzeigen",
      showAverage: "Durchschnitt anzeigen",
    },

    tooltips: {
      timeRangePerformance:
        "Zeigt durchschnittlichen PnL und Gewinnrate für Trades gruppiert nach Zeit in Position",
      pnlBySide:
        "Vergleiche Long- vs. Short-Leistung. Wechsle zwischen Durchschnitt/Gesamt.",
      dailyPnl:
        "Täglicher Gesamt-PnL aggregiert aus Trades. Tooltip zeigt Long/Short Zählungen.",
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
      noTradesProvided: "Keine Trades angegeben",
      generatingRandomTrades: "Generiere {count} zufällige Trades",
      errorProcessingMessage: "Fehler bei der Verarbeitung der Nachricht",
    },

    aria: {
      clickToAddToSelection: 'Klicken, um "{name}" zur Auswahl hinzuzufügen',
    },
    // Component-specific translations
    pnl: {
      title: "Täglicher Gewinn/Verlust",
      description: "Anzeige des täglichen P&L im Zeitverlauf",
      tooltip: {
        date: "Datum",
        pnl: "P/L",
        longTrades: "Long-Trades",
        shortTrades: "Short-Trades",
      },
    },

    pnlBySide: {
      title: "P&L nach Richtung",
      description: "Gewinn/Verlust-Vergleich zwischen Long- und Short-Trades",
      tooltip: {
        averageTotal: "Durchschn. P&L",
        winRate: "Gewinnrate",
        trades: "Trades",
      },
      toggle: {
        showAverage: "Durchschnitt anzeigen",
      },
    },

    pnlPerContract: {
      title: "Durchschn. Netto P&L pro Kontrakt",
      description:
        "Durchschnittlicher Nettogewinn/-verlust pro Kontrakt nach Handelsinstrument (nach Provisionen)",
      tooltip: {
        averagePnl: "Durchschn. Netto P&L pro Kontrakt",
        totalPnl: "Gesamt Netto P&L",
        trades: "Trades",
        totalContracts: "Gesamte Kontrakte",
      },
    },

    pnlPerContractDaily: {
      title: "Tägl. Durchschn. Netto P&L pro Kontrakt",
      description:
        "Durchschnittlicher Nettogewinn/-verlust pro Kontrakt pro Tag für ausgewähltes Instrument (nach Provisionen)",
      tooltip: {
        date: "Datum",
        averagePnl: "Durchschn. Netto P&L pro Kontrakt",
        totalPnl: "Gesamt Netto P&L",
        trades: "Trades",
        totalContracts: "Gesamte Kontrakte",
      },
    },

    pnlTime: {
      title: "Durchschnittlicher P&L nach Stunde",
      description:
        "Durchschnittlicher Gewinn/Verlust für jede Stunde des Tages",
      tooltip: {
        time: "Uhrzeit",
        averagePnl: "Durchschnittlicher P&L",
        trades: "Trades",
      },
    },

    timeInPosition: {
      title: "Durchschnittliche Zeit in Position",
      description:
        "Durchschnittliche Zeit in Position für jede Stunde des Tages",
      tooltip: {
        time: "Uhrzeit",
        averageDuration: "Durchschnittliche Dauer",
        trades: "Trades",
      },
    },

    weekdayPnl: {
      title: "Durchschnittlicher P&L nach Tag",
      description: "Durchschnittlicher Gewinn/Verlust für jeden Wochentag",
      tooltip: {
        day: "Tag",
        averagePnl: "Durchschnittlicher P&L",
        trades: "Trades",
      },
    },

    tradeDistribution: {
      title: "Trade-Verteilung",
      description:
        "Verteilung der Trades nach Ergebnis (Gewinn/Verlust/Ausgeglichen)",
      tooltip: {
        type: "Typ",
        percentage: "Prozentsatz",
      },
      winTrades: "Gewinn-Trades",
      lossTrades: "Verlust-Trades",
      breakevenTrades: "Ausgeglichene Trades",
    },

    tickDistribution: {
      title: "Tick-Verteilung",
      description: "Verteilung der Trades nach Tick-Wert",
      tooltip: {
        ticks: "Ticks",
        frequency: "Häufigkeit",
      },
    },

    commissions: {
      title: "P&L vs Provisionen",
      tooltip: {
        description:
          "Verteilung von Nettogewinn/-verlust vs gezahlte Provisionen",
        percentage: "Prozentsatz",
      },
      legend: {
        netPnl: "Netto P&L",
        commissions: "Provisionen",
      },
    },

    contracts: {
      title: "Gesamtzahl der Kontrakte",
      description:
        "Zeigt die Gesamtzahl der gehandelten Kontrakte für jede Stunde des Tages. Dunklere Balken zeigen mehr Trades an.",
      tooltip: {
        hour: "h",
        totalContracts: "Gesamte Kontrakte",
        numberOfTrades: "Anzahl der Trades",
      },
    },

    timeRangePerformance: {
      title: "Zeitbereichsleistung",
      description: "Leistung nach Zeitbereich",
      tooltip: {
        timeRange: "Zeitbereich",
        avgPnl: "Durchschnittlicher P/L",
        winRate: "Gewinnrate",
        "trades#zero": "Keine Trades",
        "trades#one": "1 Trade",
        "trades#other": "{count} Trades",
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
        sun: "So",
        mon: "Mo",
        tue: "Di",
        wed: "Mi",
        thu: "Do",
        fri: "Fr",
        sat: "Sa",
      },
      charts: {
        trades: "Trades",
      },
    },
  },
};
