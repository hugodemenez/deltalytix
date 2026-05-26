'use server'
import { createClient, ensureUserInDatabase } from '@/server/auth'
import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions

function safeRedirectPath(nextParam: string | null) {
  if (!nextParam) {
    return '/dashboard'
  }

  let nextPath = nextParam

  try {
    nextPath = decodeURIComponent(nextPath)
  } catch {
    return '/dashboard'
  }

  if (
    nextPath.startsWith('//') ||
    nextPath.startsWith('\\') ||
    nextPath.includes('://') ||
    nextPath.includes('\\')
  ) {
    return '/dashboard'
  }

  const normalizedPath = nextPath.startsWith('/') ? nextPath : `/${nextPath}`

  if (normalizedPath.startsWith('//')) {
    return '/dashboard'
  }

  return normalizedPath
}

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
        const redirectPath = safeRedirectPath(next)
        if (isLocalEnv) {
          // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
          return NextResponse.redirect(new URL(redirectPath, origin))
        } else if (forwardedHost) {
          return NextResponse.redirect(new URL(redirectPath, `https://${forwardedHost}`))
        } else {
          return NextResponse.redirect(new URL(redirectPath, origin))
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
