export default {
  embed: {
    charts: {
      timeRangePerformance: 'Iṣẹ́ Akoko Ibiti',
      dailyPnl: 'PnL Ojoojúmọ́',
      timeOfDay: 'Iṣẹ́ Akoko Ọjọ́',
      timeInPosition: 'Akoko ni Ipo',
      pnlBySide: 'PnL nipasẹ Ọna',
      tradeDistribution: 'Pinpin Iṣowo',
      weekdayPnl: 'PnL Ọjọ́ Ọsẹ̀',
      pnlPerContract: 'PnL fun Adehun kọọkan',
      pnlPerContractDaily: 'PnL fun Adehun kọọkan (Ojoojúmọ́)',
      tickDistribution: 'Pinpin Tick',
      commissionsPnl: 'PnL Igbese',
      contractQuantity: 'Iye Adehun',
    },

    descriptions: {
      timeRangePerformance:
        'Fihan apapọ PnL ati oṣuwọn iṣẹgun fun awọn iṣowo ti a ṣe akojọ nipasẹ akoko ni ipo',
      pnlBySide: 'Ṣe afiwe iṣẹ́ gigun ati kukuru. Yipada laarin apapọ/lapapọ.',
      dailyPnl:
        'Lapapọ PnL ojoojúmọ́ ti a ṣajọpọ lati awọn iṣowo. Tooltip fihan awọn nọmba gigun/kukuru.',
      timeOfDay:
        'Pinpin iṣẹ́ kọja awọn wakati ọjọ́ lati ṣafihan awọn akoko iṣowo to dara julọ.',
      timeInPosition:
        'Bawo ni awọn ipo ṣe maa wa nigbagbogbo ṣaaju ki o to pa.',
      tradeDistribution:
        'Pinpin awọn iṣowo nipasẹ PnL lati wo aiṣedeede ati awọn iru.',
      weekdayPnl:
        'Apapọ iṣẹ́ nipasẹ ọjọ́ ọsẹ̀ lati ṣe idanimọ awọn ilana ọsẹ̀.',
      pnlPerContract:
        'Iṣẹ́ ti a ṣe akojọ nipasẹ ohun elo/adehun lati ṣe afiwe awọn anfani.',
      pnlPerContractDaily:
        'Itupalẹ PnL ojoojúmọ́ fun ohun elo/adehun ti a yan.',
      tickDistribution:
        'Aworan PnL ni awọn tick lati ṣe itupalẹ itankale awọn abajade iṣowo.',
      commissionsPnl:
        'Ipa awọn igbese lori PnL lati ni oye ere net.',
      contractQuantity:
        'Pinpin awọn iwọn ipo (iye) kọja awọn iṣowo.',
    },

    labels: {
      averagePnl: 'Apapọ PnL',
      totalPnl: 'Lapapọ PnL',
      pnl: 'PnL',
      timeRange: 'Akoko Ibiti',
      winRate: 'Oṣuwọn Iṣẹgun',
      totalTrades: 'Lapapọ Awọn Iṣowo',
      trades: 'Awọn Iṣowo',
      date: 'Ọjọ́',
      long: 'Gigun',
      short: 'Kukuru',
      longTrades: 'Awọn iṣowo gigun',
      shortTrades: 'Awọn iṣowo kukuru',
      average: 'Apapọ',
      total: 'Lapapọ',
      instrument: 'Ohun elo',
      quantity: 'Iye',
      commission: 'Igbese',
    },

    actions: {
      showTotal: 'Fihan lapapọ',
      showAverage: 'Fihan apapọ',
    },

    tooltips: {
      timeRangePerformance:
        'Fihan apapọ PnL ati oṣuwọn iṣẹgun fun awọn iṣowo ti a ṣe akojọ nipasẹ akoko ni ipo',
      pnlBySide: 'Ṣe afiwe iṣẹ́ gigun ati kukuru. Yipada laarin apapọ/lapapọ.',
      dailyPnl:
        'Lapapọ PnL ojoojúmọ́ ti a ṣajọpọ lati awọn iṣowo. Tooltip fihan awọn nọmba gigun/kukuru.',
    },

    timeRanges: {
      under1min: '< 1i',
      '1to5min': '1-5i',
      '5to10min': '5-10i',
      '10to15min': '10-15i',
      '15to30min': '15-30i',
      '30to60min': '30-60i',
      '1to2hours': '1-2w',
      '2to5hours': '2-5w',
      over5hours: '> 5w',
    },

    toasts: {
      noTradesProvided: 'Ko si awọn iṣowo ti a pese',
      generatingRandomTrades: 'N ṣẹda {count} awọn iṣowo lairotẹlẹ',
      errorProcessingMessage: 'Aṣiṣe ninu ṣiṣe ifiranṣẹ',
    },

    aria: {
      clickToAddToSelection: 'Tẹ lati fikun "{name}" si aṣayan',
    },
    // Component-specific translations
    pnl: {
      title: 'Ere/offo ojoojúmọ́',
      description: 'Nfihan PnL ojoojúmọ́ ni akoko',
      tooltip: {
        date: 'Ọjọ',
        pnl: 'P/L',
        longTrades: 'Awọn iṣowo gigun',
        shortTrades: 'Awọn iṣowo kukuru',
      },
    },

    pnlBySide: {
      title: 'PnL nipasẹ Ọna',
      description: 'Afiwe ere/offo laarin awọn iṣowo gigun ati kukuru',
      tooltip: {
        averageTotal: 'Apapọ PnL',
        winRate: 'Oṣuwọn Iṣẹgun',
        trades: 'Awọn Iṣowo',
      },
      toggle: {
        showAverage: 'Fihan Apapọ',
      },
    },

    pnlPerContract: {
      title: 'Apapọ PnL Funfun fun Adehun',
      description: 'Apapọ ere/offo funfun fun adehun nipasẹ ohun elo iṣowo (lẹhin awọn igbese)',
      tooltip: {
        averagePnl: 'Apapọ PnL Funfun fun Adehun',
        totalPnl: 'Lapapọ PnL Funfun',
        trades: 'Awọn Iṣowo',
        totalContracts: 'Lapapọ Awọn Adehun',
      },
    },

    pnlPerContractDaily: {
      title: 'Apapọ PnL Funfun Ojoojúmọ́ fun Adehun',
      description: 'Apapọ ere/offo funfun fun adehun fun ọjọ fun ohun elo ti a yan (lẹhin awọn igbese)',
      tooltip: {
        date: 'Ọjọ',
        averagePnl: 'Apapọ PnL Funfun fun Adehun',
        totalPnl: 'Lapapọ PnL Funfun',
        trades: 'Awọn Iṣowo',
        totalContracts: 'Lapapọ Awọn Adehun',
      },
    },

    pnlTime: {
      title: 'Apapọ PnL nipasẹ wakati',
      description: 'Apapọ ere/offo fun wakati kọọkan ti ọjọ',
      tooltip: {
        time: 'Akoko',
        averagePnl: 'Apapọ PnL',
        trades: 'Awọn iṣowo',
      },
    },

    timeInPosition: {
      title: 'Apapọ akoko ni ipo',
      description: 'Apapọ akoko ni ipo fun wakati kọọkan ti ọjọ',
      tooltip: {
        time: 'Akoko',
        averageDuration: 'Apapọ aago',
        trades: 'Awọn iṣowo',
      },
    },

    weekdayPnl: {
      title: 'Apapọ PnL nipasẹ ọjọ',
      description: 'Apapọ ere/offo fun ọjọ kọọkan ti ọsẹ',
      tooltip: {
        day: 'Ọjọ',
        averagePnl: 'Apapọ PnL',
        trades: 'Awọn iṣowo',
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
      title: 'PnL vs Awọn Igbese',
      tooltip: {
        description: 'Pinpin ere/offo funfun pẹlu awọn igbese ti a sanwo',
        percentage: 'Ida',
      },
      legend: {
        netPnl: 'PnL Funfun',
        commissions: 'Awọn Igbese',
      },
    },

    contracts: {
      title: 'Nọmba Lapapọ ti Awọn Adehun',
      description: 'Nfihan nọmba lapapọ ti awọn adehun ti a ṣe iṣowo fun wakati kọọkan ti ọjọ. Awọn igi dudu fihan diẹ sii awọn iṣowo.',
      tooltip: {
        hour: 'h',
        totalContracts: 'Lapapọ Awọn Adehun',
        numberOfTrades: 'Nọmba Awọn Iṣowo',
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
        sun: 'Aiku',
        mon: 'Aje',
        tue: 'Isegun',
        wed: 'Ọjọru',
        thu: 'Ọjọbọ',
        fri: 'Eti',
        sat: 'Abameta',
      },
      charts: {
        trades: 'awọn iṣowo',
      },
    },

  },
}
