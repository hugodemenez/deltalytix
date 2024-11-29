import React, { useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from 'next/image'
import { RithmicSync } from './rithmic-sync'

export type ImportType = '' | 'rithmic-performance' | 'rithmic-orders' | 'tradezella' | 'tradovate' | 'ninjatrader-performance' | 'quantower' | 'rithmic-sync'

interface ImportTypeSelectionProps {
  selectedType: ImportType
  setSelectedType: React.Dispatch<React.SetStateAction<ImportType>>
}

const videoUrls: Record<ImportType, { url: string, details: string }> = {
  '': {
    url: '',
    details: ''
  },
  'rithmic-performance': {
    url:
      process.env.NEXT_PUBLIC_RITHMIC_PERFORMANCE_TUTORIAL_VIDEO || '',
    details: 'Remember to expand every row to see the full details during export.'
  },
  'rithmic-orders': {
    url: process.env.NEXT_PUBLIC_RITHMIC_ORDER_TUTORIAL_VIDEO || '',
    details: 'Following fields are mandatory: Account, Buy/Sell, Avg Fill Price, Limit Price, Symbol, Order Number, Update time, Qty filled, Closed profit & loss, Commission fill rate'
  },
  'tradezella': {
    url: '',
    details: ''
  },
  'tradovate': {
    url: '',
    details: ''
  },
  'ninjatrader-performance': {
    url: process.env.NEXT_PUBLIC_NINJATRADER_PERFORMANCE_TUTORIAL_VIDEO || '',
    details: ''
  },
  'quantower': {
    url: '',
    details: ''
  },
  'rithmic-sync': {
    url: process.env.NEXT_PUBLIC_RITHMIC_SYNC_TUTORIAL_VIDEO || '',
    details: 'Direct sync with your Rithmic account. Requires authentication.'
  }
}

const importTypes: ImportType[] = ['', 'rithmic-sync', 'rithmic-performance', 'rithmic-orders', 'tradezella', 'tradovate', 'ninjatrader-performance', 'quantower']

export default function ImportTypeSelection({ selectedType, setSelectedType }: ImportTypeSelectionProps) {
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
        if (type === selectedType && videoUrls[type]) {
          videoElement.play().catch(() => {
            // Autoplay was prevented, handle as needed
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

  return (
    <div className="p-2">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {importTypes.map((type) => (
              <Button
                key={type}
                onClick={() => setSelectedType(type)}
                variant="outline"
                className={cn(
                  "h-auto py-4 px-4 justify-start text-left",
                  "bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10",
                  selectedType === type && "ring-2 ring-primary"
                )}
              >
                <div className="w-full">
                  <div className="font-semibold text-sm sm:text-base truncate">
                    {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground truncate">
                    {type === '' ? 'CSV file with AI mapping' : 
                     type === 'rithmic-sync' ? 'Direct account sync' :
                     `Import from ${type}`}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {selectedType !== '' && (
            <>
              {selectedType === 'rithmic-sync' ? (
                <>
                  <h2 className="text-2xl font-bold">Rithmic Account Login</h2>
                  <RithmicSync 
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
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {importTypes.map((type) => (
                      videoUrls[type].url != '' && (
                        <video
                          key={type}
                          ref={setVideoRef(type)}
                          height="600"
                          width="600"
                          preload="metadata"
                          loop
                          muted
                          controls
                          playsInline
                          className={cn(
                            "rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg w-full h-full object-cover",
                            selectedType !== type && "hidden"
                          )}
                        >
                          <source src={videoUrls[type].url} type="video/mp4" />
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
                  {videoUrls[selectedType] ? (
                    <p className="text-sm text-muted-foreground">
                      Watch this tutorial video to learn how to import data from {selectedType.split('-').join(' ')}.
                      <br />
                      {videoUrls[selectedType].details}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Tutorial video for {selectedType.split('-').join(' ')} is not available.
                    </p>
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
          )}
        </div>
      </div>
    </div>
  )
}