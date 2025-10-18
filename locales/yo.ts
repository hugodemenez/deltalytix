import embed from './yo/embed'

export default {
  ...embed,
  timeRangePerformance: {
    title: 'Iṣẹ́ Akoko Ibiti',
    description: 'Pinpin apapọ PnL ati oṣuwọn iṣẹgun lori awọn akoko mimu oriṣiriṣi',
    tooltip: {
      timeRange: 'Akoko Ibiti',
      avgPnl: 'Apapọ PnL',
      winRate: 'Oṣuwọn Iṣẹgun',
      trades: {
        one: '{count} iṣowo',
        other: '{count} awọn iṣowo'
      }
    },
    ranges: {
      under1min: 'Kere ju 1i',
      '1to5min': '1-5i',
      '5to10min': '5-10i',
      '10to15min': '10-15i',
      '15to30min': '15-30i',
      '30to60min': '30-60i',
      '1to2hours': '1-2w',
      '2to5hours': '2-5w',
      over5hours: 'Ju 5w lọ'
    },
    clearFilter: 'Pa ajọ kuro'
  },
}
