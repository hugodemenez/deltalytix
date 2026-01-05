const embed = {
  embed: {
    charts: {
      timeRangePerformance: "Performance par intervalle de temps",
      dailyPnl: "PnL quotidien",
      timeOfDay: "Performance par heure de la journée",
      timeInPosition: "Temps en position",
      pnlBySide: "PnL par direction",
      tradeDistribution: "Distribution des trades",
      weekdayPnl: "PnL par jour de la semaine",
      pnlPerContract: "PnL par contrat",
      pnlPerContractDaily: "PnL par contrat (quotidien)",
      tickDistribution: "Distribution des ticks",
      commissionsPnl: "PnL des commissions",
      contractQuantity: "Quantité de contrats",
    },

    descriptions: {
      timeRangePerformance:
        "Affiche le PnL moyen et le taux de réussite des trades regroupés par temps en position",
      pnlBySide:
        "Compare la performance des positions longues vs courtes. Bascule moyenne/total.",
      dailyPnl:
        "PnL total quotidien agrégé à partir des trades. L’infobulle affiche le nombre de longs/courts.",
      timeOfDay:
        "Répartition des performances selon les heures de la journée pour révéler les périodes optimales.",
      timeInPosition:
        "Durée pendant laquelle les positions sont généralement conservées avant d’être clôturées.",
      tradeDistribution:
        "Distribution des trades par PnL pour visualiser l’asymétrie et les queues.",
      weekdayPnl:
        "Performance moyenne par jour de la semaine pour identifier les schémas hebdomadaires.",
      pnlPerContract:
        "Performance regroupée par instrument/contrat pour comparer les avantages.",
      pnlPerContractDaily:
        "Répartition quotidienne du PnL par instrument/contrat sélectionné.",
      tickDistribution:
        "Histogramme du PnL en ticks pour analyser la dispersion des résultats.",
      commissionsPnl:
        "Impact des commissions sur le PnL afin de comprendre la rentabilité nette.",
      contractQuantity:
        "Répartition des tailles de position (quantité) sur l’ensemble des trades.",
    },

    labels: {
      averagePnl: "PnL moyen",
      totalPnl: "PnL total",
      pnl: "PnL",
      timeRange: "Intervalle de temps",
      winRate: "Taux de réussite",
      totalTrades: "Nombre total de trades",
      trades: "Trades",
      date: "Date",
      long: "Long",
      short: "Short",
      longTrades: "Trades longs",
      shortTrades: "Trades courts",
      average: "Moyenne",
      total: "Total",
      instrument: "Instrument",
      quantity: "Quantité",
      commission: "Commission",
    },

    actions: {
      showTotal: "Afficher le total",
      showAverage: "Afficher la moyenne",
    },

    tooltips: {
      timeRangePerformance:
        "Affiche le PnL moyen et le taux de réussite des trades regroupés par temps en position",
      pnlBySide:
        "Compare la performance des positions longues vs courtes. Bascule moyenne/total.",
      dailyPnl:
        "PnL total quotidien agrégé à partir des trades. L’infobulle affiche le nombre de longs/courts.",
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
      noTradesProvided: "Aucun trade fourni",
      generatingRandomTrades: "Génération de {count} trades aléatoires",
      errorProcessingMessage: "Erreur lors du traitement du message",
    },

    aria: {
      clickToAddToSelection: 'Cliquez pour ajouter "{name}" à la sélection',
    },
    // Component-specific translations
    pnl: {
      title: "Profits et Pertes Quotidiens",
      description: "Affichage des P&L quotidiens dans le temps",
      tooltip: {
        date: "Date",
        pnl: "P/L",
        longTrades: "Trades Long",
        shortTrades: "Trades Short",
      },
    },

    pnlBySide: {
      title: "P&L par Direction",
      description:
        "Comparaison des profits et pertes entre les trades long et short",
      tooltip: {
        averageTotal: "P&L Moyen",
        winRate: "Taux de Réussite",
        trades: "Trades",
      },
      toggle: {
        showAverage: "Afficher la Moyenne",
      },
    },

    pnlPerContract: {
      title: "P&L Net Moyen par Contrat",
      description:
        "Profit/perte net moyen par contrat par instrument de trading (après commissions)",
      tooltip: {
        averagePnl: "P&L Net Moyen par Contrat",
        totalPnl: "P&L Net Total",
        trades: "Trades",
        totalContracts: "Total des Contrats",
      },
    },

    pnlPerContractDaily: {
      title: "P&L Net moyen par contrat par jour",
      description:
        "Profit/perte net moyen par contrat par jour pour l'instrument de trading",
      tooltip: {
        date: "Date",
        averagePnl: "P&L Net moyen par contrat",
        totalPnl: "P&L Net total",
        trades: "Trades",
        totalContracts: "Total des contrats",
      },
    },

    pnlTime: {
      title: "P&L moyen par heure",
      description: "Profits et pertes moyens pour chaque heure de la journée",
      tooltip: {
        time: "Heure",
        averagePnl: "P&L Moyen",
        trades: "Trades",
      },
    },

    timeInPosition: {
      title: "Temps Moyen en Position",
      description: "Temps moyen en position pour chaque heure de la journée",
      tooltip: {
        time: "Heure",
        averageDuration: "Durée Moyenne",
        trades: "Trades",
      },
    },

    weekdayPnl: {
      title: "P&L Moyen par Jour",
      description: "Profits et pertes moyens pour chaque jour de la semaine",
      tooltip: {
        day: "Jour",
        averagePnl: "P&L Moyen",
        trades: "Trades",
      },
    },

    tradeDistribution: {
      title: "Distribution des opérations",
      description:
        "Distribution des opérations par résultat (gagnant/perdant/neutre)",
      tooltip: {
        type: "Type",
        percentage: "Pourcentage",
      },
      winTrades: "Opérations gagnantes",
      lossTrades: "Opérations perdantes",
      breakevenTrades: "Opérations neutres",
    },

    tickDistribution: {
      title: "Distribution des ticks",
      description: "Distribution des opérations par valeur de tick",
      tooltip: {
        ticks: "Ticks",
        frequency: "Fréquence",
      },
    },

    commissions: {
      title: "P&L vs commissions",
      tooltip: {
        description:
          "Distribution des profits/pertes nets par rapport aux commissions payées",
        percentage: "Pourcentage",
      },
      legend: {
        netPnl: "P&L Net",
        commissions: "commissions",
      },
    },

    contracts: {
      title: "Nombre Total de Contrats",
      description:
        "Affichage du nombre total de contrats tradés pour chaque heure de la journée. Les barres plus foncées indiquent plus d’opérations.",
      tooltip: {
        hour: "h",
        totalContracts: "Total des Contrats",
        numberOfTrades: "Nombre d’opérations",
      },
    },

    timeRangePerformance: {
      title: "Performance par intervalle de temps",
      description: "Performance par intervalle de temps",
      tooltip: {
        timeRange: "Intervalle de temps",
        avgPnl: "P/L moyen",
        winRate: "Taux de réussite",
        "trades#zero": "Aucune opération",
        "trades#one": "1 opération",
        "trades#other": "{count} opérations",
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
        sun: "Dim",
        mon: "Lun",
        tue: "Mar",
        wed: "Mer",
        thu: "Jeu",
        fri: "Ven",
        sat: "Sam",
      },
      charts: {
        trades: "opérations",
      },
    },
  },
};

export default embed;
