// middleware.ts
import { createI18nMiddleware } from 'next-international/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { geolocation } from '@vercel/functions'

// Maintenance mode flag - Set to true to enable maintenance mode
const MAINTENANCE_MODE = false

const I18nMiddleware = createI18nMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  urlMappingStrategy: 'rewriteDefault'
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
  return { response, user };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for static assets
  if (pathname.includes('.')) return NextResponse.next()
  const { response, user } = await updateSession(request, I18nMiddleware(request))

  // Maintenance mode check
  if (MAINTENANCE_MODE &&
    !pathname.includes('/maintenance') &&
    pathname.includes('/dashboard')) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  // Admin route check
  if (pathname.includes('/admin')) {
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
    const isPublicRoute = !pathname.includes('/dashboard')
    if (!isPublicRoute) {
      const encodedSearchParams = `${pathname.substring(1)}${request.nextUrl.search}`
      const authUrl = new URL('/authentication', request.url)

      if (encodedSearchParams) {
        authUrl.searchParams.append('next', encodedSearchParams)
      }

      return NextResponse.redirect(authUrl)
    }
  } else {
    // Authenticated - redirect from auth to dashboard
    if (pathname.includes('/authentication')) {
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
  // Exclude static assets and API routes from middleware processing
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}