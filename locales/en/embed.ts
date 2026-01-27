const embed = {
  embed: {
    charts: {
      timeRangePerformance: "Time Range Performance",
      dailyPnl: "Daily PnL",
      timeOfDay: "Time of Day Performance",
      timeInPosition: "Time in Position",
      pnlBySide: "PnL by Side",
      tradeDistribution: "Trade Distribution",
      weekdayPnl: "Weekday PnL",
      pnlPerContract: "PnL per Contract",
      pnlPerContractDaily: "PnL per Contract (Daily)",
      tickDistribution: "Tick Distribution",
      commissionsPnl: "Commissions PnL",
      contractQuantity: "Contract Quantity",
    },

    descriptions: {
      timeRangePerformance:
        "Shows average PnL and win rate for trades grouped by time in position",
      pnlBySide: "Compare long vs short performance. Toggle average/total.",
      dailyPnl:
        "Daily total PnL aggregated from trades. Tooltip shows long/short counts.",
      timeOfDay:
        "Performance distribution across hours of the day to reveal optimal trading periods.",
      timeInPosition:
        "How long positions are typically held before being closed.",
      tradeDistribution:
        "Distribution of trades by PnL to visualize skewness and tails.",
      weekdayPnl:
        "Average performance by day of the week to identify weekly patterns.",
      pnlPerContract:
        "Performance grouped by instrument/contract to compare edges.",
      pnlPerContractDaily:
        "Daily PnL breakdown per selected instrument/contract.",
      tickDistribution:
        "Histogram of PnL in ticks to analyze trade outcome dispersion.",
      commissionsPnl:
        "Commissions impact on PnL to understand net profitability.",
      contractQuantity:
        "Distribution of position sizes (quantity) across trades.",
    },

    labels: {
      averagePnl: "Average PnL",
      totalPnl: "Total PnL",
      pnl: "PnL",
      timeRange: "Time Range",
      winRate: "Win Rate",
      totalTrades: "Total Trades",
      trades: "Trades",
      date: "Date",
      long: "Long",
      short: "Short",
      longTrades: "Long trades",
      shortTrades: "Short trades",
      average: "Average",
      total: "Total",
      instrument: "Instrument",
      quantity: "Quantity",
      commission: "Commission",
    },

    actions: {
      showTotal: "Show total",
      showAverage: "Show average",
    },

    tooltips: {
      timeRangePerformance:
        "Shows average PnL and win rate for trades grouped by time in position",
      pnlBySide: "Compare long vs short performance. Toggle average/total.",
      dailyPnl:
        "Daily total PnL aggregated from trades. Tooltip shows long/short counts.",
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
      noTradesProvided: "No trades provided",
      generatingRandomTrades: "Generating {count} random trades",
      errorProcessingMessage: "Error processing message",
    },

    aria: {
      clickToAddToSelection: 'Click to add "{name}" to selection',
    },
    // Component-specific translations
    pnl: {
      title: "Daily Profit/Loss",
      description: "Showing daily P/L over time",
      tooltip: {
        date: "Date",
        pnl: "P/L",
        longTrades: "Long Trades",
        shortTrades: "Short Trades",
      },
    },

    pnlBySide: {
      title: "P/L by Side",
      description: "Profit/loss comparison between long and short trades",
      tooltip: {
        averageTotal: "Average P/L",
        winRate: "Win Rate",
        trades: "Trades",
      },
      toggle: {
        showAverage: "Show Average",
      },
    },

    pnlPerContract: {
      title: "Avg Net P/L per Contract",
      description:
        "Average net profit/loss per contract by trading instrument (after commissions)",
      tooltip: {
        averagePnl: "Avg Net P/L per Contract",
        totalPnl: "Total Net P/L",
        trades: "Trades",
        totalContracts: "Total Contracts",
      },
    },

    pnlPerContractDaily: {
      title: "Daily Avg Net P/L per contract",
      description:
        "Average net profit/loss per contract per day for selected instrument (after commissions)",
      tooltip: {
        date: "Date",
        averagePnl: "Avg Net P/L per contract",
        totalPnl: "Total Net P/L",
        trades: "Trades",
        totalContracts: "Total contracts",
      },
    },

    pnlTime: {
      title: "Average P/L by Hour",
      description: "Average profit/loss for each hour of the day",
      tooltip: {
        time: "Time",
        averagePnl: "Average P/L",
        trades: "Trades",
      },
    },

    timeInPosition: {
      title: "Average Time in Position",
      description: "Average time in position for each hour of the day",
      tooltip: {
        time: "Time",
        averageDuration: "Average Duration",
        trades: "Trades",
      },
    },

    weekdayPnl: {
      title: "Average P/L by Day",
      description: "Average profit/loss for each day of the week",
      tooltip: {
        day: "Day",
        averagePnl: "Average P/L",
        trades: "Trades",
      },
    },

    tradeDistribution: {
      title: "Trade distribution",
      description: "Distribution of trades by outcome (win/loss/breakeven)",
      tooltip: {
        type: "Type",
        percentage: "Percentage",
      },
      winTrades: "Winning trades",
      lossTrades: "Losing trades",
      breakevenTrades: "Breakeven trades",
    },

    tickDistribution: {
      title: "Tick distribution",
      description: "Distribution of trades by tick value",
      tooltip: {
        ticks: "Ticks",
        frequency: "Frequency",
      },
    },

    commissions: {
      title: "P/L vs Commissions",
      tooltip: {
        description: "Distribution of net profit/loss versus commissions paid",
        percentage: "Percentage",
      },
      legend: {
        netPnl: "Net P/L",
        commissions: "Commissions",
      },
    },

    contracts: {
      title: "Total Number of Contracts",
      description:
        "Showing total number of contracts traded for each hour of the day. Darker bars indicate more trades.",
      tooltip: {
        hour: "h",
        totalContracts: "Total Contracts",
        numberOfTrades: "Number of Trades",
      },
    },

    timeRangePerformance: {
      title: "Time range performance",
      description: "Performance by time range",
      tooltip: {
        timeRange: "Time range",
        avgPnl: "Average P/L",
        winRate: "Win rate",
        "trades#zero": "No trades",
        "trades#one": "1 trade",
        "trades#other": "{count} trades",
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
        sun: "Sun",
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
      },
      charts: {
        trades: "trades",
      },
    },
  },
};

export default embed;
