'use client'

import React, { createContext, useContext, useEffect, useState, startTransition } from 'react'

type Theme = 'light' | 'dark' | 'system'

type ThemeContextType = {
  theme: Theme
  effectiveTheme: 'light' | 'dark'
  intensity: number
  setTheme: (theme: Theme) => void
  setIntensity: (intensity: number) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  effectiveTheme: 'light',
  intensity: 100,
  setTheme: () => {},
  setIntensity: () => {},
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')
  const [intensity, setIntensityState] = useState<number>(100)

  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    let newEffectiveTheme: 'light' | 'dark' = 'light'
    if (newTheme === 'system') {
      newEffectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      newEffectiveTheme = newTheme
    }

    root.classList.add(newEffectiveTheme)
    setEffectiveTheme(newEffectiveTheme)
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const savedIntensity = localStorage.getItem('intensity')

    startTransition(() => {
      if (savedTheme) {
        setThemeState(savedTheme)
      }
      if (savedIntensity) {
        setIntensityState(Number(savedIntensity))
      }
    })
    applyTheme(savedTheme || 'system')
  }, [])

  useEffect(() => {
    startTransition(() => {
      applyTheme(theme)
    })
    localStorage.setItem('theme', theme)
    localStorage.setItem('intensity', intensity.toString())

    // Set CSS variables for theme intensity
    const root = window.document.documentElement
    root.style.setProperty('--theme-intensity', `${intensity}%`)
  }, [theme, intensity])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const setIntensity = (newIntensity: number) => {
    setIntensityState(newIntensity)
  }

  const toggleTheme = () => {
    setThemeState(prevTheme => {
      if (prevTheme === 'system') {
        return effectiveTheme === 'light' ? 'dark' : 'light'
      }
      return prevTheme === 'light' ? 'dark' : 'light'
    })
  }

  const value = {
    theme,
    effectiveTheme,
    intensity,
    setTheme,
    setIntensity,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
