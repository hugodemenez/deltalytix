export type OAuthProvider = 'discord' | 'google'
export type OAuthMode = 'sign-in' | 'link'

type StartOAuthOptions = {
  next?: string | null
  locale?: string
  mode?: OAuthMode
}

export function buildOAuthStartPath(
  provider: OAuthProvider,
  options: StartOAuthOptions = {},
) {
  const params = new URLSearchParams()
  if (options.next) params.set('next', options.next)
  if (options.locale) params.set('locale', options.locale)
  if (options.mode === 'link') params.set('action', 'link')
  const query = params.toString()
  return `/api/auth/oauth/${provider}${query ? `?${query}` : ''}`
}

/** Full-page navigation for OAuth (required for desktop WebView shells). */
export function startOAuth(provider: OAuthProvider, options: StartOAuthOptions = {}) {
  window.location.assign(buildOAuthStartPath(provider, options))
}
