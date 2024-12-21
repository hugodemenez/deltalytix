import React, { useRef, useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from 'next/image'
import { RithmicSync } from './rithmic-sync'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Clock, Search, Star, Link2, FileSpreadsheet, Database, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useUser } from '@/components/context/user-data'
import Link from 'next/link'
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

// Easy toggle between COMING_SOON and PLUS_ONLY
const RITHMIC_SYNC_STATE: 'COMING_SOON' | 'PLUS_ONLY' = 'COMING_SOON'

export type ImportType = '' | 'rithmic-performance' | 'rithmic-orders' | 'tradezella' | 'tradovate' | 'ninjatrader-performance' | 'quantower' | 'rithmic-sync'

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
    name: 'Rithmic Sync',
    description: 'Direct account sync',
    category: 'Direct Account Sync',
    videoUrl: process.env.NEXT_PUBLIC_RITHMIC_SYNC_TUTORIAL_VIDEO || '',
    details: 'Direct sync with your Rithmic account. Requires authentication.'
  },
  {
    type: '',
    name: 'CSV with AI',
    description: 'CSV file with AI mapping',
    category: 'Custom CSV Import',
    videoUrl: '',
    details: ''
  },
  {
    type: 'rithmic-performance',
    name: 'Rithmic Performance',
    description: 'Import from Rithmic',
    category: 'Platform CSV Import',
    videoUrl: (() => {
      return process.env.NEXT_PUBLIC_RITHMIC_PERFORMANCE_TUTORIAL_VIDEO || ''
    })(),
    details: 'Remember to expand every row to see the full details during export.'
  },
  {
    type: 'rithmic-orders',
    name: 'Rithmic Orders',
    description: 'Import from Rithmic',
    category: 'Platform CSV Import',
    videoUrl: (() => {
      return process.env.NEXT_PUBLIC_RITHMIC_ORDER_TUTORIAL_VIDEO || ''
    })(),
    details: 'Following fields are mandatory: Account, Buy/Sell, Avg Fill Price, Limit Price, Symbol, Order Number, Update time, Qty filled, Closed profit & loss, Commission fill rate'
  },
  {
    type: 'ninjatrader-performance',
    name: 'NinjaTrader Performance',
    description: 'Import from NinjaTrader',
    category: 'Platform CSV Import',
    videoUrl: process.env.NEXT_PUBLIC_NINJATRADER_PERFORMANCE_TUTORIAL_VIDEO || '',
    details: ''
  },
  {
    type: 'tradezella',
    name: 'TradeZella',
    description: 'Import from TradeZella',
    category: 'Platform CSV Import',
    videoUrl: '',
    details: ''
  },
  {
    type: 'tradovate',
    name: 'Tradovate',
    description: 'Import from Tradovate',
    category: 'Platform CSV Import',
    videoUrl: '',
    details: ''
  },
  {
    type: 'quantower',
    name: 'Quantower',
    description: 'Import from Quantower',
    category: 'Platform CSV Import',
    videoUrl: '',
    details: ''
  }
]

const categoryIcons: Record<Category, React.ReactNode> = {
  'Direct Account Sync': <Link2 className="h-4 w-4" />,
  'Custom CSV Import': <FileSpreadsheet className="h-4 w-4" />,
  'Platform CSV Import': <Database className="h-4 w-4" />
}

export default function ImportTypeSelection({ selectedType, setSelectedType, setIsOpen }: ImportTypeSelectionProps) {
  const { isPlusUser } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredCategory, setHoveredCategory] = useState<Category | null>(null)
  
  // Set default selection to CSV with AI
  useEffect(() => {
    if (selectedType === '') {
      setSelectedType('')  // Empty string represents CSV with AI type
    }
  }, [])
  
  const videoRefs = useRef<Record<ImportType, HTMLVideoElement | null>>({
    '': null,
    'rithmic-performance': null,
    'rithmic-orders': null,
    'tradezella': null,
    'tradovate': null,
    'ninjatrader-performance': null,
    'quantower': null,
    'rithmic-sync': null,
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

  const filteredImportTypes = importTypeInfo.filter(info => 
    info.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    info.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    info.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const categories = Array.from(new Set(filteredImportTypes.map(info => info.category)))

  return (
    <div className="flex flex-col h-full px-4">
      <div className="grid md:grid-cols-2 gap-6  h-full">
        <div className="h-full">
          <Command className="border h-full shadow-sm">
            <CommandInput 
            className='h-fit rounded-none'
              placeholder="Search import types..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="min-h-[calc(100%-42px)]">
              <CommandEmpty>No import types found.</CommandEmpty>
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
                      <span>{category}</span>
                    </div>
                  }>
                    {categoryTypes.map((info) => {
                      const isRithmicSync = info.type === 'rithmic-sync'
                      const isDisabled = isRithmicSync && (RITHMIC_SYNC_STATE === 'COMING_SOON' || (RITHMIC_SYNC_STATE === 'PLUS_ONLY' && !isPlusUser()))

                      return (
                        <div className={cn(
                          isDisabled && "cursor-not-allowed"
                        )} key={info.type}>
                          <CommandItem
                            key={info.type}
                            onSelect={() => !isDisabled && setSelectedType(info.type)}
                            onMouseEnter={() => setHoveredCategory(info.category)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            className={cn(
                              "flex items-center gap-2 ml-6 border-l-2 border-muted pl-4 transition-all duration-200 rounded-none",
                              isDisabled && "opacity-50 select-none",
                              !isDisabled && "cursor-pointer",
                              selectedType === info.type && "border-l-primary bg-primary/5",
                              !isDisabled && "hover:border-l-primary/50"
                            )}
                            disabled={isDisabled}
                          >
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {info.name}
                                {isDisabled && (
                                  <>
                                    <Badge variant="secondary" className="ml-2 transition-transform duration-200 hover:scale-105">
                                      {RITHMIC_SYNC_STATE === 'COMING_SOON' ? 'SOON' : 'PLUS'}
                                    </Badge>
                                    {RITHMIC_SYNC_STATE === 'COMING_SOON' ? 
                                      <Clock className="h-4 w-4 animate-pulse" /> : 
                                      <Lock className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                                    }
                                  </>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{info.description}</div>
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
          {selectedType === 'rithmic-sync' && (RITHMIC_SYNC_STATE === 'COMING_SOON' || (RITHMIC_SYNC_STATE === 'PLUS_ONLY' && !isPlusUser())) ? (
            <Alert>
              <AlertDescription>
                {RITHMIC_SYNC_STATE === 'COMING_SOON' 
                  ? "This feature is coming soon!"
                  : "Rithmic sync is a Plus feature. Please upgrade your account to use this feature."
                }
              </AlertDescription>
            </Alert>
          ) : (
            selectedType !== '' && (
              <>
                {selectedType === 'rithmic-sync' ? (
                  <>
                    <h2 className="text-2xl font-bold">Rithmic Account Login</h2>
                    <RithmicSyncCombined 
                      setIsOpen={setIsOpen}
                      onSync={async (data) => {
                        // Implement sync logic here
                        console.log('Syncing with Rithmic:', data)
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
                      <p>The R | API+™ software is Copyright © 2024 by Rithmic, LLC. All rights reserved.</p>
                      <p>The R | Protocol API™ software is Copyright © 2024 by Rithmic, LLC. All rights reserved.</p>
                      <p>Trading Platform by Rithmic™ is a trademark of Rithmic, LLC. All rights reserved.</p>
                      <p>The OMNE™ software is Copyright © 2024 by Omnesys, LLC and Omnesys Technologies, Inc. All rights reserved.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold">Tutorial Video</h2>
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
                    {importTypeInfo.find(info => info.type === selectedType)?.videoUrl ? (
                      <p className="text-sm text-muted-foreground" key={selectedType}>
                        Watch this tutorial video to learn how to import data from {selectedType.split('-').join(' ')}.
                        <br />
                        {importTypeInfo.find(info => info.type === selectedType)?.details}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground" key={selectedType}>
                        Tutorial video for {selectedType.split('-').join(' ')} is not available.
                      </p>
                    )}
                    </div>
                    {selectedType && (
                      <div className="text-sm text-muted-foreground flex items-start gap-2 bg-muted/50 p-4 rounded-lg transition-all duration-300 hover:bg-muted/70 animate-in slide-in-from-bottom-4" key="details">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-500 animate-pulse" />
                        <p>
                          {importTypeInfo.find(info => info.type === selectedType)?.details || 'No additional details available.'}
                        </p>
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
                        <p>Trading Platform by Rithmic™ is a trademark of Rithmic, LLC. All rights reserved.</p>
                        <p>The OMNE™ software is Copyright © 2024 by Omnesys, LLC and Omnesys Technologies, Inc. All rights reserved.</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}