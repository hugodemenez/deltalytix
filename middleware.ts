// middleware.ts
import { createI18nMiddleware } from 'next-international/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const I18nMiddleware = createI18nMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
  urlMappingStrategy: 'rewrite'
})

export function middleware(request: NextRequest) {
  const response = I18nMiddleware(request)
  
  // Ensure that the response is a NextResponse
  if (!(response instanceof NextResponse)) {
    return NextResponse.next()
  }

  // Add a custom header to force a full page reload on language change
  response.headers.set('X-Language-Change', 'reload')


  return response
}

export const config = {
  matcher: ['/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)']
}