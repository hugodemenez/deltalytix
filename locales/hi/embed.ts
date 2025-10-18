export default {
  embed: {
    charts: {
      timeRangePerformance: "समय सीमा के अनुसार प्रदर्शन",
      dailyPnl: "दैनिक PnL",
      timeOfDay: "दिन के समय के अनुसार प्रदर्शन",
      timeInPosition: "पोजीशन में समय",
      pnlBySide: "दिशा के अनुसार PnL",
      tradeDistribution: "ट्रेड वितरण",
      weekdayPnl: "सप्ताह के दिन के अनुसार PnL",
      pnlPerContract: "प्रति अनुबंध PnL",
      pnlPerContractDaily: "प्रति अनुबंध PnL (दैनिक)",
      tickDistribution: "टिक वितरण",
      commissionsPnl: "कमीशन PnL",
      contractQuantity: "अनुबंध मात्रा",
    },

    descriptions: {
      timeRangePerformance:
        "पोजीशन में समय के अनुसार समूहीकृत ट्रेडों के लिए औसत PnL और जीत दर दिखाता है",
      pnlBySide:
        "लॉन्ग बनाम शॉर्ट प्रदर्शन की तुलना करें। औसत/कुल के बीच टॉगल करें।",
      dailyPnl:
        "ट्रेडों से एकत्रित दैनिक कुल PnL। टूलटिप लॉन्ग/शॉर्ट गिनती दिखाता है।",
      timeOfDay:
        "इष्टतम ट्रेडिंग अवधियों को प्रकट करने के लिए दिन के घंटों में प्रदर्शन वितरण।",
      timeInPosition:
        "पोजीशन को बंद करने से पहले आमतौर पर कितनी देर तक रखा जाता है।",
      tradeDistribution:
        "तिरछापन और पूंछ को देखने के लिए PnL द्वारा ट्रेडों का वितरण।",
      weekdayPnl:
        "साप्ताहिक पैटर्न की पहचान के लिए सप्ताह के दिन के अनुसार औसत प्रदर्शन।",
      pnlPerContract:
        "लाभ की तुलना करने के लिए इंस्ट्रूमेंट/अनुबंध द्वारा समूहीकृत प्रदर्शन।",
      pnlPerContractDaily: "चयनित इंस्ट्रूमेंट/अनुबंध के लिए दैनिक PnL विवरण।",
      tickDistribution:
        "ट्रेड परिणाम फैलाव का विश्लेषण करने के लिए टिक में PnL का हिस्टोग्राम।",
      commissionsPnl: "शुद्ध लाभप्रदता को समझने के लिए PnL पर कमीशन का प्रभाव।",
      contractQuantity: "ट्रेडों में पोजीशन आकार (मात्रा) का वितरण।",
    },

    labels: {
      averagePnl: "औसत PnL",
      totalPnl: "कुल PnL",
      pnl: "PnL",
      timeRange: "समय सीमा",
      winRate: "जीत दर",
      totalTrades: "कुल ट्रेड",
      trades: "ट्रेड",
      date: "तारीख",
      long: "लॉन्ग",
      short: "शॉर्ट",
      longTrades: "लॉन्ग ट्रेड",
      shortTrades: "शॉर्ट ट्रेड",
      average: "औसत",
      total: "कुल",
      instrument: "इंस्ट्रूमेंट",
      quantity: "मात्रा",
      commission: "कमीशन",
    },

    actions: {
      showTotal: "कुल दिखाएं",
      showAverage: "औसत दिखाएं",
    },

    tooltips: {
      timeRangePerformance:
        "पोजीशन में समय के अनुसार समूहीकृत ट्रेडों के लिए औसत PnL और जीत दर दिखाता है",
      pnlBySide:
        "लॉन्ग बनाम शॉर्ट प्रदर्शन की तुलना करें। औसत/कुल के बीच टॉगल करें।",
      dailyPnl:
        "ट्रेडों से एकत्रित दैनिक कुल PnL। टूलटिप लॉन्ग/शॉर्ट गिनती दिखाता है।",
    },

    timeRanges: {
      under1min: "< 1मि",
      "1to5min": "1-5मि",
      "5to10min": "5-10मि",
      "10to15min": "10-15मि",
      "15to30min": "15-30मि",
      "30to60min": "30-60मि",
      "1to2hours": "1-2घं",
      "2to5hours": "2-5घं",
      over5hours: "> 5घं",
    },

    toasts: {
      noTradesProvided: "कोई ट्रेड प्रदान नहीं किया गया",
      generatingRandomTrades: "{count} यादृच्छिक ट्रेड उत्पन्न किए जा रहे हैं",
      errorProcessingMessage: "संदेश संसाधित करने में त्रुटि",
    },

    aria: {
      clickToAddToSelection: 'चयन में "{name}" जोड़ने के लिए क्लिक करें',
    },
    // Component-specific translations
    pnl: {
      title: "दैनिक लाभ/हानि",
      description: "समय के साथ दैनिक P&L दिखा रहा है",
      tooltip: {
        date: "तारीख",
        pnl: "P/L",
        longTrades: "लॉन्ग ट्रेड",
        shortTrades: "शॉर्ट ट्रेड",
      },
    },

    pnlBySide: {
      title: "दिशा के अनुसार P&L",
      description: "लॉन्ग और शॉर्ट ट्रेडों के बीच लाभ/हानि की तुलना",
      tooltip: {
        averageTotal: "औसत P&L",
        winRate: "जीत दर",
        trades: "ट्रेड",
      },
      toggle: {
        showAverage: "औसत दिखाएं",
      },
    },

    pnlPerContract: {
      title: "प्रति अनुबंध औसत शुद्ध P&L",
      description:
        "ट्रेडिंग इंस्ट्रूमेंट द्वारा प्रति अनुबंध औसत शुद्ध लाभ/हानि (कमीशन के बाद)",
      tooltip: {
        averagePnl: "प्रति अनुबंध औसत शुद्ध P&L",
        totalPnl: "कुल शुद्ध P&L",
        trades: "ट्रेड",
        totalContracts: "कुल अनुबंध",
      },
    },

    pnlPerContractDaily: {
      title: "प्रति अनुबंध दैनिक औसत शुद्ध P&L",
      description:
        "चयनित इंस्ट्रूमेंट के लिए प्रति दिन प्रति अनुबंध औसत शुद्ध लाभ/हानि (कमीशन के बाद)",
      tooltip: {
        date: "तारीख",
        averagePnl: "प्रति अनुबंध औसत शुद्ध P&L",
        totalPnl: "कुल शुद्ध P&L",
        trades: "ट्रेड",
        totalContracts: "कुल अनुबंध",
      },
    },

    pnlTime: {
      title: "घंटे के अनुसार औसत P&L",
      description: "दिन के प्रत्येक घंटे के लिए औसत लाभ/हानि",
      tooltip: {
        time: "समय",
        averagePnl: "औसत P&L",
        trades: "ट्रेड",
      },
    },

    timeInPosition: {
      title: "पोजीशन में औसत समय",
      description: "दिन के प्रत्येक घंटे के लिए पोजीशन में औसत समय",
      tooltip: {
        time: "समय",
        averageDuration: "औसत अवधि",
        trades: "ट्रेड",
      },
    },

    weekdayPnl: {
      title: "दिन के अनुसार औसत P&L",
      description: "सप्ताह के प्रत्येक दिन के लिए औसत लाभ/हानि",
      tooltip: {
        day: "दिन",
        averagePnl: "औसत P&L",
        trades: "ट्रेड",
      },
    },

    tradeDistribution: {
      title: "ट्रेड वितरण",
      description: "परिणाम के आधार पर ट्रेडों का वितरण (जीत/हार/बराबर)",
      tooltip: {
        type: "प्रकार",
        percentage: "प्रतिशत",
      },
      winTrades: "जीतने वाले ट्रेड",
      lossTrades: "हारने वाले ट्रेड",
      breakevenTrades: "बराबर ट्रेड",
    },

    tickDistribution: {
      title: "टिक वितरण",
      description: "टिक मूल्य के आधार पर ट्रेडों का वितरण",
      tooltip: {
        ticks: "टिक्स",
        frequency: "आवृत्ति",
      },
    },

    commissions: {
      title: "P&L बनाम कमीशन",
      tooltip: {
        description: "शुद्ध लाभ/हानि का भुगतान किए गए कमीशन के साथ वितरण",
        percentage: "प्रतिशत",
      },
      legend: {
        netPnl: "शुद्ध P&L",
        commissions: "कमीशन",
      },
    },

    contracts: {
      title: "कुल अनुबंध संख्या",
      description:
        "दिन के प्रत्येक घंटे के लिए ट्रेड किए गए कुल अनुबंधों की संख्या दिखा रहा है। गहरे बार अधिक ट्रेडों को दर्शाते हैं।",
      tooltip: {
        hour: "h",
        totalContracts: "कुल अनुबंध",
        numberOfTrades: "ट्रेडों की संख्या",
      },
    },

    timeRangePerformance: {
      title: "समय सीमा प्रदर्शन",
      description: "समय सीमा के अनुसार प्रदर्शन",
      tooltip: {
        timeRange: "समय सीमा",
        avgPnl: "औसत P/L",
        winRate: "जीत दर",
        "trades#zero": "कोई ट्रेड नहीं",
        "trades#one": "1 ट्रेड",
        "trades#other": "{count} ट्रेड",
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
        sun: "रवि",
        mon: "सोम",
        tue: "मंगल",
        wed: "बुध",
        thu: "गुरु",
        fri: "शुक्र",
        sat: "शनि",
      },
      charts: {
        trades: "ट्रेड",
      },
    },
  },
};
