export default {
  embed: {
    charts: {
      timeRangePerformance: '時間範囲別パフォーマンス',
      dailyPnl: '日次PnL',
      timeOfDay: '時間帯別パフォーマンス',
      timeInPosition: 'ポジション保有時間',
      pnlBySide: 'ロング/ショート別PnL',
      tradeDistribution: 'トレード分布',
      weekdayPnl: '曜日別PnL',
      pnlPerContract: '契約あたりPnL',
      pnlPerContractDaily: '契約あたりPnL（日次）',
      tickDistribution: 'ティック分布',
      commissionsPnl: '手数料PnL',
      contractQuantity: '契約数量',
    },

    descriptions: {
      timeRangePerformance:
        'ポジション保有時間別にグループ化されたトレードの平均PnLと勝率を表示',
      pnlBySide: 'ロングとショートのパフォーマンスを比較。平均/合計を切り替え。',
      dailyPnl:
        'トレードから集計された日次合計PnL。ツールチップにはロング/ショートの数が表示されます。',
      timeOfDay:
        '最適な取引期間を明らかにするための、一日の時間帯別のパフォーマンス分布。',
      timeInPosition:
        'ポジションがクローズされるまでに通常保有される時間。',
      tradeDistribution:
        '歪度と裾野を視覚化するためのPnL別トレード分布。',
      weekdayPnl:
        '週次パターンを識別するための曜日別平均パフォーマンス。',
      pnlPerContract:
        '優位性を比較するための銘柄/契約別にグループ化されたパフォーマンス。',
      pnlPerContractDaily:
        '選択した銘柄/契約の日次PnL内訳。',
      tickDistribution:
        'トレード結果の分散を分析するためのティック単位のPnLヒストグラム。',
      commissionsPnl:
        '純収益性を理解するためのPnLへの手数料の影響。',
      contractQuantity:
        'トレード全体のポジションサイズ（数量）の分布。',
    },

    labels: {
      averagePnl: '平均PnL',
      totalPnL: '合計PnL',
      pnl: 'PnL',
      timeRange: '時間範囲',
      winRate: '勝率',
      totalTrades: '合計トレード数',
      trades: 'トレード',
      date: '日付',
      long: 'ロング',
      short: 'ショート',
      longTrades: 'ロングトレード',
      shortTrades: 'ショートトレード',
      average: '平均',
      total: '合計',
      instrument: '銘柄',
      quantity: '数量',
      commission: '手数料',
    },

    actions: {
      showTotal: '合計を表示',
      showAverage: '平均を表示',
    },

    tooltips: {
      timeRangePerformance:
        'ポジション保有時間別にグループ化されたトレードの平均PnLと勝率を表示',
      pnlBySide: 'ロングとショートのパフォーマンスを比較。平均/合計を切り替え。',
      dailyPnl:
        'トレードから集計された日次合計PnL。ツールチップにはロング/ショートの数が表示されます。',
    },

    timeRanges: {
      under1min: '< 1分',
      '1to5min': '1-5分',
      '5to10min': '5-10分',
      '10to15min': '10-15分',
      '15to30min': '15-30分',
      '30to60min': '30-60分',
      '1to2hours': '1-2時間',
      '2to5hours': '2-5時間',
      over5hours: '> 5時間',
    },

    toasts: {
      noTradesProvided: 'トレードが提供されていません',
      generatingRandomTrades: '{count}件のランダムトレードを生成中',
      errorProcessingMessage: 'メッセージの処理中にエラーが発生しました',
    },

    aria: {
      clickToAddToSelection: '"{name}"を選択に追加するにはクリックしてください',
    },
  },
}
