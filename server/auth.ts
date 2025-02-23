'use server'
import { toast } from '@/hooks/use-toast'
import { PrismaClient } from '@prisma/client'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()

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
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ 
              name, 
              ...options 
            })
          } catch {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function signInWithDiscord(next: string | null = null) {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${websiteURL}api/auth/callback/${next ? `?next=${encodeURIComponent(next)}` : ''}`,
    },
  })
  if (data.url) {
    // Before redirecting, ensure user is created/updated in Prisma database
    redirect(data.url)
  }
}

export async function signInWithGoogle(next: string | null = null) {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${websiteURL}api/auth/callback/${next ? `?next=${encodeURIComponent(next)}` : ''}`,
    },
  })
  if (data.url) {
    redirect(data.url)
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
  // Ensure user is in Prisma database
  await ensureUserInDatabase(user)
  return user.id
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function signInWithEmail(email: string, next: string | null = null) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: `${getWebsiteURL()}api/auth/callback/${next ? `?next=${encodeURIComponent(next)}` : ''}`,
    },
  })
}

interface SupabaseUser {
  id: string;
  email?: string | null;
}

async function ensureUserInDatabase(user: SupabaseUser) {
  if (!user) {
    throw new Error('User data is required');
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { auth_user_id: user.id },
    });

    if (existingUser) {
      // Only update if email has changed
      if (existingUser.email !== user.email) {
        return await prisma.user.update({
          where: { auth_user_id: user.id },
          data: { email: user.email || existingUser.email }, // Fallback to existing email if new one is null
        });
      }
      return existingUser;
    }

    // Create new user if doesn't exist
    return await prisma.user.create({
      data: {
        auth_user_id: user.id,
        email: user.email || '', // Provide a default empty string if email is null
        id: user.id,
      },
    });
  } catch (error) {
    console.error('Error ensuring user in database:', error);
    throw new Error('Failed to create or update user');
  }
}

// You might want to add this function to your callback route
export async function handleAuthCallback() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await ensureUserInDatabase(user)
  }
  // No need to handle redirect here, as it's already managed in the route
}

export async function verifyOtp(email: string, token: string, type: 'email' | 'signup' = 'email') {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type
  })

  if (error) {
    throw new Error(error.message)
  }

  // Ensure user is in database after verification
  if (data.user) {
    await ensureUserInDatabase(data.user)
  }

  return data
}
