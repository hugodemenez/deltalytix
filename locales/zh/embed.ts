export default {
  embed: {
    charts: {
      timeRangePerformance: '时间范围表现',
      dailyPnl: '每日盈亏',
      timeOfDay: '一天中的时间表现',
      timeInPosition: '持仓时间',
      pnlBySide: '按方向分类的盈亏',
      tradeDistribution: '交易分布',
      weekdayPnl: '工作日盈亏',
      pnlPerContract: '每份合约盈亏',
      pnlPerContractDaily: '每份合约盈亏（每日）',
      tickDistribution: '点数分布',
      commissionsPnl: '佣金盈亏',
      contractQuantity: '合约数量',
    },

    descriptions: {
      timeRangePerformance:
        '显示按持仓时间分组的交易的平均盈亏和胜率',
      pnlBySide: '比较做多与做空的表现。在平均值/总计之间切换。',
      dailyPnl:
        '从交易中汇总的每日总盈亏。工具提示显示做多/做空计数。',
      timeOfDay:
        '一天中各小时的表现分布，以揭示最佳交易时段。',
      timeInPosition:
        '仓位在关闭前通常持有的时间。',
      tradeDistribution:
        '按盈亏分布的交易以可视化偏度和尾部。',
      weekdayPnl:
        '按星期几的平均表现以识别每周模式。',
      pnlPerContract:
        '按工具/合约分组的表现以比较优势。',
      pnlPerContractDaily:
        '所选工具/合约的每日盈亏明细。',
      tickDistribution:
        '以点数表示的盈亏直方图，用于分析交易结果的分散度。',
      commissionsPnl:
        '佣金对盈亏的影响以了解净盈利能力。',
      contractQuantity:
        '各交易的持仓规模（数量）分布。',
    },

    labels: {
      averagePnl: '平均盈亏',
      totalPnl: '总盈亏',
      pnl: '盈亏',
      timeRange: '时间范围',
      winRate: '胜率',
      totalTrades: '总交易数',
      trades: '交易',
      date: '日期',
      long: '做多',
      short: '做空',
      longTrades: '做多交易',
      shortTrades: '做空交易',
      average: '平均',
      total: '总计',
      instrument: '工具',
      quantity: '数量',
      commission: '佣金',
    },

    actions: {
      showTotal: '显示总计',
      showAverage: '显示平均值',
    },

    tooltips: {
      timeRangePerformance:
        '显示按持仓时间分组的交易的平均盈亏和胜率',
      pnlBySide: '比较做多与做空的表现。在平均值/总计之间切换。',
      dailyPnl:
        '从交易中汇总的每日总盈亏。工具提示显示做多/做空计数。',
    },

    timeRanges: {
      under1min: '< 1分钟',
      '1to5min': '1-5分钟',
      '5to10min': '5-10分钟',
      '10to15min': '10-15分钟',
      '15to30min': '15-30分钟',
      '30to60min': '30-60分钟',
      '1to2hours': '1-2小时',
      '2to5hours': '2-5小时',
      over5hours: '> 5小时',
    },

    toasts: {
      noTradesProvided: '未提供交易',
      generatingRandomTrades: '正在生成 {count} 个随机交易',
      errorProcessingMessage: '处理消息时出错',
    },

    aria: {
      clickToAddToSelection: '点击将"{name}"添加到选择',
    },
  },
}
