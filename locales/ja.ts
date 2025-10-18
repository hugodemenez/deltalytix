import embed from './ja/embed'

export default {
  ...embed,
  timeRangePerformance: {
    title: '時間範囲別パフォーマンス',
    description: '異なる保有時間における平均P&Lと勝率の分布',
    tooltip: {
      timeRange: '時間範囲',
      avgPnl: '平均P&L',
      winRate: '勝率',
      trades: {
        one: '{count}件のトレード',
        other: '{count}件のトレード'
      }
    },
    ranges: {
      under1min: '1分未満',
      '1to5min': '1-5分',
      '5to10min': '5-10分',
      '10to15min': '10-15分',
      '15to30min': '15-30分',
      '30to60min': '30-60分',
      '1to2hours': '1-2時間',
      '2to5hours': '2-5時間',
      over5hours: '5時間以上'
    },
    clearFilter: 'フィルタをクリア'
  },
}
