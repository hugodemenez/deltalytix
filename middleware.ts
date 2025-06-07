// middleware.ts
import { createI18nMiddleware } from 'next-international/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { geolocation } from '@vercel/functions'

// Maintenance mode flag - Set to true to enable maintenance mode
const MAINTENANCE_MODE = false

const I18nMiddleware = createI18nMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
  urlMappingStrategy: 'rewrite'
})

async function updateSession(
  request: NextRequest,
  response: NextResponse,
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
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const { data: { user } } = await supabase.auth.getUser();

  // Add user ID to headers for server actions to use
  if (user) {
    response.headers.set("x-user-id", user.id)
    response.headers.set("x-user-email", user.email || "")
  }
  return {response, user};
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  

  // Check if this looks like a non-existent route before processing with i18n
  // This helps prevent the i18n middleware from trying to localize invalid routes
  const segments = pathname.split('/').filter(Boolean)
  const locales = ['en', 'fr']
  
  // If the first segment is not a valid locale and doesn't match known routes,
  // let Next.js handle it naturally (will show 404)
  if (segments.length > 0) {
    const firstSegment = segments[0]
    const knownRoutes = [
      'dashboard',
      'authentication',
      'admin',
      'maintenance',
      'pricing',
      'updates',
      'privacy-policy',
      'terms-of-service',
      'contact',
      'about',
      'blog',
      'support',
      'documentation',
      'api',
      'integrations',
      'features',
      'community',
    ]
    
    if (!locales.includes(firstSegment) && !knownRoutes.includes(firstSegment)) {
      // This might be a non-existent route, let Next.js handle it
      return NextResponse.next()
    }
  }

  const {response, user} = await updateSession(request, I18nMiddleware(request))
  const nextUrl = request.nextUrl
  const pathnameLocale = nextUrl.pathname.split('/', 2)?.[1]

  // Remove the locale from the pathname
  const pathnameWithoutLocale = pathnameLocale
    ? nextUrl.pathname.slice(pathnameLocale.length + 1)
    : nextUrl.pathname

  // Create a new URL without the locale in the pathname
  const newUrl = new URL(pathnameWithoutLocale || '/', request.url)

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

  try {
    // Get geolocation data from Vercel
    const geo = geolocation(request)
    
    // Add geolocation data to response headers for client-side access
    // Encode values to handle non-ASCII characters (like accented letters)
    response.headers.set('x-user-country', geo.country || 'US')
    response.headers.set('x-user-city', encodeURIComponent(geo.city || ''))
    response.headers.set('x-user-region', encodeURIComponent(geo.countryRegion || ''))
    
    // Also add to cookies for easier client-side access
    if (geo.country) {
      response.cookies.set('user-country', geo.country, {
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        sameSite: 'lax'
      })
    }
    
  } catch (error) {
    // Fallback to original Vercel headers if geolocation function fails
    const country = request.headers.get('x-vercel-ip-country')
    const city = request.headers.get('x-vercel-ip-city')
    const region = request.headers.get('x-vercel-ip-country-region')
    
    if (country) {
      response.headers.set('x-user-country', country)
      response.cookies.set('user-country', country, {
        path: '/',
        maxAge: 60 * 60 * 24,
        sameSite: 'lax'
      })
    }
    if (city) response.headers.set('x-user-city', encodeURIComponent(city))
    if (region) response.headers.set('x-user-region', encodeURIComponent(region))
  }

  return response
}

export const config = {
  // Simplified matcher since we handle filtering in middleware logic
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
}