import { createClient, ensureUserInDatabase } from '@/server/auth'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')
  const action = searchParams.get('action')
  const locale = searchParams.get('locale') || undefined

  // Resolve the base URL for redirects
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const baseUrl = isLocalEnv
    ? origin
    : `https://${forwardedHost || origin}`

  // Build the redirect path helper
  const redirectTo = (path: string) => {
    if (isLocalEnv) return NextResponse.redirect(new URL(path, origin))
    return NextResponse.redirect(`${baseUrl}${path}`)
  }

  // Helper to redirect to dashboard or the specified next path
  const redirectToDashboard = (locale?: string) => {
    let decodedNext: string | null = null
    if (next) {
      decodedNext = decodeURIComponent(next)
    }
    if (decodedNext) {
      if (isLocalEnv) return NextResponse.redirect(new URL(decodedNext, origin))
      return NextResponse.redirect(`https://${forwardedHost}${decodedNext.startsWith('/') ? '' : '/'}${decodedNext}`)
    }
    if (isLocalEnv) return NextResponse.redirect(`${origin}${next ?? '/dashboard'}`)
    return NextResponse.redirect(`${baseUrl}${next ?? '/dashboard'}`)
  }

  console.log('Auth callback debug:', {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type,
    next,
    action,
    locale,
  })

  if (code) {
    // PKCE flow: exchange authorization code for session (OAuth, password-based)
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        // Handle password recovery redirect
        if (type === 'recovery') {
          return redirectTo('/dashboard/settings?passwordReset=true')
        }

        // Handle identity linking redirect
        if (action === 'link') {
          return redirectTo('/dashboard/settings?linked=true')
        }

        // Ensure DB user exists and persist locale
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await ensureUserInDatabase(user, locale)
          }
        } catch (e) {
          console.error('Auth callback ensureUserInDatabase error:', e)
        }

        return redirectToDashboard()
      }

      console.error('Auth callback exchangeCodeForSession error:', error)
      return redirectTo(`/authentication?auth_error=exchange_failed&error_description=${encodeURIComponent(error.message)}`)
    } catch (error: any) {
      if (
        error?.message?.includes('Unexpected token') ||
        error?.message?.includes('is not valid JSON') ||
        error?.originalError?.message?.includes('Unexpected token') ||
        error?.originalError?.message?.includes('is not valid JSON')
      ) {
        console.error('[Auth Callback] Supabase API returned non-JSON response:', error)
        return redirectTo('/authentication?auth_error=service_unavailable')
      }
      console.error('Auth callback unexpected error:', error)
      return redirectTo(`/authentication?auth_error=unexpected&error_description=${encodeURIComponent(error?.message || 'Unknown error')}`)
    }
  }

  if (token_hash && type) {
    // Magic link / OTP flow: verify the token hash
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })

      if (!error) {
        // Handle password recovery
        if (type === 'recovery') {
          return redirectTo('/dashboard/settings?passwordReset=true')
        }

        // Ensure DB user exists and persist locale
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await ensureUserInDatabase(user, locale)
          }
        } catch (e) {
          console.error('Auth callback ensureUserInDatabase error:', e)
        }

        return redirectToDashboard()
      }

      console.error('Auth callback verifyOtp error:', error)
      return redirectTo(`/authentication?auth_error=verification_failed&error_description=${encodeURIComponent(error.message)}`)
    } catch (error: any) {
      console.error('Auth callback verifyOtp unexpected error:', error)
      return redirectTo(`/authentication?auth_error=verification_error&error_description=${encodeURIComponent(error?.message || 'Unknown error')}`)
    }
  }

  // No valid auth parameters found
  console.error('Auth callback: no code or token_hash found in URL', {
    searchParams: Object.fromEntries(searchParams.entries()),
  })
  return redirectTo(`/authentication?auth_error=missing_params`)
}
