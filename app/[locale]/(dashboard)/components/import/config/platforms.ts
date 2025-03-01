import { ImportType } from '../import-type-selection'

export interface ProcessedData {
  headers: string[]
  processedData: string[][]
}

export interface PlatformConfig {
  type: ImportType
  name: string
  description: string
  category: 'Direct Account Sync' | 'Custom CSV Import' | 'Platform CSV Import'
  videoUrl: string
  details: string
  logo: {
    path: string
    alt: string
  }
  isDisabled?: boolean
  isRithmic?: boolean
  skipHeaderSelection?: boolean
  requiresAccountSelection?: boolean
  processFile?: (data: string[][]) => ProcessedData
}

// Platform-specific processing functions
const processRithmicPerformance = (data: string[][]): ProcessedData => {
  const processedData: string[][] = [];
  let currentAccountNumber = '';
  let currentInstrument = '';
  let headers: string[] = [];

  const isAccountNumber = (value: string) => {
    return value.length > 8 &&
      !/^[A-Z]{3}\d$/.test(value) &&
      !/^\d+$/.test(value) &&
      value !== 'Account' &&
      value !== 'Entry Order Number';
  };

  const isInstrument = (value: string) => {
    // Match common futures instrument patterns:
    // - 2-4 uppercase letters followed by 1-2 digits (e.g. ESZ4, MESZ4, ZNH3)
    // - Optionally prefixed with 'M' for micro contracts
    return /^[A-Z]{2,4}\d{1,2}$/.test(value);
  };

  data.forEach((row) => {
    if (row[0] && isAccountNumber(row[0])) {
      currentAccountNumber = row[0];
    } else if (row[0] && isInstrument(row[0])) {
      currentInstrument = row[0];
    } else if (row[0] === 'Entry Order Number') {
      headers = ['AccountNumber', 'Instrument', ...row];
    } else if (headers.length > 0 && row[0] && row[0] !== 'Entry Order Number' && row[0] !== 'Account') {
      processedData.push([currentAccountNumber, currentInstrument, ...row]);
    }
  });

  return { headers, processedData };
};

const processRithmicOrders = (data: string[][]): ProcessedData => {
  const headerRowIndex = data.findIndex(row => row[0] === 'Completed Orders') + 1
  const headers = data[headerRowIndex].filter(header => header && header.trim() !== '')
  const processedData = data.slice(headerRowIndex + 1)
  return { headers, processedData };
};

const processQuantower = (data: string[][]): ProcessedData => {
  const headers = data[0].filter(header => header && header.trim() !== '')
  const processedData = data.slice(1)
  return { headers, processedData };
};

const processStandardCsv = (data: string[][]): ProcessedData => {
  if (data.length === 0) {
    throw new Error("The CSV file appears to be empty or invalid.")
  }
  const headers = data[0].filter(header => header && header.trim() !== '')
  return { headers, processedData: data.slice(1) };
};

export const platforms: PlatformConfig[] = [
  {
    type: 'rithmic-sync',
    name: 'import.type.rithmicSync.name',
    description: 'import.type.rithmicSync.description',
    category: 'Direct Account Sync',
    videoUrl: process.env.NEXT_PUBLIC_RITHMIC_SYNC_TUTORIAL_VIDEO || '',
    details: 'import.type.rithmicSync.details',
    logo: {
      path: '/logos/rithmic.png',
      alt: 'Rithmic Logo'
    },
    isRithmic: true,
  },
  {
    type: '',
    name: 'import.type.csvAi.name',
    description: 'import.type.csvAi.description',
    category: 'Custom CSV Import',
    videoUrl: '',
    details: '',
    logo: {
      path: '',
      alt: ''
    },
    requiresAccountSelection: true,
    processFile: processStandardCsv
  },
  {
    type: 'tradezella',
    name: 'import.type.tradezella.name',
    description: 'import.type.tradezella.description',
    category: 'Platform CSV Import',
    videoUrl: '',
    details: '',
    logo: {
      path: '/logos/tradezella.png',
      alt: 'Tradezella Logo'
    },
    processFile: processStandardCsv
  },
  {
    type: 'tradovate',
    name: 'import.type.tradovate.name',
    description: 'import.type.tradovate.description',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_TRADEOVATE_TUTORIAL_VIDEO || '',
    details: '',
    logo: {
      path: '/logos/tradovate.png',
      alt: 'Tradovate Logo'
    },
    requiresAccountSelection: true,
    processFile: processStandardCsv
  },
  {
    type: 'quantower',
    name: 'import.type.quantower.name',
    description: 'import.type.quantower.description',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_QUANTOWER_TUTORIAL_VIDEO || '',
    details: '',
    logo: {
      path: '/logos/quantower.png',
      alt: 'Quantower Logo'
    },
    skipHeaderSelection: true,
    processFile: processQuantower
  },
  {
    type: 'topstep',
    name: 'import.type.topstep.name',
    description: 'import.type.topstep.description',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_TOPSTEP_TUTORIAL_VIDEO || '',
    details: 'import.type.topstep.details',
    logo: {
      path: '/logos/topstep.png',
      alt: 'Topstep Logo'
    },
    processFile: processStandardCsv
  },
  {
    type: 'ninjatrader-performance',
    name: 'import.type.ninjaTrader.name',
    description: 'import.type.ninjaTrader.description',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_NINJATRADER_PERFORMANCE_TUTORIAL_VIDEO || '',
    details: '',
    logo: {
      path: '/logos/ninjatrader.png',
      alt: 'NinjaTrader Logo'
    },
    isDisabled: true,
    processFile: processStandardCsv
  },
  {
    type: 'rithmic-performance',
    name: 'import.type.rithmicPerf.name',
    description: 'import.type.rithmicPerf.description',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_RITHMIC_PERFORMANCE_TUTORIAL_VIDEO || '',
    details: 'import.type.rithmicPerf.details',
    logo: {
      path: '/logos/rithmic.png',
      alt: 'Rithmic Logo'
    },
    isRithmic: true,
    skipHeaderSelection: true,
    processFile: processRithmicPerformance
  },
  {
    type: 'rithmic-orders',
    name: 'import.type.rithmicOrders.name',
    description: 'import.type.rithmicOrders.description',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_RITHMIC_ORDER_TUTORIAL_VIDEO || '',
    details: 'import.type.rithmicOrders.details',
    logo: {
      path: '/logos/rithmic.png',
      alt: 'Rithmic Logo'
    },
    isRithmic: true,
    skipHeaderSelection: true,
    processFile: processRithmicOrders
  }
] 