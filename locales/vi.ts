import embed from './vi/embed'

export default {
  ...embed,
  timeRangePerformance: {
    title: 'Hiệu Suất Theo Khoảng Thời Gian',
    description: 'Phân bổ P&L trung bình và tỷ lệ thắng qua các thời gian giữ vị thế khác nhau',
    tooltip: {
      timeRange: 'Khoảng Thời Gian',
      avgPnl: 'P&L Trung Bình',
      winRate: 'Tỷ Lệ Thắng',
      trades: {
        one: '{count} giao dịch',
        other: '{count} giao dịch'
      }
    },
    ranges: {
      under1min: 'Dưới 1p',
      '1to5min': '1-5p',
      '5to10min': '5-10p',
      '10to15min': '10-15p',
      '15to30min': '15-30p',
      '30to60min': '30-60p',
      '1to2hours': '1-2g',
      '2to5hours': '2-5g',
      over5hours: 'Trên 5g'
    },
    clearFilter: 'Xóa bộ lọc'
  },
}
