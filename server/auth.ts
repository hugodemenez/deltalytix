'use server'
import { toast } from '@/hooks/use-toast'
import { getWebsiteURL } from '@/lib/utils'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
  import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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

 export async function signInWithDiscord(redirectUrl: string | null = null) {
    const supabase = await createClient()
    console.log(redirectUrl ? `${getWebsiteURL()}${redirectUrl}` : `${getWebsiteURL()}auth/callback/`)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: redirectUrl ? `${getWebsiteURL()}${redirectUrl}` : `${getWebsiteURL()}auth/callback/`,
      },
    })
    console.log(error,data)
    if (data.url) {
        redirect(data.url) // use the redirect API for your server framework
      }
    
  }
  

  export async function getUserId(){
    const supabase = await createClient()
    const { data: {user}, error } = await supabase.auth.getUser()
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not found',
      })
      return''
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

  export async function signOut(){
    const supabase = await createClient()
    await supabase.auth.signOut()
  }

  export async function signInWithEmail(email:string, redirectUrl: string | null = null){
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectUrl ? `${getWebsiteURL()}${redirectUrl}` : `${getWebsiteURL()}auth/callback/`,
      },
    })
  }