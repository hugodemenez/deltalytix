'use server'
import { getCurrentLocale } from '@/locales/server'
import { createClient, ensureUserInDatabase } from '@/server/auth'
import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next')

   // Redirect to the decoded 'next' URL if it exists, otherwise to the homepage
   let decodedNext: string | null = null;
   if (next) {
    decodedNext = decodeURIComponent(next)
  }
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        if (decodedNext) {
          return NextResponse.redirect(new URL(decodedNext, origin))
        }
        return NextResponse.redirect(`${origin}${next ?? '/dashboard'}`)
      } else if (forwardedHost) {
        if (decodedNext) {
          return NextResponse.redirect(new URL(decodedNext, `https://${forwardedHost}`))
        }
        return NextResponse.redirect(`https://${forwardedHost}${next ?? '/dashboard'}`)
      } else {
        if (decodedNext) {
          return NextResponse.redirect(new URL(decodedNext, origin))
        }
        return NextResponse.redirect(`${origin}${next ?? '/dashboard'}`)
      }
    }
    console.log('error', error)
  }

  // return the user to the authentication page
  return NextResponse.redirect(`${origin}/authentication`)
}
