"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { useI18n } from "@/locales/client"
import { Globe, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

interface CountryFilterProps {
  countries: string[]
  value: string[]
  onValueChange: (countries: string[]) => void
  className?: string
  appearance?: "default" | "navbar"
}

export function CountryFilter({ countries, value, onValueChange, className, appearance = "default" }: CountryFilterProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const t = useI18n()

  // Filter countries based on search term
  const filteredCountries = searchTerm
    ? countries.filter(country => 
        country.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : countries

  const isCountrySelected = (country: string) => value.includes(country)

  const handleCountryToggle = (country: string) => {
    onValueChange(
      isCountrySelected(country)
        ? value.filter(c => c !== country)
        : [...value, country]
    )
  }

  const handleSelectAll = () => {
    onValueChange(value.length === countries.length ? [] : countries)
  }

  const countryLabel = t('mindset.newsImpact.filterByCountry')
  const isNavbar = appearance === "navbar"

  return (
    <DropdownMenu modal={isNavbar ? false : undefined}>
      <DropdownMenuTrigger asChild>
        {isNavbar ? (
          <button
            type="button"
            aria-label={countryLabel}
            className={cn(
              "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-[4px]",
              "border border-[#E5E5E5] bg-white px-2",
              "text-[13px] font-medium text-[#171717]",
              "transition-colors hover:bg-[#FAFAFA]",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "data-[state=open]:bg-[#FAFAFA]",
              "dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted/40 dark:data-[state=open]:bg-muted/40",
              value.length > 0 && "bg-[#FAFAFA] dark:bg-muted/40",
              className,
            )}
          >
            <Globe className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            {value.length > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] leading-none">
                {value.length}
              </Badge>
            )}
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex items-center gap-2",
              value.length > 0 && "bg-accent",
              className
            )}
            aria-label={countryLabel}
          >
            <Globe className="h-4 w-4" />
            {value.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {value.length}
              </Badge>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={isNavbar ? 6 : 4}
        className={cn(
          "w-[300px]",
          isNavbar && "rounded-[4px] border-[#E5E5E5] bg-white shadow-md dark:border-border dark:bg-background",
        )}
      >
        <Command>
          <CommandInput 
            placeholder={t('mindset.newsImpact.searchCountry')} 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandGroup heading={t('mindset.newsImpact.filterByCountry')}>
              <CommandItem
                onSelect={handleSelectAll}
                className="flex items-center gap-2"
              >
                <Checkbox
                  checked={value.length === countries.length}
                  className="h-4 w-4"
                />
                <span className="text-sm">{t('mindset.newsImpact.allCountries')}</span>
              </CommandItem>
              <ScrollArea className="h-[200px]">
                {filteredCountries.map(country => (
                  <CommandItem
                    key={country}
                    onSelect={() => handleCountryToggle(country)}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={isCountrySelected(country)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{country}</span>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 