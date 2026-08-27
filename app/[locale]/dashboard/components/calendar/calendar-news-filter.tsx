"use client"

import { useState } from "react"
import { Newspaper } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ImportanceFilter } from "@/app/[locale]/dashboard/components/importance-filter"

type ImpactLevel = "low" | "medium" | "high"

/** Same chrome as navbar view / filter / account controls. */
const navbarTriggerClassName = cn(
  "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-[4px]",
  "border border-[#E5E5E5] bg-white",
  "text-[13px] font-medium text-[#171717]",
  "transition-colors hover:bg-[#FAFAFA]",
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "data-[state=open]:bg-[#FAFAFA]",
  "dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted/40 dark:data-[state=open]:bg-muted/40",
)

export function CalendarNewsFilter({
  impactLevels,
  onImpactLevelsChange,
  countries,
  selectedCountries,
  onSelectedCountriesChange,
  className,
}: {
  impactLevels: ImpactLevel[]
  onImpactLevelsChange: (levels: ImpactLevel[]) => void
  countries: string[]
  selectedCountries: string[]
  onSelectedCountriesChange: (countries: string[]) => void
  className?: string
}) {
  const t = useI18n()
  const [searchTerm, setSearchTerm] = useState("")
  const label = t("calendar.importanceFilter.label")
  const accessibleName = t("calendar.newsFilter.ariaLabel")

  const filteredCountries = searchTerm
    ? countries.filter((country) =>
        country.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : countries

  const isCountrySelected = (country: string) => selectedCountries.includes(country)

  const handleCountryToggle = (country: string) => {
    onSelectedCountriesChange(
      isCountrySelected(country)
        ? selectedCountries.filter((item) => item !== country)
        : [...selectedCountries, country],
    )
  }

  const handleSelectAll = () => {
    onSelectedCountriesChange(
      selectedCountries.length === countries.length ? [] : countries,
    )
  }

  return (
    <DropdownMenu
      modal={false}
      onOpenChange={(open) => {
        if (!open) setSearchTerm("")
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-slot="calendar-news-filter"
          className={cn(
            navbarTriggerClassName,
            selectedCountries.length > 0 ? "w-auto px-1.5 sm:px-2" : "w-7 px-0 sm:w-auto sm:px-2",
            selectedCountries.length > 0 && "bg-[#FAFAFA] dark:bg-muted/40",
            className,
          )}
          aria-label={accessibleName}
        >
          <Newspaper
            className="h-3.5 w-3.5"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">{label}</span>
          {selectedCountries.length > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] leading-none">
              {selectedCountries.length}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-[min(20rem,calc(100vw-1.5rem))] rounded-[4px] border-[#E5E5E5] bg-white p-0 shadow-md dark:border-border dark:bg-background"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Command shouldFilter={false} className="rounded-none bg-transparent">
            <CommandInput
              placeholder={t("mindset.newsImpact.searchCountry")}
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandGroup heading={t("mindset.newsImpact.filterByCountry")}>
                <CommandItem
                  onSelect={handleSelectAll}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    checked={countries.length > 0 && selectedCountries.length === countries.length}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{t("mindset.newsImpact.allCountries")}</span>
                </CommandItem>
                <ScrollArea className="h-[200px]">
                  {filteredCountries.map((country) => (
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
          <div className="flex justify-end border-t border-[#E5E5E5] px-1 dark:border-border">
            <ImportanceFilter
              value={impactLevels}
              onValueChange={onImpactLevelsChange}
              className="p-1"
            />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
