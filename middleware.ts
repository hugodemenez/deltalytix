// middleware.ts
import { createI18nMiddleware } from 'next-international/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const I18nMiddleware = createI18nMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
  urlMappingStrategy: 'rewrite'
})

/**
* Executes internationalization middleware and returns a customized response
* @example
* middleware(new NextRequest('http://example.com'))
* // Returns NextResponse with custom headers
* @param {NextRequest} request - The incoming request to be processed.
* @returns {NextResponse} The processed response with any additional headers.
* @description
*   - This middleware function is specifically designed for Next.js applications.
*   - It will add a custom header 'X-Language-Change' when a response is an instance of NextResponse.
*   - The custom header added is used to indicate that a full page reload is needed on language change.
*   - If the returned value from I18nMiddleware is not an instance of NextResponse, it simply calls NextResponse.next().
*/
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