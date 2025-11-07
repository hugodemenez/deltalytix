'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, Search, Sun, Moon, Monitor } from "lucide-react"
import { useDebounce } from '@/hooks/use-debounce'

// Define translations locally to avoid I18nProvider dependency
const translations = {
  en: {
    title: '404 - Page Not Found',
    heading: 'Oops! Page not found',
    description: 'The page you\'re looking for doesn\'t exist or has been moved.',
    goHome: 'Go back home',
    goBack: 'Go back',
    searchPlaceholder: 'Search for a page...',
    searchComingSoon: 'Search functionality coming soon'
  },
  fr: {
    title: '404 - Page introuvable',
    heading: 'Oups ! Page introuvable',
    description: 'La page que vous recherchez n\'existe pas ou a été déplacée.',
    goHome: 'Retour à l\'accueil',
    goBack: 'Retourner',
    searchPlaceholder: 'Rechercher une page...',
    searchComingSoon: 'Fonctionnalité de recherche bientôt disponible'
  }
}

function getLocaleFromGeolocation(): 'en' | 'fr' {
  if (typeof window === 'undefined') return 'fr' // Default for SSR

  // Get country from cookie set by middleware
  const cookies = document.cookie.split(';')
  const countryCookie = cookies.find(cookie => cookie.trim().startsWith('user-country='))
  const country = countryCookie?.split('=')[1]?.trim()

  // Use French for France and French-speaking countries, English for others
  const frenchCountries = ['FR', 'CA', 'BE', 'CH', 'LU', 'MC']
  return frenchCountries.includes(country || '') ? 'fr' : 'en'
}

function getThemeFromLocalStorage(): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') return 'system'

  try {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
    return savedTheme || 'system'
  } catch {
    return 'system'
  }
}

function getEffectiveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }
  return theme
}

function applyThemeToDocument(effectiveTheme: 'light' | 'dark', intensity: number) {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(effectiveTheme)
  root.style.setProperty('--theme-intensity', `${intensity}%`)
}

function detectLocaleFromBrowser(): 'en' | 'fr' {
  if (typeof window === 'undefined') return 'fr'

  // First try geolocation from middleware
  const geoLocale = getLocaleFromGeolocation()

  // If no country detected, fall back to browser language
  const cookies = document.cookie.split(';')
  const countryCookie = cookies.find(cookie => cookie.trim().startsWith('user-country='))

  if (!countryCookie) {
    const browserLang = navigator.language.toLowerCase()
    return browserLang.startsWith('en') ? 'en' : 'fr'
  }

  return geoLocale
}

function NotFoundContent() {
  const router = useRouter()
  const [locale, setLocale] = useState<'en' | 'fr'>('fr')
  const [isClient, setIsClient] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')
  const [allRoutes, setAllRoutes] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 150)
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const resultsRef = useRef<HTMLUListElement | null>(null)
  const blurTimeout = useRef<number | null>(null)

  useEffect(() => {
    setIsClient(true)
    const detectedLocale = detectLocaleFromBrowser()
    setLocale(detectedLocale)

    // Set page title
    document.title = 'Deltalytix | ' + translations[detectedLocale].title

    // Apply theme from localStorage
    const savedTheme = getThemeFromLocalStorage()
    const savedIntensity = parseInt(localStorage.getItem('intensity') || '100')
    const currentEffectiveTheme = getEffectiveTheme(savedTheme)
    setTheme(savedTheme)
    setEffectiveTheme(currentEffectiveTheme)
    applyThemeToDocument(currentEffectiveTheme, savedIntensity)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleThemeChange = () => {
      if (savedTheme === 'system') {
        const newEffectiveTheme = getEffectiveTheme('system')
        setEffectiveTheme(newEffectiveTheme)
        applyThemeToDocument(newEffectiveTheme, savedIntensity)
      }
    }

    mediaQuery.addEventListener('change', handleThemeChange)
    return () => mediaQuery.removeEventListener('change', handleThemeChange)
  }, [])

  // Fetch routes from public/routes.json (generated at build time)
  useEffect(() => {
    let cancelled = false
    async function loadRoutes() {
      try {
        setIsLoadingRoutes(true)
        const res = await fetch('/routes.json', { cache: 'no-cache' })
        if (!res.ok) return
        const json: string[] = await res.json()
        if (!cancelled) setAllRoutes(json)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoadingRoutes(false)
      }
    }
    loadRoutes()
    return () => {
      cancelled = true
    }
  }, [])

  // Utilities for routes
  const isDynamic = (route: string) => /\[[^\]]+\]/.test(route)
  const localizeRoute = (route: string, loc: 'en' | 'fr') =>
    route.replace('/[locale]', `/${loc}`)

  const concreteRoutesForLocale = useMemo(() => {
    // Replace [locale] and drop remaining dynamics (e.g., [slug], catch-alls)
    const replaced = allRoutes
      .map(r => localizeRoute(r, locale))
      .filter(r => !isDynamic(r))
      // Also filter out obvious 404-related routes if present
      .filter(r => !/not-found/.test(r))
    return Array.from(new Set(replaced)).sort()
  }, [allRoutes, locale])

  const filteredRoutes = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) {
      const suggestions = concreteRoutesForLocale
      if (selectedIndex >= suggestions.length) setSelectedIndex(0)
      return suggestions
    }
    // Lightweight fuzzy scoring: sequential character matching with bonuses
    const score = (target: string, queryStr: string): number => {
      if (target.startsWith(queryStr)) return 1000 + queryStr.length // big boost for prefix
      let tIdx = 0
      let qIdx = 0
      let contiguous = 0
      let total = 0
      const tLower = target.toLowerCase()
      while (tIdx < tLower.length && qIdx < queryStr.length) {
        if (tLower[tIdx] === queryStr[qIdx]) {
          // base match
          let add = 10
          // contiguous bonus
          if (tIdx === 0) add += 15
          if (tLower[tIdx - 1] === '/' || tLower[tIdx - 1] === '-') add += 8 // segment/word start
          contiguous += 1
          add += contiguous * 2
          total += add
          qIdx++
        } else {
          contiguous = 0
        }
        tIdx++
      }
      if (qIdx !== queryStr.length) return 0 // didn't match all chars in sequence
      // length penalty (shorter targets slightly preferred)
      total -= Math.max(0, tLower.length - queryStr.length) * 0.5
      return total
    }
    const scored = concreteRoutesForLocale.map(r => ({ r, s: score(r, q) }))
      .filter(o => o.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 50) // More results available, user can scroll
      .map(o => o.r)
    if (selectedIndex >= scored.length) setSelectedIndex(0)
    return scored
  }, [concreteRoutesForLocale, debouncedQuery, selectedIndex])

  const t = translations[locale]

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const handleThemeToggle = () => {
    const themeOrder: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
    const currentIndex = themeOrder.indexOf(theme)
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length]

    setTheme(nextTheme)
    const newEffectiveTheme = getEffectiveTheme(nextTheme)
    setEffectiveTheme(newEffectiveTheme)

    const intensity = parseInt(localStorage.getItem('intensity') || '100')
    applyThemeToDocument(newEffectiveTheme, intensity)
    localStorage.setItem('theme', nextTheme)
  }

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor className="w-4 h-4" />
    if (effectiveTheme === 'dark') return <Moon className="w-4 h-4" />
    return <Sun className="w-4 h-4" />
  }

  const displayLabel = (route: string) => {
    const stripped = route.replace(new RegExp(`^/${locale}`), '') || '/'
    return stripped === '' ? '/' : stripped
  }

  const handleSelectRoute = (route: string) => {
    setShowResults(false)
    setQuery('')
    router.push(route)
  }

  const onKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredRoutes.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % filteredRoutes.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + filteredRoutes.length) % filteredRoutes.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const route = filteredRoutes[selectedIndex] || filteredRoutes[0]
      if (route) handleSelectRoute(route)
    } else if (e.key === 'Escape') {
      setShowResults(false)
    }
  }

  const onBlurSearch = () => {
    // Delay to allow click on results without instantly closing
    if (blurTimeout.current) window.clearTimeout(blurTimeout.current)
    blurTimeout.current = window.setTimeout(() => setShowResults(false), 100)
  }

  // Show fallback during hydration with French as default (respects system theme)
  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 relative">
        {/* Placeholder for theme toggle */}
        <div className="absolute top-4 right-4 w-10 h-8" />

        <Logo className="w-16 h-16 mb-8 fill-primary" />
        <h1 className="text-6xl font-bold mb-4 text-foreground">404</h1>
        <h2 className="text-2xl font-semibold text-muted-foreground mb-6 text-center">
          Page introuvable
        </h2>
        <p className="text-muted-foreground mb-8 text-center max-w-md leading-relaxed">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Button asChild variant="default" className="flex-1">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Retour à l&apos;accueil
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 relative">
      {/* Theme toggle button in top right */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleThemeToggle}
        className="absolute top-4 right-4 flex items-center gap-2"
        title={`Current theme: ${theme}`}
      >
        {getThemeIcon()}
      </Button>

      <Logo className="w-16 h-16 mb-8 fill-primary" />

      {/* Large 404 */}
      <h1 className="text-6xl font-bold mb-4 text-foreground">404</h1>

      {/* Heading */}
      <h2 className="text-2xl font-semibold text-muted-foreground mb-6 text-center">
        {t.heading}
      </h2>

      {/* Description */}
      <p className="text-muted-foreground mb-8 text-center max-w-md leading-relaxed">
        {t.description}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Button asChild variant="default" className="flex-1">
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            {t.goHome}
          </Link>
        </Button>

        <Button
          variant="outline"
          onClick={handleGoBack}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.goBack}
        </Button>
      </div>

      {/* Search box */}
      <div className="mt-8 w-full max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            aria-label={t.searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowResults(true)
            }}
            onKeyDown={onKeyDownSearch}
            onBlur={onBlurSearch}
            onFocus={() => setShowResults(true)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent transition-[box-shadow,opacity] duration-200 ease-out"
            autoComplete="off"
          />
          {(() => {
            const shouldShow = showResults && (query.length > 0 || isLoadingRoutes || filteredRoutes.length > 0)
            return (
              <ul
                ref={resultsRef}
                role="listbox"
                aria-hidden={!shouldShow}
                style={{ maxHeight: '200px' }} // ~5 items visible (40px each)
                className={`absolute z-10 mt-2 w-full overflow-y-auto overflow-x-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md origin-top will-change-[opacity,transform] transition duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none ${shouldShow ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
              >
                {isLoadingRoutes && (
                  <li className="px-3 py-2 text-sm text-muted-foreground">Loading…</li>
                )}
                {!isLoadingRoutes && filteredRoutes.length === 0 && query.length > 0 && (
                  <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
                )}
                {!isLoadingRoutes && filteredRoutes.map((r, idx) => (
                  <Link
                    onClick={
                      () => {
                        setShowResults(false)
                        setQuery('Redirecting...')
                      }
                    }
                    key={r}
                    href={r}
                  >
                    <li

                      key={r}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors duration-200 ease-out ${idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                      role="option"
                      aria-selected={idx === selectedIndex}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      title={r}
                    >
                      {displayLabel(r)}
                    </li>
                  </Link>
                ))}
              </ul>
            )
          })()}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {concreteRoutesForLocale.length > 0
            ? `${concreteRoutesForLocale.length} pages available`
            : t.searchComingSoon}
        </p>
      </div>
    </div>
  )
}

export default function NotFound() {
  return <NotFoundContent />
}
