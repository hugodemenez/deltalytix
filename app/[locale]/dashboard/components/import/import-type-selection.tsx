'use client'

import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Link2, FileSpreadsheet, Database, Pencil } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { translateWithParams } from '@/lib/translation-utils'
import { platforms, PlatformConfig, PlatformType } from './config/platforms'
import { PlatformItem } from './components/platform-item'
import { PlatformTutorial } from './components/platform-tutorial'
import { cn } from '@/lib/utils'
import { useImportTypePreferenceStore } from '@/store/import-type-preference-store'
import { useMediaQuery } from '@/hooks/use-media-query'

export type ImportType = PlatformType

interface ImportTypeSelectionProps {
  selectedType: ImportType
  setSelectedType: React.Dispatch<React.SetStateAction<ImportType>>
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

type MobileView = 'list' | 'details'

const categoryIcons: Record<PlatformConfig['category'], React.ReactNode> = {
  'Direct Account Sync': <Link2 className="h-4 w-4" />,
  'Intelligent Import': <FileSpreadsheet className="h-4 w-4" />,
  'Platform CSV Import': <Database className="h-4 w-4" />,
  'Manual Entry': <Pencil className="h-4 w-4" />
}

function isWeekend() {
  const day = new Date().getDay()
  return day === 0 || day === 6
}

function MobileStepIndicator({
  step,
  total,
  label,
}: {
  step: number
  total: number
  label: string
}) {
  const t = useI18n()

  return (
    <div className="shrink-0 pb-3 border-b">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {translateWithParams(t, 'import.type.mobile.step', { current: step, total })}
      </p>
      <p className="mt-1 text-base font-semibold">{label}</p>
    </div>
  )
}

export default function ImportTypeSelection({ selectedType, setSelectedType, setIsOpen }: ImportTypeSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredCategory, setHoveredCategory] = useState<PlatformConfig['category'] | null>(null)
  const [mobileView, setMobileView] = useState<MobileView>('list')
  const [hasEnteredDetails, setHasEnteredDetails] = useState(false)
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const t = useI18n()
  const { lastSelectedType, setLastSelectedType } = useImportTypePreferenceStore()

  useEffect(() => {
    setSelectedType(lastSelectedType)
  }, [setSelectedType, lastSelectedType])

  useEffect(() => {
    let isMounted = true
    const syncMobileView = (view: 'list' | 'details') => {
      queueMicrotask(() => {
        if (isMounted) {
          setMobileView(view)
        }
      })
    }

    if (!selectedType) {
      syncMobileView('list')
      queueMicrotask(() => {
        if (isMounted) {
          setHasEnteredDetails(false)
        }
      })
      return () => {
        isMounted = false
      }
    }

    if (isMobile && hasEnteredDetails) {
      syncMobileView('details')
    }

    return () => {
      isMounted = false
    }
  }, [selectedType, isMobile, hasEnteredDetails])

  const getTranslatedCategory = (category: PlatformConfig['category']) => {
    switch (category) {
      case 'Direct Account Sync':
        return t('import.type.category.directSync')
      case 'Intelligent Import':
        return t('import.type.category.intelligentImport')
      case 'Platform CSV Import':
        return t('import.type.category.platformCsv')
      case 'Manual Entry':
        return t('import.type.category.manualEntry')
      default:
        return category
    }
  }

  const filteredPlatforms = platforms.filter(platform =>
    t(platform.name as keyof typeof t).toLowerCase().includes(searchQuery.toLowerCase()) ||
    t(platform.description as keyof typeof t).toLowerCase().includes(searchQuery.toLowerCase()) ||
    getTranslatedCategory(platform.category).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const categories = Array.from(new Set(filteredPlatforms.map(platform => platform.category)))
  const selectedPlatform = platforms.find(p => p.type === selectedType)

  const handlePlatformSelect = (type: ImportType) => {
    setSelectedType(type)
    setLastSelectedType(type)

    if (isMobile) {
      setMobileView('details')
      setHasEnteredDetails(true)
    }
  }

  const getMobileDetailsLabel = (platform: PlatformConfig) => {
    if (platform.customComponent) {
      return t('import.type.mobile.connectAccount')
    }

    if (platform.videoUrl) {
      return t('import.type.tutorial.title')
    }

    return t('import.type.mobile.learnHow')
  }

  const renderPlatformList = (fullHeight = false) => (
    <div className={cn(
      "min-h-0 min-w-0 shrink-0",
      fullHeight ? "flex-1" : "h-[min(42vh,22rem)] lg:h-full"
    )}>
      <Command className="border rounded-lg h-full">
        <div className="flex flex-col h-full">
          <CommandInput
            autoFocus={false}
            className="h-auto rounded-none shrink-0 text-base sm:text-sm"
            placeholder={t('import.type.search')}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <ScrollArea className="h-[calc(100%-45px)]">
            <CommandList className="h-full" defaultChecked={false} defaultValue={lastSelectedType}>
              <CommandEmpty>{t('import.type.noResults')}</CommandEmpty>
              {categories.map(category => {
                const categoryPlatforms = filteredPlatforms.filter(platform => platform.category === category)
                if (categoryPlatforms.length === 0) return null

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
                    {categoryPlatforms.map((platform) => (
                      <PlatformItem
                        key={platform.type}
                        platform={platform}
                        isSelected={selectedType === platform.type}
                        onSelect={(type) => handlePlatformSelect(type as ImportType)}
                        onHover={(category) => setHoveredCategory(category as PlatformConfig['category'])}
                        onLeave={() => setHoveredCategory(null)}
                        isWeekend={isWeekend()}
                        showNavigateHint={isMobile}
                      />
                    ))}
                  </CommandGroup>
                )
              })}
            </CommandList>
          </ScrollArea>
        </div>
      </Command>
    </div>
  )

  const renderPlatformDetails = () => {
    if (!selectedPlatform) return null

    return (
      <div className="flex flex-col h-full min-h-0 min-w-0">
        <div className="shrink-0 space-y-3 pb-3 border-b">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 -ml-2"
            onClick={() => setMobileView('list')}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t('import.type.mobile.backToPlatforms')}</span>
          </Button>
          <MobileStepIndicator
            step={2}
            total={2}
            label={getMobileDetailsLabel(selectedPlatform)}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-4">
          {selectedPlatform.customComponent ? (
            <div className="h-full min-w-0 w-full">
              <selectedPlatform.customComponent setIsOpen={setIsOpen} />
            </div>
          ) : (
            <div className="min-w-0 w-full">
              <PlatformTutorial selectedPlatform={selectedPlatform} setIsOpen={setIsOpen} />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {mobileView === 'list' ? (
          <div className="flex flex-col h-full min-h-0 gap-3">
            <MobileStepIndicator
              step={1}
              total={2}
              label={t('import.type.mobile.choosePlatform')}
            />
            {renderPlatformList(true)}
          </div>
        ) : (
          renderPlatformDetails()
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] gap-4 lg:gap-6 h-full min-h-0 p-2 min-w-0">
        {renderPlatformList()}

        <div className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
          {selectedType !== '' && selectedPlatform && (
            selectedPlatform.customComponent ? (
              <div className="h-full min-w-0 w-full">
                <selectedPlatform.customComponent setIsOpen={setIsOpen} />
              </div>
            ) : (
              <div className="min-w-0 w-full pr-0 lg:pr-1">
                <PlatformTutorial selectedPlatform={selectedPlatform} setIsOpen={setIsOpen} />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
