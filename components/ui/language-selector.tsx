'use client'

import * as React from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useChangeLocale, useCurrentLocale } from '@/locales/client'
import { useI18n } from "@/locales/client"
import { cn } from "@/lib/utils"

interface Language {
  value: string
  label: string
}

interface LanguageSelectorProps {
  className?: string
  triggerClassName?: string
  languages?: Language[]
  onRequestNewLanguage?: () => void
  showLabel?: boolean
  align?: 'start' | 'end'
}

const defaultLanguages: Language[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

export function LanguageSelector({ 
  className,
  triggerClassName,
  languages = defaultLanguages,
  onRequestNewLanguage,
  showLabel = false,
  align = 'end'
}: LanguageSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const currentLocale = useCurrentLocale()
  const changeLocale = useChangeLocale()
  const t = useI18n()

  const handleLanguageChange = (locale: string) => {
    changeLocale(locale as "en" | "fr")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "inline-flex h-9 w-9 px-0",
            showLabel && "w-auto px-2",
            triggerClassName
          )}
        >
          <Globe className="h-5 w-5" />
          {showLabel && (
            <>
              <span className="sr-only">{t('landing.navbar.changeLanguage')}</span>
              <span className="ml-2">{t('landing.navbar.changeLanguage')}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`w-[200px] p-0 ${className}`} align={align}>
        <Command>
          <CommandList>
            <CommandGroup>
              {languages.map((language) => (
                <CommandItem
                  key={language.value}
                  onSelect={() => handleLanguageChange(language.value)}
                  className="flex items-center cursor-pointer"
                >
                  <span className="mr-2">{language.value === 'en' ? '🇬🇧' : '🇫🇷'}</span>
                  <span>{language.label}</span>
                </CommandItem>
              ))}
              {onRequestNewLanguage && (
                <CommandItem onSelect={onRequestNewLanguage}>
                  {t('dashboard.requestNewLanguage')}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 