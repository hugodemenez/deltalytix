'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Sun, Moon, Laptop } from "lucide-react"
import { useTheme } from '@/context/theme-provider'
import { useI18n } from "@/locales/client"
import { ThemeToggleIcon } from '@/components/theme-toggle-icon'

export function ThemeSwitcher() {
  const { theme, setTheme, intensity, setIntensity } = useTheme()
  const t = useI18n()

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system")
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ThemeToggleIcon />
          <span className="sr-only">{t('landing.navbar.toggleTheme')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="end">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem onSelect={() => handleThemeChange("light")}>
                <Sun className="mr-2 h-4 w-4" />
                <span>{t('landing.navbar.lightMode')}</span>
              </CommandItem>
              <CommandItem onSelect={() => handleThemeChange("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                <span>{t('landing.navbar.darkMode')}</span>
              </CommandItem>
              <CommandItem onSelect={() => handleThemeChange("system")}>
                <Laptop className="mr-2 h-4 w-4" />
                <span>{t('landing.navbar.systemTheme')}</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
          <Separator />
          <div className="p-4">
            <div className="mb-2 text-sm font-medium">{t('dashboard.theme.intensity')}</div>
            <Slider
              value={[intensity]}
              onValueChange={([value]) => setIntensity(value)}
              min={90}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="mt-2 text-sm text-muted-foreground">
              {intensity}%
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 