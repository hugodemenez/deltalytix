import React, { useRef, useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from 'next/image'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Clock, Search, Star, Link2, FileSpreadsheet, Database, AlertCircle, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useUserData } from '@/components/context/user-data'
import { RithmicSyncCombined } from './rithmic-sync-new'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useI18n } from "@/locales/client"

// Add function to check if it's weekend
function isWeekend() {
  const day = new Date().getDay()
  return day === 0 || day === 6 // 0 is Sunday, 6 is Saturday
}

export type ImportType = '' | 'rithmic-performance' | 'rithmic-orders' | 'tradezella' | 'tradovate' | 'ninjatrader-performance' | 'quantower' | 'rithmic-sync' | 'topstep'

interface ImportTypeSelectionProps {
  selectedType: ImportType
  setSelectedType: React.Dispatch<React.SetStateAction<ImportType>>
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

type Category = 'Direct Account Sync' | 'Custom CSV Import' | 'Platform CSV Import'

interface ImportTypeInfo {
  type: ImportType
  name: string
  description: string
  category: Category
  videoUrl: string
  details: string
}

const importTypeInfo: ImportTypeInfo[] = [
  {
    type: 'rithmic-sync',
    name: 'import.type.rithmicSync.name',
    description: 'import.type.rithmicSync.description',
    category: 'Direct Account Sync',
    videoUrl: process.env.NEXT_PUBLIC_RITHMIC_SYNC_TUTORIAL_VIDEO || '',
    details: 'import.type.rithmicSync.details'
  },
  {
    type: '',
    name: 'import.type.csvAi.name',
    description: 'import.type.csvAi.description',
    category: 'Custom CSV Import',
    videoUrl: '',
    details: ''
  },
  // {
  //   type: 'rithmic-performance',
  //   name: 'import.type.rithmicPerf.name',
  //   description: 'import.type.rithmicPerf.description',
  //   category: 'Platform CSV Import',
  //   videoUrl: (() => {
  //     return process.env.NEXT_PUBLIC_RITHMIC_PERFORMANCE_TUTORIAL_VIDEO || ''
  //   })(),
  //   details: 'import.type.rithmicPerf.details'
  // },
  // {
  //   type: 'rithmic-orders',
  //   name: 'import.type.rithmicOrders.name',
  //   description: 'import.type.rithmicOrders.description',
  //   category: 'Platform CSV Import',
  //   videoUrl: (() => {
  //     return process.env.NEXT_PUBLIC_RITHMIC_ORDER_TUTORIAL_VIDEO || ''
  //   })(),
  //   details: 'import.type.rithmicOrders.details'
  // },
  // {
  //   type: 'ninjatrader-performance',
  //   name: 'import.type.ninjaTrader.name',
  //   description: 'import.type.ninjaTrader.description',
  //   category: 'Platform CSV Import',
  //   videoUrl: process.env.NEXT_PUBLIC_NINJATRADER_PERFORMANCE_TUTORIAL_VIDEO || '',
  //   details: ''
  // },
  {
    type: 'tradezella',
    name: 'import.type.tradezella.name',
    description: 'import.type.tradezella.description',
    category: 'Platform CSV Import',
    videoUrl: '',
    details: ''
  },
  {
    type: 'tradovate',
    name: 'import.type.tradovate.name',
    description: 'import.type.tradovate.description',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_TRADEOVATE_TUTORIAL_VIDEO || '',
    details: ''
  },
  {
    type: 'quantower',
    name: 'import.type.quantower.name',
    description: 'import.type.quantower.description',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_QUANTOWER_TUTORIAL_VIDEO || '',
    details: ''
  },
  {
    type: 'topstep',
    name: 'import.type.topstep.name',
    description: 'import.type.topstep.description',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_TOPSTEP_TUTORIAL_VIDEO || '',
    details: 'import.type.topstep.details'
  }
]

const categoryIcons: Record<Category, React.ReactNode> = {
  'Direct Account Sync': <Link2 className="h-4 w-4" />,
  'Custom CSV Import': <FileSpreadsheet className="h-4 w-4" />,
  'Platform CSV Import': <Database className="h-4 w-4" />
}

export default function ImportTypeSelection({ selectedType, setSelectedType, setIsOpen }: ImportTypeSelectionProps) {
  const { isPlusUser } = useUserData()
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredCategory, setHoveredCategory] = useState<Category | null>(null)
  const t = useI18n()
  
  // Set default selection to CSV with AI
  useEffect(() => {
    if (selectedType === '') {
      setSelectedType('')  // Empty string represents CSV with AI type
    }
  }, [selectedType, setSelectedType])
  
  const videoRefs = useRef<Record<ImportType, HTMLVideoElement | null>>({
    '': null,
    'rithmic-performance': null,
    'rithmic-orders': null,
    'tradezella': null,
    'tradovate': null,
    'ninjatrader-performance': null,
    'quantower': null,
    'rithmic-sync': null,
    'topstep': null,
  })

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([type, videoElement]) => {
      if (videoElement) {
        if (type === selectedType && importTypeInfo.find(info => info.type === type)?.videoUrl) {
          videoElement.play().catch((error) => {
            console.error('Video playback error:', error)
          })
        } else {
          videoElement.pause()
        }
      }
    })
  }, [selectedType])

  const setVideoRef = (type: ImportType) => (el: HTMLVideoElement | null) => {
    videoRefs.current[type] = el
  }
  
  const getTranslatedCategory = (category: Category) => {
    switch (category) {
      case 'Direct Account Sync':
        return t('import.type.category.directSync')
      case 'Custom CSV Import':
        return t('import.type.category.customCsv')
      case 'Platform CSV Import':
        return t('import.type.category.platformCsv')
      default:
        return category
    }
  }

  const filteredImportTypes = importTypeInfo.filter(info => 
    t(info.name as any, {}).toLowerCase().includes(searchQuery.toLowerCase()) ||
    t(info.description as any, {}).toLowerCase().includes(searchQuery.toLowerCase()) ||
    getTranslatedCategory(info.category).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const categories = Array.from(new Set(filteredImportTypes.map(info => info.category)))

  return (
    <div className="flex flex-col h-full px-4">
      <div className="grid md:grid-cols-2 gap-6 h-full">
        <div className="h-full">
          <Command className="border h-full shadow-sm">
            <CommandInput 
              className='h-fit rounded-none'
              placeholder={t('import.type.search')}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="min-h-[calc(100%-42px)]">
              <CommandEmpty>{t('import.type.noResults')}</CommandEmpty>
              {categories.map(category => {
                const categoryTypes = filteredImportTypes.filter(info => info.category === category)
                if (categoryTypes.length === 0) return null

                return (
                  <CommandGroup key={category} heading={
                    <div className={cn(
                      "flex items-center gap-2 text-muted-foreground transition-all duration-200 px-2",
                      hoveredCategory === category ? "text-foreground scale-[1.02] translate-x-1" : "hover:text-foreground"
                    )}>
                      {categoryIcons[category]}
                      <span>{getTranslatedCategory(category)}</span>
                    </div>
                  }>
                    {categoryTypes.map((info) => {
                      const isRithmicSync = info.type === 'rithmic-sync'
                      const isDisabled = info.type === 'ninjatrader-performance'

                      return (
                        <div className={cn(
                          isDisabled && "cursor-not-allowed"
                        )} key={info.type}>
                          <CommandItem
                            key={info.type}
                            onSelect={() => !isDisabled && info.type !== 'ninjatrader-performance' && setSelectedType(info.type)}
                            onMouseEnter={() => setHoveredCategory(info.category)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            className={cn(
                              "flex items-stretch gap-4 ml-6 border-l-2 border-muted pl-4 transition-all duration-200 rounded-none",
                              (isDisabled || info.type === 'ninjatrader-performance') && "opacity-50 select-none",
                              !isDisabled && info.type !== 'ninjatrader-performance' && "cursor-pointer",
                              selectedType === info.type && "border-l-primary bg-primary/5",
                              !isDisabled && info.type !== 'ninjatrader-performance' && "hover:border-l-primary/50"
                            )}
                            disabled={isDisabled || info.type === 'ninjatrader-performance'}
                          >
                            <div className="flex items-center py-1">
                              {info.type && ['rithmic-performance', 'rithmic-orders', 'rithmic-sync'].includes(info.type) && (
                                <Image
                                  src="/logos/rithmic.png"
                                  alt="Rithmic Logo"
                                  width={32}
                                  height={32}
                                  className="object-contain rounded-lg border border-border/50"
                                />
                              )}
                              {info.type === 'tradezella' && (
                                <Image
                                  src="/logos/tradezella.png"
                                  alt="Tradezella Logo"
                                  width={32}
                                  height={32}
                                  className="object-contain rounded-lg border border-border/50"
                                />
                              )}
                              {info.type === 'tradovate' && (
                                <Image
                                  src="/logos/tradovate.png"
                                  alt="Tradovate Logo"
                                  width={32}
                                  height={32}
                                  className="object-contain rounded-lg border border-border/50"
                                />
                              )}
                              {info.type === 'ninjatrader-performance' && (
                                <Image
                                  src="/logos/ninjatrader.png"
                                  alt="NinjaTrader Logo"
                                  width={32}
                                  height={32}
                                  className="object-contain rounded-lg border border-border/50"
                                />
                              )}
                              {info.type === 'quantower' && (
                                <Image
                                  src="/logos/quantower.png"
                                  alt="Quantower Logo"
                                  width={32}
                                  height={32}
                                  className="object-contain rounded-lg border border-border/50"
                                />
                              )}
                              {info.type === 'topstep' && (
                                <Image
                                  src="/logos/topstep.png"
                                  alt="Topstep Logo"
                                  width={32}
                                  height={32}
                                  className="object-contain rounded-lg border border-border/50"
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {t(info.name as any, {})}
                                {isDisabled && (
                                  <>
                                    <Badge variant="secondary" className="ml-2 transition-transform duration-200 hover:scale-105">
                                      {t('import.type.badge.maintenance')}
                                    </Badge>
                                    <AlertTriangle className="h-4 w-4 text-yellow-500 animate-pulse" />
                                  </>
                                )}
                                {!isDisabled && info.type.includes('rithmic') && isWeekend() && (
                                  <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20 gap-1.5 ml-2">
                                    <AlertTriangle className="h-3 w-3" />
                                    {t('import.type.rithmicWeekendWarning')}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{t(info.description as any, {})}</div>
                            </div>
                          </CommandItem>
                        </div>
                      )
                    })}
                  </CommandGroup>
                )
              })}
            </CommandList>
          </Command>
        </div>

        <div className="space-y-4 overflow-y-auto px-2">
          {selectedType !== '' && (
            <>
              {selectedType === 'rithmic-sync' ? (
                <>
                  <h2 className="text-2xl font-bold">{t('import.type.rithmicLogin')}</h2>
                  <RithmicSyncCombined 
                    setIsOpen={setIsOpen}
                    onSync={async (data) => {
                    }} 
                  />
                  <div className="mt-6 text-xs text-muted-foreground space-y-2 border-t pt-4">
                    <div className="flex items-center gap-4 mb-2">
                      <Image 
                        src="/RithmicArtwork/TradingPlatformByRithmic-Black.png"
                        alt="Trading Platform by Rithmic"
                        width={120}
                        height={40}
                        className="dark:hidden"
                      />
                      <Image 
                        src="/RithmicArtwork/TradingPlatformByRithmic-Green.png"
                        alt="Trading Platform by Rithmic"
                        width={120}
                        height={40}
                        className="hidden dark:block"
                      />
                      <Image 
                        src="/RithmicArtwork/Powered_by_Omne.png"
                        alt="Powered by OMNE"
                        width={120}
                        height={40}
                      />
                    </div>
                    <p>{t('import.type.copyright.rithmic')}</p>
                    <p>{t('import.type.copyright.protocol')}</p>
                    <p>{t('import.type.copyright.platform')}</p>
                    <p>{t('import.type.copyright.omne')}</p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold">{t('import.type.tutorial.title')}</h2>
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 transition-transform duration-300 hover:scale-[1.02]">
                    <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {importTypeInfo.map((info) => (
                        info.videoUrl != '' && (
                          <video
                            key={info.type}
                            ref={setVideoRef(info.type)}
                            height="600"
                            width="600"
                            preload="metadata"
                            loop
                            muted
                            controls
                            playsInline
                            className={cn(
                              "rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg w-full h-full object-cover",
                              selectedType !== info.type && "hidden"
                            )}
                          >
                            <source src={info.videoUrl} type="video/mp4" />
                            <track
                              src="/path/to/captions.vtt"
                              kind="subtitles"
                              srcLang="en"
                              label="English"
                            />
                            Your browser does not support the video tag.
                          </video>
                        )
                      ))}
                    </div>
                    {selectedType && importTypeInfo.find(info => info.type === selectedType)?.videoUrl ? (
                      <p className="text-sm text-muted-foreground" key={selectedType}>
                        {t('import.type.tutorial.description', { platform: selectedType.split('-').join(' ') })}
                        <br />
                        {selectedType && importTypeInfo.find(info => info.type === selectedType)?.details && 
                          t((importTypeInfo.find(info => info.type === selectedType)?.details || '') as any, {})}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground" key={selectedType}>
                        {t('import.type.tutorial.notAvailable', { platform: selectedType.split('-').join(' ') })}
                      </p>
                    )}
                  </div>
                  
                  {selectedType && importTypeInfo.find(info => info.type === selectedType)?.details && (
                    <div className="text-sm text-muted-foreground flex items-start gap-2 bg-muted/50 p-4 rounded-lg transition-all duration-300 hover:bg-muted/70 animate-in slide-in-from-bottom-4" key="details">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-500 animate-pulse" />
                      <p>{t((importTypeInfo.find(info => info.type === selectedType)?.details || '') as any, {})}</p>
                    </div>
                  )}
                  
                  {(selectedType === 'rithmic-performance' || selectedType === 'rithmic-orders') && (
                    <div className="mt-6 text-xs text-muted-foreground space-y-2 border-t pt-4">
                      <div className="flex items-center gap-4 mb-2">
                        <Image 
                          src="/RithmicArtwork/TradingPlatformByRithmic-Black.png"
                          alt="Trading Platform by Rithmic"
                          width={120}
                          height={40}
                          className="dark:hidden"
                        />
                        <Image 
                          src="/RithmicArtwork/TradingPlatformByRithmic-Green.png"
                          alt="Trading Platform by Rithmic"
                          width={120}
                          height={40}
                          className="hidden dark:block"
                        />
                        <Image 
                          src="/RithmicArtwork/Powered_by_Omne.png"
                          alt="Powered by OMNE"
                          width={120}
                          height={40}
                        />
                      </div>
                      <p>{t('import.type.copyright.platform')}</p>
                      <p>{t('import.type.copyright.omne')}</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}