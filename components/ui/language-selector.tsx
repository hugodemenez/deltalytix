'use client'

import * as React from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useChangeLocale, useCurrentLocale } from '@/locales/client'
import { useI18n } from "@/locales/client"

interface Language {
  value: string
  label: string
}

interface LanguageSelectorProps {
  className?: string
  triggerClassName?: string
  languages: Language[]
  onRequestNewLanguage?: () => void
}

export function LanguageSelector({ 
  className,
  triggerClassName,
  languages,
  onRequestNewLanguage 
}: LanguageSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const currentLocale = useCurrentLocale()
  const changeLocale = useChangeLocale()
  const t = useI18n()

  const handleLanguageChange = (locale: string) => {
    changeLocale(locale as "en" | "fr")
    // Force a full page reload to ensure middleware picks up the new locale
    window.location.reload()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={triggerClassName}
        >
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('navbar.changeLanguage')}</span>
          <span className="ml-2">{currentLocale.toUpperCase()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`w-[200px] p-0 ${className}`}>
        <Command>
          <CommandInput placeholder={t('dashboard.searchLanguage')} />
          <CommandList>
            <CommandEmpty>{t('dashboard.noLanguageFound')}</CommandEmpty>
            <CommandGroup>
              {languages.map((language) => (
                <CommandItem
                  key={language.value}
                  onSelect={() => handleLanguageChange(language.value)}
                  className="cursor-pointer"
                >
                  {language.label}
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