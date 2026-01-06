'use client'
import { Trade } from '@/prisma/generated/prisma/browser'
import { ThorSync } from '../thor/thor-sync'
import { TradovateSync } from '../tradovate/tradovate-sync'
import { ImportType } from '../import-type-selection'
import { RithmicSyncWrapper } from '../rithmic/sync/rithmic-sync-connection'
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
import PdfUpload from '../ibkr-pdf/pdf-upload'
import PdfProcessing from '../ibkr-pdf/pdf-processing'
import AtasFileUpload from '../atas/atas-file-upload'
import AtasProcessor from '../atas/atas-processor'
import FtmoProcessor from '../ftmo/ftmo-processor'
import ManualProcessor from '../manual/manual-processor'
import { Step } from '../import-button'
import { Sparkles, PenTool } from 'lucide-react'
import { useTheme } from '@/context/theme-provider'
import Image from 'next/image'

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
  | 'import.steps.processFile'
  | 'import.steps.processFileDescription'
  | 'import.steps.manualEntry'
  | 'import.steps.manualEntryDescription'

export interface ProcessedData {
  headers: string[]
  processedData: string[][]
}

// FTMO Logo Component with light/dark mode support
const FtmoLogo = () => {
  const { effectiveTheme } = useTheme()

  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 3950 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8 object-contain"
    >
      <path
        d="M1309.81 780.68H1417.27V532.224H1676.62V438.809H1417.27V312.848H1724.34V218.528H1309.81V780.68Z"
        fill={effectiveTheme === 'dark' ? 'white' : 'black'}
      />
      <path
        d="M1806.29 312.823H2000.2V780.655H2107.66V312.823H2301.57V218.503H1806.29V312.823Z"
        fill={effectiveTheme === 'dark' ? 'white' : 'black'}
      />
      <path
        d="M2726.88 500.407L2528.93 220.311L2527.57 218.503H2434.97V780.655H2542.43V408.046L2585.96 475.848L2722.53 671.418L2726.13 676.541L2864.81 476.601C2883.87 449.481 2899.18 426.428 2910.43 408.046V780.504H3017.89V218.503H2925.29L2726.88 500.407Z"
        fill={effectiveTheme === 'dark' ? 'white' : 'black'}
      />
      <path
        d="M3674.28 294.152C3618.3 238.404 3547.62 210.078 3464.17 210.078C3380.58 210.078 3309.89 238.404 3253.91 294.152C3198.08 350.051 3169.71 419.058 3169.71 499.667C3169.71 580.728 3198.08 650.187 3253.91 706.086C3309.74 761.834 3380.58 790.16 3464.17 790.16C3547.77 790.16 3618.45 761.834 3674.28 706.086C3730.11 650.337 3758.48 580.878 3758.48 499.667C3758.48 419.058 3730.11 349.9 3674.28 294.152ZM3594.44 635.27C3559.77 672.637 3516.25 691.47 3465.07 691.47C3413.29 691.47 3369.32 672.486 3334.35 635.27C3299.38 597.904 3281.52 552.251 3281.52 499.516C3281.52 446.932 3299.23 401.43 3334.35 364.214C3369.32 327.149 3413.29 308.315 3465.07 308.315C3516.25 308.315 3559.77 327.149 3594.59 364.063C3629.41 401.128 3646.97 446.631 3646.97 499.366C3646.82 552.251 3629.11 597.904 3594.44 635.27Z"
        fill={effectiveTheme === 'dark' ? 'white' : 'black'}
      />
      <path
        d="M117.066 617.598L497.981 235.197V0L0 500.075L117.066 617.598Z"
        fill={effectiveTheme === 'dark' ? 'white' : 'black'}
      />
      <path
        d="M498.028 999.987V674.388L335.936 837.263L498.028 999.987Z"
        fill={effectiveTheme === 'dark' ? 'white' : 'black'}
      />
      <path
        d="M497.943 334.323L166.405 667.154L286.323 787.54L497.943 575.095V334.323Z"
        fill={effectiveTheme === 'dark' ? 'white' : 'black'}
      />
      <path
        d="M560.322 0V235.197L824.021 499.925L560.322 764.803V1000L1058.3 499.925L560.322 0Z"
        fill={effectiveTheme === 'dark' ? 'white' : 'black'}
      />
      <path
        d="M3852.75 18.1377C3798.27 18.1377 3754.89 60.6268 3754.89 113.512C3754.89 167.603 3798.27 209.941 3852.75 209.941C3907.68 209.941 3950 167.452 3950 113.512C3950 60.4761 3907.83 18.1377 3852.75 18.1377ZM3853.35 189.601C3810.57 189.601 3779.2 155.851 3779.2 113.512C3779.2 71.6257 3810.42 37.4235 3852.75 37.4235C3895.07 37.4235 3925.69 71.7764 3925.69 114.115C3925.69 155.851 3895.07 189.601 3853.35 189.601Z"
        fill={effectiveTheme === 'dark' ? 'white' : 'black'}
      />
      <path
        d="M3874.77 116.241V115.035C3886.32 111.57 3894.43 103.434 3894.43 92.8867C3894.43 83.5452 3890.38 76.0116 3885.12 71.9435C3878.22 67.8754 3870.11 65.0127 3852.1 65.0127C3836.49 65.0127 3824.34 66.2181 3815.63 67.8754V163.25H3837.7V124.829H3848.05C3860.21 124.829 3866.06 129.5 3867.71 139.896C3870.56 150.895 3872.37 159.634 3875.22 163.099H3898.93C3896.68 159.634 3894.88 153.758 3892.03 139.293C3889.17 126.637 3884.07 119.706 3874.77 116.241ZM3848.65 109.159H3838.3V81.8878C3840.55 81.2851 3844.75 80.6824 3850.45 80.6824C3864.41 80.6824 3870.71 86.5586 3870.71 95.1468C3870.71 105.091 3860.81 109.159 3848.65 109.159Z"
        fill={effectiveTheme === 'dark' ? 'white' : 'black'}
      />
    </svg>
  )
}

// ATAS Logo Component with proper aspect ratio handling
const AtasLogo = () => {
  return (
    <Image
      src="/logos/atas.png"
      alt="ATAS Logo"
      width={32}
      height={32}
      className="h-8 w-8 object-contain"
      style={{
        width: 'auto',
        height: '32px',
        maxWidth: '32px'
      }}
    />
  )
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
  | typeof ThorSync
  | typeof TradovateSync
  | typeof PdfUpload
  | typeof PdfProcessing
  | typeof AtasFileUpload
  | typeof AtasProcessor
  | typeof FtmoProcessor
  | typeof ManualProcessor


export interface PlatformProcessorProps {
  csvData: string[][]
  headers: string[]
  processedTrades: Partial<Trade>[]
  setProcessedTrades: React.Dispatch<React.SetStateAction<Partial<Trade>[]>>
  accountNumbers?: string[]
  selectedAccountNumbers?: string[]
  setSelectedAccountNumbers?: React.Dispatch<React.SetStateAction<string[]>>
}

export interface PlatformConfig {
  platformName: string
  type: string
  name: string
  description: string
  category: 'Direct Account Sync' | 'Intelligent Import' | 'Platform CSV Import' | 'Manual Entry'
  videoUrl?: string
  details: string
  logo: {
    path?: string
    alt?: string
    component?: ComponentType<{}>
  }
  isDisabled?: boolean
  isComingSoon?: boolean
  isRithmic?: boolean
  skipHeaderSelection?: boolean
  requiresAccountSelection?: boolean
  processFile?: (data: string[][]) => ProcessedData
  customComponent?: ComponentType<{ setIsOpen: React.Dispatch<React.SetStateAction<boolean>> }>
  processorComponent?: ComponentType<PlatformProcessorProps>
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
    category: 'Intelligent Import',
    videoUrl: '',
    details: '',
    logo: {
      component: () => <Sparkles className="w-4 h-4" />,
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
    tutorialLink: 'https://intercom.help/tradezella-4066d388d93c/en/articles/9725069-how-to-export-data-to-a-csv-file-from-the-trade-log-page',
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
      // {
      //   id: 'select-headers',
      //   title: 'import.steps.selectHeaders',
      //   description: 'import.steps.selectHeadersDescription',
      //   component: HeaderSelection
      // },
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
  },
  {
    platformName: 'tradovate-sync',
    type: 'tradovate-sync',
    name: 'import.type.tradovateSync.name',
    description: 'import.type.tradovateSync.description',
    category: 'Direct Account Sync',
    // isComingSoon: true,
    videoUrl: process.env.NEXT_PUBLIC_TRADOVATE_SYNC_TUTORIAL_VIDEO || '',
    details: 'import.type.tradovateSync.details',
    logo: {
      path: '/logos/tradovate.png',
      alt: 'Tradovate Logo'
    },
    customComponent: TradovateSync,
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
        component: TradovateSync,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'ibkr-pdf-import',
    type: 'ibkr-pdf-import',
    name: 'import.type.pdfImport.name',
    description: 'import.type.pdfImport.description',
    category: 'Intelligent Import',
    videoUrl: process.env.NEXT_PUBLIC_PDF_IMPORT_TUTORIAL_VIDEO || '',
    details: 'import.type.pdfImport.details',
    logo: {
      path: '/logos/ibkr.png',
      alt: 'IBKR Logo'
    },
    requiresAccountSelection: true,
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
        component: PdfUpload
      },
      {
        id: 'process-file',
        title: 'import.steps.processFile',
        description: 'import.steps.processFileDescription',
        component: PdfProcessing
      },
      {
        id: 'select-account',
        title: 'import.steps.selectAccount',
        description: 'import.steps.selectAccountDescription',
        component: AccountSelection
      },
    ]
  },
  {
    platformName: 'atas',
    type: 'atas',
    name: 'import.type.atas.name',
    description: 'import.type.atas.description',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_ATAS_TUTORIAL_VIDEO || '',
    details: 'import.type.atas.details',
    logo: {
      component: AtasLogo,
      alt: 'ATAS Logo'
    },
    processorComponent: AtasProcessor,
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
        component: AtasFileUpload
      },
      {
        id: 'preview-trades',
        title: 'import.steps.processTrades',
        description: 'import.steps.processTradesDescription',
        component: AtasProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'ftmo',
    type: 'ftmo',
    name: 'import.type.ftmo.name',
    description: 'import.type.ftmo.description',
    category: 'Platform CSV Import',
    videoUrl: '',
    details: 'import.type.ftmo.details',
    logo: {
      component: FtmoLogo,
      alt: 'FTMO Logo'
    },
    requiresAccountSelection: true,
    skipHeaderSelection: true,
    processFile: processStandardCsv,
    processorComponent: FtmoProcessor,
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
        component: FtmoProcessor,
        isLastStep: true
      }
    ]
  },
  {
    platformName: 'manual-entry',
    type: 'manual-entry',
    name: 'import.type.manualEntry.name',
    description: 'import.type.manualEntry.description',
    category: 'Manual Entry',
    videoUrl: '',
    details: 'import.type.manualEntry.details',
    logo: {
      component: () => <PenTool className="w-4 h-4" />,
    },
    requiresAccountSelection: true,
    processorComponent: ManualProcessor,
    steps: [
      {
        id: 'select-import-type',
        title: 'import.steps.selectPlatform',
        description: 'import.steps.selectPlatformDescription',
        component: ImportTypeSelection
      },
      {
        id: 'select-account',
        title: 'import.steps.selectAccount',
        description: 'import.steps.selectAccountDescription',
        component: AccountSelection
      },
      {
        id: 'preview-trades',
        title: 'import.steps.manualEntry',
        description: 'import.steps.manualEntryDescription',
        component: ManualProcessor,
        isLastStep: true
      }
    ]
  }
] as const

export type PlatformType = typeof platforms[number]['platformName'] 