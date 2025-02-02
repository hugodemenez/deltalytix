// middleware.ts
import { createI18nMiddleware } from 'next-international/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const I18nMiddleware = createI18nMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
  urlMappingStrategy: 'rewrite'
})

export async function middleware(request: NextRequest) {
  const i18nResponse = I18nMiddleware(request)
  
  if (!(i18nResponse instanceof NextResponse)) {
    return NextResponse.next()
  }

  const isAuthRoute = request.nextUrl.pathname.includes('/authentication')
  const isDashboardRoute = request.nextUrl.pathname.includes('/dashboard')

  try {
    // Create a new response from i18nResponse
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

    // Get the session without auto-refresh
    const { data: { session } } = await supabase.auth.getSession()

    // For auth routes, redirect to dashboard if session exists
    if (session && isAuthRoute) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      const redirectResponse = NextResponse.redirect(redirectUrl)
      
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
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/authentication'
      const redirectResponse = NextResponse.redirect(redirectUrl)
      
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

    // Copy all i18n cookies to the final response
    i18nResponse.cookies.getAll().forEach(cookie => {
      response.cookies.set(cookie)
    })

    return response

  } catch (error) {
    console.error('Middleware authentication error:', error)
    
    // On error, redirect to auth
    if (!isAuthRoute) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/authentication'
      const redirectResponse = NextResponse.redirect(redirectUrl)
      
      // Copy i18n headers and cookies
      i18nResponse.headers.forEach((value, key) => {
        redirectResponse.headers.set(key, value)
      })
      i18nResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie)
      })
      
      return redirectResponse
    }
    
    return i18nResponse
  }
}

export const config = {
  matcher: ['/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)']
}