// middleware.ts
import { createI18nMiddleware } from 'next-international/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
// Maintenance mode flag - Set to true to enable maintenance mode
const MAINTENANCE_MODE = false

const I18nMiddleware = createI18nMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
  urlMappingStrategy: 'rewrite'
})

export async function middleware(request: NextRequest) {
  const isAuthRoute = request.nextUrl.pathname.includes('/authentication')
  const isDashboardRoute = request.nextUrl.pathname.includes('/dashboard')
  const isAdminRoute = request.nextUrl.pathname.includes('/admin')
  const isMaintenanceRoute = request.nextUrl.pathname.includes('/maintenance')

  try {
    // Handle i18n first to get the locale information
    const i18nResponse = I18nMiddleware(request)
    
    // Create a new response that preserves the current path
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    // Copy i18n cookies and headers to the new response
    i18nResponse.headers.forEach((value, key) => {
      response.headers.set(key, value)
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.delete({ name, ...options })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    // If in maintenance mode and not accessing maintenance page or landing page, redirect to maintenance
    if (MAINTENANCE_MODE && !isMaintenanceRoute && isDashboardRoute) {
      const redirectResponse = NextResponse.redirect(new URL('/maintenance', request.url))
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie)
      })
      i18nResponse.headers.forEach((value, key) => {
        redirectResponse.headers.set(key, value)
      })
      return redirectResponse
    }

    // For admin routes, check if user has admin access
    if (isAdminRoute) {
      if (!session) {
        const redirectResponse = NextResponse.redirect(new URL('/authentication', request.url))
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie)
        })
        i18nResponse.headers.forEach((value, key) => {
          redirectResponse.headers.set(key, value)
        })
        return redirectResponse
      }

      // Securely verify the user's identity with the Supabase Auth server
      const { data: { user }, error } = await supabase.auth.getUser()
      
      
      if (error || !user || user.id !== process.env.ALLOWED_ADMIN_USER_ID) {
        const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie)
        })
        i18nResponse.headers.forEach((value, key) => {
          redirectResponse.headers.set(key, value)
        })
        return redirectResponse
      }
    }

    // For auth routes, redirect to dashboard if session exists
    if (session && isAuthRoute) {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
      
      // Copy all cookies from the response to the redirect
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie)
      })
      
      // Copy i18n headers
      i18nResponse.headers.forEach((value, key) => {
        redirectResponse.headers.set(key, value)
      })
      
      return redirectResponse
    }

    // For dashboard routes, redirect to auth if no session
    if (!session && isDashboardRoute) {
      const redirectResponse = NextResponse.redirect(new URL('/authentication', request.url))
      
      // Copy all cookies from the response to the redirect
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie)
      })
      
      // Copy i18n headers
      i18nResponse.headers.forEach((value, key) => {
        redirectResponse.headers.set(key, value)
      })
      
      return redirectResponse
    }

    // Copy i18n cookies to the response
    i18nResponse.cookies.getAll().forEach(cookie => {
      response.cookies.set(cookie)
    })

    // For normal navigation, return the response that contains both i18n and Supabase cookies
    return response

  } catch (error) {
    console.error('Middleware authentication error:', error)
    
    // On error, redirect to auth
    if (!isAuthRoute) {
      const redirectResponse = NextResponse.redirect(new URL('/authentication', request.url))
      
      // Copy i18n headers and cookies from the i18n response
      const i18nResponse = I18nMiddleware(request)
      i18nResponse.headers.forEach((value, key) => {
        redirectResponse.headers.set(key, value)
      })
      i18nResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie)
      })
      
      return redirectResponse
    }
    
    return I18nMiddleware(request)
  }
}

export const config = {
  matcher: ['/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)']
}