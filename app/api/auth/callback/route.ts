'use server'
import { createClient, ensureUserInDatabase } from '@/server/auth'
import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'recovery' for password reset
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next')
  const action = searchParams.get('action')
  const locale = searchParams.get('locale') || undefined

  // Add debugging for Edge
  console.log('Auth callback debug:', {
    userAgent: request.headers.get('user-agent'),
    origin,
    hasCode: !!code,
    next,
    action
  })

  // Redirect to the decoded 'next' URL if it exists, otherwise to the homepage
  let decodedNext: string | null = null;
  if (next) {
    decodedNext = decodeURIComponent(next)
  }
  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        // Handle password recovery redirect
        if (type === 'recovery') {
          const forwardedHost = request.headers.get('x-forwarded-host')
          const isLocalEnv = process.env.NODE_ENV === 'development'
          const baseUrl = isLocalEnv
            ? `${origin}/dashboard/settings`
            : `https://${forwardedHost || origin}/dashboard/settings`
          const redirectUrl = `${baseUrl}?passwordReset=true`
          return NextResponse.redirect(redirectUrl)
        }

        // Handle identity linking redirect
        if (action === 'link') {
          const forwardedHost = request.headers.get('x-forwarded-host')
          const isLocalEnv = process.env.NODE_ENV === 'development'
          const baseUrl = isLocalEnv
            ? `${origin}/dashboard/settings`
            : `https://${forwardedHost || origin}/dashboard/settings`
          const redirectUrl = `${baseUrl}?linked=true`
          return NextResponse.redirect(redirectUrl)
        }

        // Ensure DB user exists and persist locale before redirecting
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await ensureUserInDatabase(user, locale)
          }
        } catch (e) {
          console.error('Auth callback ensureUserInDatabase error:', e)
          // Non-fatal: continue redirect
        }

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
      } else {
        console.log('Auth callback error:', error)
      }
    } catch (error: any) {
      // Handle JSON parsing errors from Supabase API
      if (
        error?.message?.includes('Unexpected token') ||
        error?.message?.includes('is not valid JSON') ||
        error?.originalError?.message?.includes('Unexpected token') ||
        error?.originalError?.message?.includes('is not valid JSON')
      ) {
        console.error('[Auth Callback] Supabase API returned non-JSON response:', error)
        // Redirect to auth page with error message
        return NextResponse.redirect(`${origin}/authentication?error=service_unavailable`)
      }
      console.error('Auth callback unexpected error:', error)
    }
  }

  // return the user to the authentication page
  return NextResponse.redirect(`${origin}/authentication`)
}
