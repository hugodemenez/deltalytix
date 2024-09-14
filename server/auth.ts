'use server'
import { toast } from '@/hooks/use-toast'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function getWebsiteURL(){
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/'
  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`
  return url
}
export async function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function signInWithDiscord() {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  console.log(`${websiteURL}auth/callback/`)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${websiteURL}auth/callback/`,
    },
  })
  console.log(error, data)
  if (data.url) {
    redirect(data.url) // use the redirect API for your server framework
  }

}


export async function getUserId() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user) {
    toast({
      title: 'Error',
      description: 'User not found',
    })
    return ''
  }
  if (error) {
    toast({
      title: 'Error',
      description: error.message,
    })
    return ''
  }
  return user.id
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/authentication')
}

export async function signInWithEmail(email: string, redirectUrl: string | null = null) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: redirectUrl ? `${getWebsiteURL()}${redirectUrl}` : `${getWebsiteURL()}auth/callback/`,
    },
  })
  console.log(error)
}