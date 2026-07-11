import { createClient, getWebsiteURL } from '@/server/auth'

export type OAuthProvider = 'discord' | 'google'
export type OAuthMode = 'sign-in' | 'link'

export type OAuthStartOptions = {
  next?: string | null
  locale?: string
  mode?: OAuthMode
}

function buildCallbackUrl(websiteURL: string, options: OAuthStartOptions) {
  const callbackParams = new URLSearchParams()
  if (options.next) callbackParams.set('next', options.next)
  if (options.locale) callbackParams.set('locale', options.locale)
  if (options.mode === 'link') callbackParams.set('action', 'link')

  const query = callbackParams.toString()
  return `${websiteURL}api/auth/callback${query ? `?${query}` : ''}`
}

export async function getOAuthRedirectUrl(
  provider: OAuthProvider,
  options: OAuthStartOptions = {},
): Promise<string | null> {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  const redirectTo = buildCallbackUrl(websiteURL, options)

  if (options.mode === 'link') {
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo },
    })
    if (error) throw new Error(error.message)
    return data.url ?? null
  }

  const oauthOptions =
    provider === 'google'
      ? {
          queryParams: { prompt: 'select_account' as const },
          redirectTo,
        }
      : { redirectTo }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: oauthOptions,
  })

  if (error) throw new Error(error.message)
  return data.url ?? null
}
