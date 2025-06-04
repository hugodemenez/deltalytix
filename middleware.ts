// middleware.ts
import { createI18nMiddleware } from 'next-international/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from './server/auth'

// Maintenance mode flag - Set to true to enable maintenance mode
const MAINTENANCE_MODE = false

const I18nMiddleware = createI18nMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
  urlMappingStrategy: 'rewrite'
})

async function updateSession(
  request: NextRequest,
  supabaseResponse: NextResponse,
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  // IMPORTANT: DO NOT REMOVE auth.getUser()
  await supabase.auth.getUser();

  return supabaseResponse;
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request, I18nMiddleware(request))
  const supabase = await createClient()
  const url = new URL('/', request.url)
  const nextUrl = request.nextUrl

  const pathnameLocale = nextUrl.pathname.split('/', 2)?.[1]

  // Remove the locale from the pathname
  const pathnameWithoutLocale = pathnameLocale
    ? nextUrl.pathname.slice(pathnameLocale.length + 1)
    : nextUrl.pathname

  // Create a new URL without the locale in the pathname
  const newUrl = new URL(pathnameWithoutLocale || '/', request.url)

  const { data: { user } } = await supabase.auth.getUser()

  // Maintenance mode check
  if (MAINTENANCE_MODE && 
      !newUrl.pathname.includes('/maintenance') && 
      newUrl.pathname.includes('/dashboard')) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  // Admin route check
  if (newUrl.pathname.includes('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/authentication', request.url))
    }
    
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Authentication checks
  if (!user) {
    // Not authenticated - redirect to auth except for public routes
    const isPublicRoute = !newUrl.pathname.includes('/dashboard')
    if (!isPublicRoute) {
      const encodedSearchParams = `${newUrl.pathname.substring(1)}${newUrl.search}`
      const authUrl = new URL('/authentication', request.url)
      
      if (encodedSearchParams) {
        authUrl.searchParams.append('next', encodedSearchParams)
      }
      
      return NextResponse.redirect(authUrl)
    }
  } else {
    // Authenticated - redirect from auth to dashboard
    if (newUrl.pathname.includes('/authentication')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)']
}