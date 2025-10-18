import embed from './hi/embed'

export default {
  ...embed,
  timeRangePerformance: {
    title: 'समय सीमा के अनुसार प्रदर्शन',
    description: 'विभिन्न होल्डिंग समय में औसत P&L और जीत दर वितरण',
    tooltip: {
      timeRange: 'समय सीमा',
      avgPnl: 'औसत P&L',
      winRate: 'जीत दर',
      trades: {
        one: '{count} ट्रेड',
        other: '{count} ट्रेड'
      }
    },
    ranges: {
      under1min: '1मि से कम',
      '1to5min': '1-5मि',
      '5to10min': '5-10मि',
      '10to15min': '10-15मि',
      '15to30min': '15-30मि',
      '30to60min': '30-60मि',
      '1to2hours': '1-2घं',
      '2to5hours': '2-5घं',
      over5hours: '5घं से अधिक'
    },
    clearFilter: 'फ़िल्टर साफ़ करें'
  },
}
