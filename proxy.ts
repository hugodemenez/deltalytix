import { type NextRequest, NextResponse } from "next/server"
import { createI18nMiddleware } from "next-international/middleware"
import { createServerClient } from "@supabase/ssr"
import { geolocation } from "@vercel/functions"
import { User } from "@supabase/supabase-js"

// Maintenance mode flag - Set to true to enable maintenance mode
const MAINTENANCE_MODE = false

const I18nMiddleware = createI18nMiddleware({
  locales: ["en", "fr", "de", "es", "it", "pt", "vi", "hi", "ja", "zh", "yo"],
  defaultLocale: "en",
  urlMappingStrategy: "rewrite",
})

async function updateSession(request: NextRequest) {
  // Create a proper NextResponse first
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Use more permissive cookie options for better compatibility
            response.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax", // More permissive than 'strict'
              httpOnly: false, // Allow client-side access if needed
            })
          })
        },
      },
    },
  )

  let user: User | null = null
  let error: unknown = null

  try {
    // Add timeout to prevent hanging requests
    const authPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timeout")), 5000))

    const result = (await Promise.race([authPromise, timeoutPromise])) as any
    user = result.data?.user || null
    error = result.error
  } catch (authError: any) {
    // Handle JSON parsing errors from Supabase API (when API returns HTML instead of JSON)
    if (
      authError?.message?.includes('Unexpected token') ||
      authError?.message?.includes('is not valid JSON') ||
      authError?.originalError?.message?.includes('Unexpected token') ||
      authError?.originalError?.message?.includes('is not valid JSON')
    ) {
      console.error("[Proxy] Supabase API returned non-JSON response:", authError)
      // Don't throw - gracefully handle auth failures by treating as unauthenticated
      user = null
      error = new Error("Authentication service temporarily unavailable")
    } else {
      console.warn("Auth check failed:", authError)
      // Don't throw - gracefully handle auth failures
      user = null
      error = authError
    }
  }

  // Add user info to headers only if user exists
  if (user && !error) {
    response.headers.set("x-user-id", user.id)
    response.headers.set("x-user-email", user.email || "")
    response.headers.set("x-auth-status", "authenticated")
  } else {
    response.headers.set("x-auth-status", "unauthenticated")
    if (error) {
      response.headers.set("x-auth-error", (error as any).message || "Unknown error")
    }
  }

  return { response, user, error }
}

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // More specific static asset exclusions - must be first!
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") ||
    pathname.includes("/videos/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.includes("/opengraph-image") ||
    pathname.includes("/twitter-image") ||
    pathname.includes("/icon")
  ) {
    return NextResponse.next()
  }


  // Apply i18n middleware first
  const response = I18nMiddleware(req)


  // Then update session
  const { response: authResponse, user, error } = await updateSession(req)

  // Embed route check
  if (pathname.includes("/embed")) {
    response.headers.delete('X-Frame-Options'); // Allow framing
    
    // Check if request is from a local file or development environment
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const isLocalFile = origin === 'null' || referer?.startsWith('file://') || (!origin && !referer);
    const isDev = process.env.NODE_ENV === 'development';
    
    console.log('Embed request debug:', { origin, referer, isLocalFile, nodeEnv: process.env.NODE_ENV, pathname });
    
    // If embedding from a local file (file://), omit CSP entirely so browsers don't block
    if (isLocalFile) {
      response.headers.delete('Content-Security-Policy');
      return response;
    }

    // Development: omit CSP entirely to prevent frame-ancestors blocking during local testing
    if (isDev) {
      response.headers.delete('Content-Security-Policy');
      return response;
    }

    // Production CSP - more restrictive
    // Allow localhost for testing (remove in final production)
    const allowedOrigins = [
      "'self'",
      "https://*.deltalytix.app", // Main domain
      "https://*.beta.deltalytix.app", // Beta subdomain
      "http://localhost:*", // For local testing
      "http://127.0.0.1:*",  // For local testing
      "file:", // For local HTML file testing (may be ignored by some browsers)
      "https://thortradecopier.com",
      "https://app.thortradecopier.com",
    ].join(" ");
    
    response.headers.set('Content-Security-Policy',
      `frame-ancestors ${allowedOrigins}; ` +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "connect-src 'self' https://vercel.live; " +
      "font-src 'self' data:; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
    
    return response;
  }
  // Merge responses - copy headers from auth response to i18n response
  authResponse.headers.forEach((value, key) => {
    response.headers.set(key, value)
  })

  // Copy cookies from auth response
  authResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite as any,
    })
  })

  // Maintenance mode check
  if (MAINTENANCE_MODE && !pathname.includes("/maintenance") && pathname.includes("/dashboard")) {
    return NextResponse.redirect(new URL("/maintenance", req.url))
  }

  // Admin route check with better error handling
  if (pathname.includes("/admin")) {
    if (!user || error) {
      const authUrl = new URL("/authentication", req.url)
      authUrl.searchParams.set("error", "admin_access_required")
      return NextResponse.redirect(authUrl)
    }

    // Only allow access to admin in production
    if (user.id !== process.env.ADMIN_USER_ID) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  // Authentication checks with better error handling
  if (!user || error) {
    const isPublicRoute = !pathname.includes("/dashboard")
    if (!isPublicRoute) {
      const encodedSearchParams = `${pathname.substring(1)}${req.nextUrl.search}`
      const authUrl = new URL("/authentication", req.url)

      if (encodedSearchParams) {
        authUrl.searchParams.append("next", encodedSearchParams)
      }

      // Add error context for debugging
      if (error) {
        authUrl.searchParams.set("auth_error", "session_invalid")
      }

      return NextResponse.redirect(authUrl)
    }
  } else {
    // Authenticated - redirect from auth to dashboard
    if (pathname.includes("/authentication")) {
      const nextParam = req.nextUrl.searchParams.get("next")
      const redirectUrl = nextParam ? `/${nextParam}` : "/dashboard"
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }
  }

  // Geolocation handling with better error handling
  try {
    const geo = geolocation(req)

    if (geo.country) {
      response.headers.set("x-user-country", geo.country)
      response.cookies.set("user-country", geo.country, {
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
    }

    if (geo.city) {
      response.headers.set("x-user-city", encodeURIComponent(geo.city))
    }

    if (geo.countryRegion) {
      response.headers.set("x-user-region", encodeURIComponent(geo.countryRegion))
    }
  } catch (geoError) {
    // Fallback to Vercel headers
    const country = req.headers.get("x-vercel-ip-country")
    const city = req.headers.get("x-vercel-ip-city")
    const region = req.headers.get("x-vercel-ip-country-region")

    if (country) {
      response.headers.set("x-user-country", country)
      response.cookies.set("user-country", country, {
        path: "/",
        maxAge: 60 * 60 * 24,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
    }
    if (city) response.headers.set("x-user-city", encodeURIComponent(city))
    if (region) response.headers.set("x-user-region", encodeURIComponent(region))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes
     * - opengraph-image (Open Graph image generation)
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|api|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|mp4|webm|gif|html|webp)$).*)",
  ],
}
