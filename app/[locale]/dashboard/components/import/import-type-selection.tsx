'use client'

import React, { useEffect, useState } from 'react'
import { Link2, FileSpreadsheet, Database, Pencil } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useI18n } from "@/locales/client"
import { platforms, PlatformConfig, PlatformType } from './config/platforms'
import { PlatformItem } from './components/platform-item'
import { PlatformTutorial } from './components/platform-tutorial'
import { cn } from '@/lib/utils'
import { useImportTypePreferenceStore } from '@/store/import-type-preference-store'

export type ImportType = PlatformType

interface ImportTypeSelectionProps {
  selectedType: ImportType
  setSelectedType: React.Dispatch<React.SetStateAction<ImportType>>
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}



const categoryIcons: Record<PlatformConfig['category'], React.ReactNode> = {
  'Direct Account Sync': <Link2 className="h-4 w-4" />,
  'Intelligent Import': <FileSpreadsheet className="h-4 w-4" />,
  'Platform CSV Import': <Database className="h-4 w-4" />,
  'Manual Entry': <Pencil className="h-4 w-4" />
}

// Function to check if it's weekend
function isWeekend() {
  const day = new Date().getDay()
  return day === 0 || day === 6 // 0 is Sunday, 6 is Saturday
}

export default function ImportTypeSelection({ selectedType, setSelectedType, setIsOpen }: ImportTypeSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredCategory, setHoveredCategory] = useState<PlatformConfig['category'] | null>(null)
  const t = useI18n()
  const { lastSelectedType, setLastSelectedType } = useImportTypePreferenceStore()
  
  // Set default selection from store preference
  useEffect(() => {
    setSelectedType(lastSelectedType)
  }, [setSelectedType, lastSelectedType])

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

  return (
    <div className="flex flex-col h-full">
      <div className="grid md:grid-cols-2 gap-6 h-full min-h-0 p-2">
        <div className="h-full min-h-0">
          <Command className="border rounded-lg h-full">
            <div className="flex flex-col h-full">
              <CommandInput 
                className="h-auto rounded-none shrink-0"
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
                            onSelect={(type) => {
                              setSelectedType(type as ImportType)
                              setLastSelectedType(type as ImportType)
                            }}
                            onHover={(category) => setHoveredCategory(category as PlatformConfig['category'])}
                            onLeave={() => setHoveredCategory(null)}
                            isWeekend={isWeekend()}
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

        <div className="h-full min-h-0 overflow-y-auto">
          {/* <ScrollArea className="h-full"> */}
            {selectedType !== '' && selectedPlatform && (
              selectedPlatform.customComponent ? (
                <div className="h-full pr-4">
                  {selectedPlatform.customComponent && <selectedPlatform.customComponent setIsOpen={setIsOpen} />}
                </div>
              ) : (
                <div className="pr-4">
                  <PlatformTutorial selectedPlatform={selectedPlatform} setIsOpen={setIsOpen} />
                </div>
              )
            )}
          {/* </ScrollArea> */}
        </div>
      </div>
    </div>
  )
}