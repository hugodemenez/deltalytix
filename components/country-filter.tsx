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
import { useNewsFilterStore } from "@/store/news-filter"

interface CountryFilterProps {
  countries: string[]
  className?: string
}

export function CountryFilter({ countries, className }: CountryFilterProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const { 
    selectedCountries,
    toggleCountry,
    selectAllCountries,
  } = useNewsFilterStore()
  const t = useI18n()

  // Filter countries based on search term
  const filteredCountries = searchTerm
    ? countries.filter(country => 
        country.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : countries

  const isCountrySelected = (country: string) => selectedCountries.includes(country)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "flex items-center gap-2",
            selectedCountries.length > 0 && "bg-accent",
            className
          )}
        >
          <Globe className="h-4 w-4" />
          {selectedCountries.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedCountries.length}
            </Badge>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px]">
        <Command>
          <CommandInput 
            placeholder={t('mindset.newsImpact.searchCountry')} 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandGroup heading={t('mindset.newsImpact.filterByCountry')}>
              <CommandItem
                onSelect={() => selectAllCountries(countries)}
                className="flex items-center gap-2"
              >
                <Checkbox
                  checked={selectedCountries.length === countries.length}
                  className="h-4 w-4"
                />
                <span className="text-sm">{t('mindset.newsImpact.allCountries')}</span>
              </CommandItem>
              <ScrollArea className="h-[200px]">
                {filteredCountries.map(country => (
                  <CommandItem
                    key={country}
                    onSelect={() => toggleCountry(country)}
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