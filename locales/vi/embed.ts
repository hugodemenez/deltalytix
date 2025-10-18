export default {
  embed: {
    charts: {
      timeRangePerformance: 'Hiệu Suất Theo Khoảng Thời Gian',
      dailyPnl: 'PnL Hàng Ngày',
      timeOfDay: 'Hiệu Suất Theo Giờ Trong Ngày',
      timeInPosition: 'Thời Gian Giữ Vị Thế',
      pnlBySide: 'PnL Theo Hướng',
      tradeDistribution: 'Phân Bổ Giao Dịch',
      weekdayPnl: 'PnL Theo Ngày Trong Tuần',
      pnlPerContract: 'PnL Trên Mỗi Hợp Đồng',
      pnlPerContractDaily: 'PnL Trên Mỗi Hợp Đồng (Hàng Ngày)',
      tickDistribution: 'Phân Bổ Tick',
      commissionsPnl: 'PnL Hoa Hồng',
      contractQuantity: 'Số Lượng Hợp Đồng',
    },

    descriptions: {
      timeRangePerformance:
        'Hiển thị PnL trung bình và tỷ lệ thắng cho các giao dịch được nhóm theo thời gian giữ vị thế',
      pnlBySide: 'So sánh hiệu suất long vs short. Chuyển đổi giữa trung bình/tổng.',
      dailyPnl:
        'Tổng PnL hàng ngày được tổng hợp từ các giao dịch. Tooltip hiển thị số lượng long/short.',
      timeOfDay:
        'Phân bổ hiệu suất qua các giờ trong ngày để phát hiện các khoảng thời gian giao dịch tối ưu.',
      timeInPosition:
        'Thời gian các vị thế thường được giữ trước khi đóng.',
      tradeDistribution:
        'Phân bổ giao dịch theo PnL để hình dung độ lệch và đuôi.',
      weekdayPnl:
        'Hiệu suất trung bình theo ngày trong tuần để xác định các mẫu hàng tuần.',
      pnlPerContract:
        'Hiệu suất được nhóm theo công cụ/hợp đồng để so sánh lợi thế.',
      pnlPerContractDaily:
        'Phân tích PnL hàng ngày cho công cụ/hợp đồng đã chọn.',
      tickDistribution:
        'Biểu đồ của PnL theo tick để phân tích độ phân tán của kết quả giao dịch.',
      commissionsPnl:
        'Tác động của hoa hồng lên PnL để hiểu khả năng sinh lời ròng.',
      contractQuantity:
        'Phân bổ kích thước vị thế (số lượng) qua các giao dịch.',
    },

    labels: {
      averagePnl: 'PnL Trung Bình',
      totalPnl: 'Tổng PnL',
      pnl: 'PnL',
      timeRange: 'Khoảng Thời Gian',
      winRate: 'Tỷ Lệ Thắng',
      totalTrades: 'Tổng Số Giao Dịch',
      trades: 'Giao Dịch',
      date: 'Ngày',
      long: 'Long',
      short: 'Short',
      longTrades: 'Giao dịch long',
      shortTrades: 'Giao dịch short',
      average: 'Trung Bình',
      total: 'Tổng',
      instrument: 'Công Cụ',
      quantity: 'Số Lượng',
      commission: 'Hoa Hồng',
    },

    actions: {
      showTotal: 'Hiển thị tổng',
      showAverage: 'Hiển thị trung bình',
    },

    tooltips: {
      timeRangePerformance:
        'Hiển thị PnL trung bình và tỷ lệ thắng cho các giao dịch được nhóm theo thời gian giữ vị thế',
      pnlBySide: 'So sánh hiệu suất long vs short. Chuyển đổi giữa trung bình/tổng.',
      dailyPnl:
        'Tổng PnL hàng ngày được tổng hợp từ các giao dịch. Tooltip hiển thị số lượng long/short.',
    },

    timeRanges: {
      under1min: '< 1p',
      '1to5min': '1-5p',
      '5to10min': '5-10p',
      '10to15min': '10-15p',
      '15to30min': '15-30p',
      '30to60min': '30-60p',
      '1to2hours': '1-2g',
      '2to5hours': '2-5g',
      over5hours: '> 5g',
    },

    toasts: {
      noTradesProvided: 'Không có giao dịch nào được cung cấp',
      generatingRandomTrades: 'Đang tạo {count} giao dịch ngẫu nhiên',
      errorProcessingMessage: 'Lỗi xử lý tin nhắn',
    },

    aria: {
      clickToAddToSelection: 'Nhấp để thêm "{name}" vào lựa chọn',
    },
    // Component-specific translations
    pnl: {
      title: 'Lợi nhuận/lỗ hàng ngày',
      description: 'Hiển thị P&L hàng ngày theo thời gian',
      tooltip: {
        date: 'Ngày',
        pnl: 'P/L',
        longTrades: 'Giao dịch long',
        shortTrades: 'Giao dịch short',
      },
    },

    pnlBySide: {
      title: 'P&L Theo Hướng',
      description: 'So sánh lợi nhuận/thua lỗ giữa giao dịch long và short',
      tooltip: {
        averageTotal: 'P&L Trung Bình',
        winRate: 'Tỷ Lệ Thắng',
        trades: 'Giao Dịch',
      },
      toggle: {
        showAverage: 'Hiển Thị Trung Bình',
      },
    },

    pnlPerContract: {
      title: 'P&L Ròng TB Trên Mỗi Hợp Đồng',
      description: 'Lợi nhuận/thua lỗ ròng trung bình trên mỗi hợp đồng theo công cụ giao dịch (sau hoa hồng)',
      tooltip: {
        averagePnl: 'P&L Ròng TB Trên Mỗi Hợp Đồng',
        totalPnl: 'Tổng P&L Ròng',
        trades: 'Giao Dịch',
        totalContracts: 'Tổng Hợp Đồng',
      },
    },

    pnlPerContractDaily: {
      title: 'P&L Ròng TB Hàng Ngày Trên Mỗi Hợp Đồng',
      description: 'Lợi nhuận/thua lỗ ròng trung bình trên mỗi hợp đồng mỗi ngày cho công cụ đã chọn (sau hoa hồng)',
      tooltip: {
        date: 'Ngày',
        averagePnl: 'P&L Ròng TB Trên Mỗi Hợp Đồng',
        totalPnl: 'Tổng P&L Ròng',
        trades: 'Giao Dịch',
        totalContracts: 'Tổng Hợp Đồng',
      },
    },

    pnlTime: {
      title: 'P&L trung bình theo giờ',
      description: 'Lợi nhuận/lỗ trung bình cho mỗi giờ trong ngày',
      tooltip: {
        time: 'Giờ',
        averagePnl: 'P&L trung bình',
        trades: 'Giao dịch',
      },
    },

    timeInPosition: {
      title: 'Thời gian trung bình trong vị thế',
      description: 'Thời gian trung bình trong vị thế cho mỗi giờ trong ngày',
      tooltip: {
        time: 'Giờ',
        averageDuration: 'Thời gian trung bình',
        trades: 'Giao dịch',
      },
    },

    weekdayPnl: {
      title: 'P&L trung bình theo ngày',
      description: 'Lợi nhuận/lỗ trung bình cho mỗi ngày trong tuần',
      tooltip: {
        day: 'Ngày',
        averagePnl: 'P&L trung bình',
        trades: 'Giao dịch',
      },
    },

    tradeDistribution: {
      title: 'Trade Distribution',
      description: 'Distribution of trades',
      tooltip: {
        type: 'Type',
        percentage: 'Percentage',
      },
    },

    tickDistribution: {
      title: 'Tick Distribution',
      description: 'Distribution by ticks',
    },

    commissions: {
      title: 'P&L vs Hoa Hồng',
      tooltip: {
        description: 'Phân bổ lợi nhuận/thua lỗ ròng so với hoa hồng đã trả',
        percentage: 'Phần trăm',
      },
      legend: {
        netPnl: 'P&L Ròng',
        commissions: 'Hoa Hồng',
      },
    },

    contracts: {
      title: 'Tổng Số Hợp Đồng',
      description: 'Hiển thị tổng số hợp đồng được giao dịch cho mỗi giờ trong ngày. Thanh tối hơn cho thấy nhiều giao dịch hơn.',
      tooltip: {
        hour: 'h',
        totalContracts: 'Tổng Hợp Đồng',
        numberOfTrades: 'Số Giao Dịch',
      },
    },

    timeRangePerformance: {
      title: 'Time Range Performance',
      description: 'Performance by time range',
      tooltip: {
        timeRange: 'Time Range',
        avgPnl: 'Average P/L',
        winRate: 'Win Rate',
      },
      ranges: {
        under1min: '< 1m',
        '1to5min': '1-5m',
        '5to10min': '5-10m',
        '10to15min': '10-15m',
        '15to30min': '15-30m',
        '30to60min': '30-60m',
        '1to2hours': '1-2h',
        '2to5hours': '2-5h',
        over5hours: '> 5h',
      },
    },

    calendar: {
      weekdays: {
        sun: 'CN',
        mon: 'T2',
        tue: 'T3',
        wed: 'T4',
        thu: 'T5',
        fri: 'T6',
        sat: 'T7',
      },
      charts: {
        trades: 'giao dịch',
      },
    },

  },
}
