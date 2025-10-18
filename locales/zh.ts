import embed from './zh/embed'

export default {
  ...embed,
  timeRangePerformance: {
    title: '时间范围表现',
    description: '不同持有时间的平均盈亏和胜率分布',
    tooltip: {
      timeRange: '时间范围',
      avgPnl: '平均盈亏',
      winRate: '胜率',
      trades: {
        one: '{count}笔交易',
        other: '{count}笔交易'
      }
    },
    ranges: {
      under1min: '少于1分钟',
      '1to5min': '1-5分钟',
      '5to10min': '5-10分钟',
      '10to15min': '10-15分钟',
      '15to30min': '15-30分钟',
      '30to60min': '30-60分钟',
      '1to2hours': '1-2小时',
      '2to5hours': '2-5小时',
      over5hours: '超过5小时'
    },
    clearFilter: '清除筛选'
  },
}
