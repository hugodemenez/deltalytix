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

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            i18nResponse.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            i18nResponse.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    if (session && isAuthRoute) {
      return NextResponse.redirect(new URL(`/dashboard`, request.url))
    }

    i18nResponse.headers.set('X-Language-Change', 'reload')
    return i18nResponse

  } catch (error) {
    console.error('Middleware authentication error:', error)
    return i18nResponse
  }
}

export const config = {
  matcher: ['/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)']
}