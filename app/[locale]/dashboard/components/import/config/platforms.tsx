import { Trade } from '@prisma/client'
import { EtpSync } from '../etp/etp-sync'
import { ThorSync } from '../thor/thor-sync'
import { ImportType } from '../import-type-selection'
import { RithmicSyncWrapper } from '../rithmic/sync/rithmic-sync-new'
import type { ComponentType } from 'react'
import ImportTypeSelection from '../import-type-selection'
import FileUpload from '../file-upload'
import HeaderSelection from '../header-selection'
import AccountSelection from '../account-selection'
import ColumnMapping from '../column-mapping'
import { FormatPreview } from '../components/format-preview'
import TradezellaProcessor from '../tradezella/tradezella-processor'
import TradovateProcessor from '../tradovate/tradovate-processor'
import QuantowerOrderProcessor from '../quantower/quantower-processor'
import TopstepProcessor from '../topstep/topstep-processor'
import NinjaTraderPerformanceProcessor from '../ninjatrader/ninjatrader-performance-processor'
import RithmicPerformanceProcessor from '../rithmic/rithmic-performance-processor'
import RithmicOrderProcessor from '../rithmic/rithmic-order-processor-new'
import { Step } from '../import-button'

type TranslationKey = 
  | 'import.steps.selectPlatform'
  | 'import.steps.selectPlatformDescription'
  | 'import.steps.uploadFile'
  | 'import.steps.uploadFileDescription'
  | 'import.steps.selectHeaders'
  | 'import.steps.selectHeadersDescription'
  | 'import.steps.mapColumns'
  | 'import.steps.mapColumnsDescription'
  | 'import.steps.selectAccount'
  | 'import.steps.selectAccountDescription'
  | 'import.steps.reviewTrades'
  | 'import.steps.reviewTradesDescription'
  | 'import.steps.processTrades'
  | 'import.steps.processTradesDescription'
  | 'import.steps.connectAccount'
  | 'import.steps.connectAccountDescription'

export interface ProcessedData {
  headers: string[]
  processedData: string[][]
}

type StepComponent = 
  | typeof ImportTypeSelection
  | typeof FileUpload
  | typeof HeaderSelection
  | typeof AccountSelection
  | typeof ColumnMapping
  | typeof FormatPreview
  | typeof TradezellaProcessor
  | typeof TradovateProcessor
  | typeof QuantowerOrderProcessor
  | typeof TopstepProcessor
  | typeof NinjaTraderPerformanceProcessor
  | typeof RithmicPerformanceProcessor
  | typeof RithmicOrderProcessor
  | typeof RithmicSyncWrapper
  | typeof EtpSync
  | typeof ThorSync

export interface PlatformConfig {
  platformName: string
  type: string
  name: string
  description: string
  category: 'Direct Account Sync' | 'Custom CSV Import' | 'Platform CSV Import'
  videoUrl?: string
  details: string
  logo: {
    path: string
    alt: string
  }
  isDisabled?: boolean
  isComingSoon?: boolean
  isRithmic?: boolean
  skipHeaderSelection?: boolean
  requiresAccountSelection?: boolean
  processFile?: (data: string[][]) => ProcessedData
  customComponent?: ComponentType<{ setIsOpen: React.Dispatch<React.SetStateAction<boolean>> }>
  processorComponent?: ComponentType<{
    csvData: string[][]
    headers: string[]
    setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>
    accountNumber: string
  }>
  tutorialLink?: string
  steps: {
    id: Step
    title: TranslationKey
    description: TranslationKey
    component: StepComponent
    isLastStep?: boolean
  }[]
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
    platformName: 'rithmic-sync',
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
    customComponent: RithmicSyncWrapper,
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'complete',
        title: 'import.steps.connectAccount',
        description: 'import.steps.connectAccountDescription',
        component: RithmicSyncWrapper,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'csv-ai',
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
    processFile: processStandardCsv,
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'import.steps.uploadFile',
        description: 'import.steps.uploadFileDescription',
        component: FileUpload
      },
      {
        id: 'select-headers',
        title: 'import.steps.selectHeaders',
        description: 'import.steps.selectHeadersDescription',
        component: HeaderSelection
      },
      {
        id: 'map-columns',
        title: 'import.steps.mapColumns',
        description: 'import.steps.mapColumnsDescription',
        component: ColumnMapping
      },
      {
        id: 'select-account',
        title: 'import.steps.selectAccount',
        description: 'import.steps.selectAccountDescription',
        component: AccountSelection
      },
      {
        id: 'preview-trades',
        title: 'import.steps.reviewTrades',
        description: 'import.steps.reviewTradesDescription',
        component: FormatPreview,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'tradezella',
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
    processFile: processStandardCsv,
    processorComponent: TradezellaProcessor,
    tutorialLink:'https://intercom.help/tradezella-4066d388d93c/en/articles/9725069-how-to-export-data-to-a-csv-file-from-the-trade-log-page',
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'import.steps.uploadFile',
        description: 'import.steps.uploadFileDescription',
        component: FileUpload
      },
      {
        id: 'select-headers',
        title: 'import.steps.selectHeaders',
        description: 'import.steps.selectHeadersDescription',
        component: HeaderSelection
      },
      {
        id: 'preview-trades',
        title: 'import.steps.processTrades',
        description: 'import.steps.processTradesDescription',
        component: TradezellaProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'tradovate',
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
    processFile: processStandardCsv,
    processorComponent: TradovateProcessor,
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'import.steps.uploadFile',
        description: 'import.steps.uploadFileDescription',
        component: FileUpload
      },
      {
        id: 'select-account',
        title: 'import.steps.selectAccount',
        description: 'import.steps.selectAccountDescription',
        component: AccountSelection
      },
      {
        id: 'preview-trades',
        title: 'import.steps.processTrades',
        description: 'import.steps.processTradesDescription',
        component: TradovateProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'quantower',
    type: 'quantower',
    name: 'import.type.quantower.name',
    description: 'import.type.quantower.description',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_QUANTOWER_TUTORIAL_VIDEO || '',
    details: 'import.type.quantower.details',
    logo: {
      path: '/logos/quantower.png',
      alt: 'Quantower Logo'
    },
    skipHeaderSelection: true,
    processFile: processQuantower,
    processorComponent: QuantowerOrderProcessor,
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'import.steps.uploadFile',
        description: 'import.steps.uploadFileDescription',
        component: FileUpload
      },
      {
        id: 'preview-trades',
        title: 'import.steps.processTrades',
        description: 'import.steps.processTradesDescription',
        component: QuantowerOrderProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'topstep',
    type: 'topstep',
    name: 'import.type.topstep.name',
    description: 'import.type.topstep.description',
    category: 'Platform CSV Import',
    details: 'import.type.topstep.details',
    logo: {
      path: '/logos/topstep.png',
      alt: 'Topstep Logo'
    },
    requiresAccountSelection: true,
    processFile: processStandardCsv,
    processorComponent: TopstepProcessor,
    tutorialLink: 'https://help.topstep.com/en/articles/9424086-exporting-trades-on-topstepx',
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'import.steps.uploadFile',
        description: 'import.steps.uploadFileDescription',
        component: FileUpload
      },
      {
        id: 'select-headers',
        title: 'import.steps.selectHeaders',
        description: 'import.steps.selectHeadersDescription',
        component: HeaderSelection
      },
      {
        id: 'select-account',
        title: 'import.steps.selectAccount',
        description: 'import.steps.selectAccountDescription',
        component: AccountSelection
      },
      {
        id: 'preview-trades',
        title: 'import.steps.processTrades',
        description: 'import.steps.processTradesDescription',
        component: TopstepProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'ninjatrader-performance',
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
    processFile: processStandardCsv,
    processorComponent: NinjaTraderPerformanceProcessor,
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'import.steps.uploadFile',
        description: 'import.steps.uploadFileDescription',
        component: FileUpload
      },
      {
        id: 'select-headers',
        title: 'import.steps.selectHeaders',
        description: 'import.steps.selectHeadersDescription',
        component: HeaderSelection
      },
      {
        id: 'preview-trades',
        title: 'import.steps.processTrades',
        description: 'import.steps.processTradesDescription',
        component: NinjaTraderPerformanceProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'rithmic-performance',
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
    processFile: processRithmicPerformance,
    processorComponent: RithmicPerformanceProcessor,
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'import.steps.uploadFile',
        description: 'import.steps.uploadFileDescription',
        component: FileUpload
      },
      {
        id: 'preview-trades',
        title: 'import.steps.processTrades',
        description: 'import.steps.processTradesDescription',
        component: RithmicPerformanceProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'rithmic-orders',
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
    processFile: processRithmicOrders,
    processorComponent: RithmicOrderProcessor,
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'upload-file',
        title: 'import.steps.uploadFile',
        description: 'import.steps.uploadFileDescription',
        component: FileUpload
      },
      {
        id: 'preview-trades',
        title: 'import.steps.processTrades',
        description: 'import.steps.processTradesDescription',
        component: RithmicOrderProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'etp-sync',
    type: 'etp-sync',
    name: 'import.type.etpSync.name',
    description: 'import.type.etpSync.description',
    category: 'Direct Account Sync',
    videoUrl: process.env.NEXT_PUBLIC_ETP_SYNC_TUTORIAL_VIDEO || '',
    details: 'import.type.etpSync.details',
    logo: {
      path: '/logos/etp.png',
      alt: 'ETP Logo'
    },
    // isComingSoon: true,
    customComponent: EtpSync,
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'complete',
        title: 'import.steps.connectAccount',
        description: 'import.steps.connectAccountDescription',
        component: EtpSync,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'thor-sync',
    type: 'thor-sync',
    name: 'import.type.thorSync.name',
    description: 'import.type.thorSync.description',
    category: 'Direct Account Sync',
    videoUrl: process.env.NEXT_PUBLIC_THOR_SYNC_TUTORIAL_VIDEO || '',
    details: 'import.type.thorSync.details',
    logo: {
      path: '/logos/thor.png',
      alt: 'Thor Logo'
    },
    customComponent: ThorSync,
    isComingSoon: true,
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'complete',
        title: 'import.steps.connectAccount',
        description: 'import.steps.connectAccountDescription',
        component: ThorSync,
        isLastStep: true
      }
    ]
  }
] as const

export type PlatformType = typeof platforms[number]['platformName'] 