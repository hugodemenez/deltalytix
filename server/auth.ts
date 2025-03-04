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

export async function ensureUserInDatabase(user: SupabaseUser) {
  if (!user) {
    await signOut();
    throw new Error('User data is required');
  }

  if (!user.id) {
    await signOut();
    throw new Error('User ID is required');
  }

  try {
    // First try to find user by auth_user_id
    const existingUserByAuthId = await prisma.user.findUnique({
      where: { auth_user_id: user.id },
    });

    // If user exists by auth_user_id, update email if needed
    if (existingUserByAuthId) {
      if (existingUserByAuthId.email !== user.email) {
        try {
          return await prisma.user.update({
            where: { 
              auth_user_id: user.id // Always use auth_user_id as the unique identifier
            },
            data: { 
              email: user.email || existingUserByAuthId.email 
            },
          });
        } catch (updateError) {
          console.error('Error updating user email:', updateError);
          throw new Error('Failed to update user email');
        }
      }
      return existingUserByAuthId;
    }

    // If user doesn't exist by auth_user_id, check if email exists
    if (user.email) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUserByEmail && existingUserByEmail.auth_user_id !== user.id) {
        await signOut();
        throw new Error('Account conflict: Email already associated with different authentication method');
      }

      if (existingUserByEmail) {
        try {
          return await prisma.user.update({
            where: { 
              email: user.email // Use email as the unique identifier since we found the user by email
            },
            data: { 
              auth_user_id: user.id 
            },
          });
        } catch (updateError) {
          console.error('Error updating auth_user_id:', updateError);
          await signOut();
          throw new Error('Failed to update user authentication');
        }
      }
    }

    // Create new user if no existing user found
    try {
      return await prisma.user.create({
        data: {
          auth_user_id: user.id,
          email: user.email || '', // Provide a default empty string if email is null
          id: user.id,
        },
      });
    } catch (createError) {
      if (createError instanceof Error && 
          createError.message.includes('Unique constraint failed')) {
        await signOut();
        throw new Error('Database integrity error: Duplicate user records found');
      }
      console.error('Error creating user:', createError);
      await signOut();
      throw new Error('Failed to create user account');
    }
  } catch (error) {
    console.error('Error ensuring user in database:', error);
    
    // Handle Prisma validation errors
    if (error instanceof Error) {
      if (error.message.includes('Argument `where` of type UserWhereUniqueInput needs')) {
        await signOut();
        throw new Error('Invalid user identification provided');
      }
      
      if (error.message.includes('Unique constraint failed')) {
        await signOut();
        throw new Error('Database integrity error: Duplicate user records found');
      }
      
      if (error.message.includes('Account conflict')) {
        // Error already handled above
        throw error;
      }
    }
    
    // For any other unexpected errors, log out the user
    await signOut();
    throw new Error('Critical database error occurred. Please try logging in again.');
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
