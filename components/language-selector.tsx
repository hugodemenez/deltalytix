'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useChangeLocale, useCurrentLocale } from '@/locales/client'

export function LanguageSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const changeLocale = useChangeLocale()
  const currentLocale = useCurrentLocale()

  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale !== currentLocale) {
      await changeLocale(newLocale)
      
      // Force a full page reload to the current path with the new locale
      window.location.href = `/${newLocale}${pathname}`
    }
  }

  // Rest of your component code...
}