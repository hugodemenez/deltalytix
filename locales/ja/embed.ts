const embed = {
  embed: {
    charts: {
      timeRangePerformance: "時間範囲別パフォーマンス",
      dailyPnl: "日次PnL",
      timeOfDay: "時間帯別パフォーマンス",
      timeInPosition: "ポジション保有時間",
      pnlBySide: "ロング/ショート別PnL",
      tradeDistribution: "トレード分布",
      weekdayPnl: "曜日別PnL",
      pnlPerContract: "契約あたりPnL",
      pnlPerContractDaily: "契約あたりPnL（日次）",
      tickDistribution: "ティック分布",
      commissionsPnl: "手数料PnL",
      contractQuantity: "契約数量",
    },

    descriptions: {
      timeRangePerformance:
        "ポジション保有時間別にグループ化されたトレードの平均PnLと勝率を表示",
      pnlBySide:
        "ロングとショートのパフォーマンスを比較。平均/合計を切り替え。",
      dailyPnl:
        "トレードから集計された日次合計PnL。ツールチップにはロング/ショートの数が表示されます。",
      timeOfDay:
        "最適な取引期間を明らかにするための、一日の時間帯別のパフォーマンス分布。",
      timeInPosition: "ポジションがクローズされるまでに通常保有される時間。",
      tradeDistribution: "歪度と裾野を視覚化するためのPnL別トレード分布。",
      weekdayPnl: "週次パターンを識別するための曜日別平均パフォーマンス。",
      pnlPerContract:
        "優位性を比較するための銘柄/契約別にグループ化されたパフォーマンス。",
      pnlPerContractDaily: "選択した銘柄/契約の日次PnL内訳。",
      tickDistribution:
        "トレード結果の分散を分析するためのティック単位のPnLヒストグラム。",
      commissionsPnl: "純収益性を理解するためのPnLへの手数料の影響。",
      contractQuantity: "トレード全体のポジションサイズ（数量）の分布。",
    },

    labels: {
      averagePnl: "平均PnL",
      totalPnL: "合計PnL",
      pnl: "PnL",
      timeRange: "時間範囲",
      winRate: "勝率",
      totalTrades: "合計トレード数",
      trades: "トレード",
      date: "日付",
      long: "ロング",
      short: "ショート",
      longTrades: "ロングトレード",
      shortTrades: "ショートトレード",
      average: "平均",
      total: "合計",
      instrument: "銘柄",
      quantity: "数量",
      commission: "手数料",
    },

    actions: {
      showTotal: "合計を表示",
      showAverage: "平均を表示",
    },

    tooltips: {
      timeRangePerformance:
        "ポジション保有時間別にグループ化されたトレードの平均PnLと勝率を表示",
      pnlBySide:
        "ロングとショートのパフォーマンスを比較。平均/合計を切り替え。",
      dailyPnl:
        "トレードから集計された日次合計PnL。ツールチップにはロング/ショートの数が表示されます。",
    },

    timeRanges: {
      under1min: "< 1分",
      "1to5min": "1-5分",
      "5to10min": "5-10分",
      "10to15min": "10-15分",
      "15to30min": "15-30分",
      "30to60min": "30-60分",
      "1to2hours": "1-2時間",
      "2to5hours": "2-5時間",
      over5hours: "> 5時間",
    },

    toasts: {
      noTradesProvided: "トレードが提供されていません",
      generatingRandomTrades: "{count}件のランダムトレードを生成中",
      errorProcessingMessage: "メッセージの処理中にエラーが発生しました",
    },

    aria: {
      clickToAddToSelection: '"{name}"を選択に追加するにはクリックしてください',
    },
    // Component-specific translations
    pnl: {
      title: "日次損益",
      description: "時系列での日次P&Lを表示",
      tooltip: {
        date: "日付",
        pnl: "P/L",
        longTrades: "ロング取引",
        shortTrades: "ショート取引",
      },
    },

    pnlBySide: {
      title: "ロング/ショート別P&L",
      description: "ロングとショートの取引間の利益/損失の比較",
      tooltip: {
        averageTotal: "平均P&L",
        winRate: "勝率",
        trades: "取引",
      },
      toggle: {
        showAverage: "平均を表示",
      },
    },

    pnlPerContract: {
      title: "契約あたり平均純P&L",
      description: "取引銘柄別の契約あたり平均純利益/損失（手数料控除後）",
      tooltip: {
        averagePnl: "契約あたり平均純P&L",
        totalPnl: "総純P&L",
        trades: "取引",
        totalContracts: "総契約数",
      },
    },

    pnlPerContractDaily: {
      title: "契約あたり日次平均純P&L",
      description:
        "選択した銘柄の1日あたり契約あたり平均純利益/損失（手数料控除後）",
      tooltip: {
        date: "日付",
        averagePnl: "契約あたり平均純P&L",
        totalPnl: "総純P&L",
        trades: "取引",
        totalContracts: "総契約数",
      },
    },

    pnlTime: {
      title: "時間別平均P&L",
      description: "一日の各時間帯における平均利益/損失",
      tooltip: {
        time: "時間",
        averagePnl: "平均P&L",
        trades: "取引",
      },
    },

    timeInPosition: {
      title: "ポジション保有時間の平均",
      description: "一日の各時間帯におけるポジション保有時間の平均",
      tooltip: {
        time: "時間",
        averageDuration: "平均期間",
        trades: "取引",
      },
    },

    weekdayPnl: {
      title: "曜日別平均P&L",
      description: "週の各曜日における平均利益/損失",
      tooltip: {
        day: "曜日",
        averagePnl: "平均P&L",
        trades: "取引",
      },
    },

    tradeDistribution: {
      title: "取引分布",
      description: "結果別の取引分布（勝/負/引き分け）",
      tooltip: {
        type: "タイプ",
        percentage: "パーセンテージ",
      },
      winTrades: "勝ちトレード",
      lossTrades: "負けトレード",
      breakevenTrades: "引き分けトレード",
    },

    tickDistribution: {
      title: "ティック分布",
      description: "ティック値による取引分布",
      tooltip: {
        ticks: "ティック",
        frequency: "頻度",
      },
    },

    commissions: {
      title: "P&L vs 手数料",
      tooltip: {
        description: "純利益/損失と支払った手数料の分布",
        percentage: "割合",
      },
      legend: {
        netPnl: "純P&L",
        commissions: "手数料",
      },
    },

    contracts: {
      title: "契約の総数",
      description:
        "一日の各時間帯における取引された契約の総数を表示。暗いバーはより多くの取引を示します。",
      tooltip: {
        hour: "h",
        totalContracts: "総契約数",
        numberOfTrades: "取引数",
      },
    },

    timeRangePerformance: {
      title: "時間範囲パフォーマンス",
      description: "時間範囲別のパフォーマンス",
      tooltip: {
        timeRange: "時間範囲",
        avgPnl: "平均P/L",
        winRate: "勝率",
        "trades#zero": "取引なし",
        "trades#one": "1取引",
        "trades#other": "{count}取引",
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
        sun: "日",
        mon: "月",
        tue: "火",
        wed: "水",
        thu: "木",
        fri: "金",
        sat: "土",
      },
      charts: {
        trades: "取引",
      },
    },
  },
};

export default embed;
