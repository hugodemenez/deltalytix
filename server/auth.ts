'use server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { headers } from "next/headers"

export async function getWebsiteURL() {
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
  const cookieStore = await cookies()

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
      queryParams: {
        prompt: 'select_account',
      },
      redirectTo: `${websiteURL}api/auth/callback/${next ? `?next=${encodeURIComponent(next)}` : ''}`,
    },
  })
  if (data.url) {
    redirect(data.url)
  }
}

// export async function getUserId() {
//   const supabase = await createClient()
//   const { data: { user }, error } = await supabase.auth.getUser()
//   if (!user) {
//     toast({
//       title: 'Error',
//       description: 'User not found',
//     })
//     return ''
//   }
//   if (error) {
//     toast({
//       title: 'Error',
//       description: error.message,
//     })
//     return ''
//   }
//   // Ensure user is in Prisma database
//   await ensureUserInDatabase(user)
//   return user.id
// }

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

export async function ensureUserInDatabase(user: SupabaseUser, locale?: string) {
  console.log('[ensureUserInDatabase] Starting with user:', { id: user?.id, email: user?.email });
  
  if (!user) {
    console.log('[ensureUserInDatabase] ERROR: No user provided');
    await signOut();
    throw new Error('User data is required');
  }

  if (!user.id) {
    console.log('[ensureUserInDatabase] ERROR: No user ID provided');
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
      // If email is different, update it
      if (existingUserByAuthId.email !== user.email) {
        console.log('[ensureUserInDatabase] Updating existing user email');
        try {
          const updatedUser = await prisma.user.update({
            where: {
              auth_user_id: user.id // Always use auth_user_id as the unique identifier
            },
            data: {
              email: user.email || existingUserByAuthId.email,
              language: locale || existingUserByAuthId.language
            },
          });
          console.log('[ensureUserInDatabase] SUCCESS: User updated successfully');
          return updatedUser;
        } catch (updateError) {
          console.error('[ensureUserInDatabase] ERROR: Failed to update user email:', updateError);
          throw new Error('Failed to update user email');
        }
      }
      console.log('[ensureUserInDatabase] SUCCESS: Existing user found, no update needed');
      return existingUserByAuthId;
    }

    // If user doesn't exist by auth_user_id, check if email exists
    if (user.email) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUserByEmail && existingUserByEmail.auth_user_id !== user.id) {
        console.log('[ensureUserInDatabase] ERROR: Account conflict - email already associated with different auth method', {
          userEmail: user.email,
          existingAuthId: existingUserByEmail.auth_user_id,
          currentAuthId: user.id
        });
        await signOut();
        throw new Error('Account conflict: Email already associated with different authentication method');
      }
    }

    // Create new user if no existing user found
    console.log('[ensureUserInDatabase] Creating new user');
    try {
      const newUser = await prisma.user.create({
        data: {
          auth_user_id: user.id,
          email: user.email || '', // Provide a default empty string if email is null
          id: user.id,
          language: locale || 'en'
        },
      });
      console.log('[ensureUserInDatabase] SUCCESS: New user created successfully');
      
      // Create default dashboard layout for new user
      try {
        const { createDefaultDashboardLayout } = await import('@/server/database');
        await createDefaultDashboardLayout(user.id);
        console.log('[ensureUserInDatabase] SUCCESS: Default dashboard layout created');
      } catch (layoutError) {
        console.error('[ensureUserInDatabase] WARNING: Failed to create default dashboard layout:', layoutError);
        // Don't throw here - user creation succeeded, layout can be created later
      }
      
      return newUser;
    } catch (createError) {
      if (createError instanceof Error &&
        createError.message.includes('Unique constraint failed')) {
        console.log('[ensureUserInDatabase] ERROR: Unique constraint failed when creating user', createError);
        await signOut();
        throw new Error('Database integrity error: Duplicate user records found');
      }
      console.error('[ensureUserInDatabase] ERROR: Failed to create user:', createError);
      await signOut();
      throw new Error('Failed to create user account');
    }
  } catch (error) {
    // Re-throw NEXT_REDIRECT errors immediately (these are normal Next.js redirects)
    if (error instanceof Error && (
      error.message === 'NEXT_REDIRECT' || 
      ('digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT'))
    )) {
      throw error;
    }

    console.error('[ensureUserInDatabase] ERROR: Unexpected error in main catch block:', error);

    // Handle Prisma validation errors
    if (error instanceof Error) {
      if (error.message.includes('Argument `where` of type UserWhereUniqueInput needs')) {
        console.log('[ensureUserInDatabase] ERROR: Invalid user identification provided');
        await signOut();
        throw new Error('Invalid user identification provided');
      }

      if (error.message.includes('Unique constraint failed')) {
        console.log('[ensureUserInDatabase] ERROR: Database integrity error - duplicate user records');
        await signOut();
        throw new Error('Database integrity error: Duplicate user records found');
      }

      if (error.message.includes('Account conflict')) {
        console.log('[ensureUserInDatabase] ERROR: Re-throwing account conflict error');
        // Error already handled above
        throw error;
      }
    }

    // For any other unexpected errors, log out the user
    console.log('[ensureUserInDatabase] ERROR: Critical database error - signing out user');
    await signOut();
    throw new Error('Critical database error occurred. Please try logging in again.');
  }
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

  return data
}

// Optimized function that uses middleware data when available
export async function getUserId(): Promise<string> {
  // First try to get user ID from middleware headers
  const headersList = await headers()
  const userIdFromMiddleware = headersList.get("x-user-id")

  if (userIdFromMiddleware) {
    console.log("[Auth] Using user ID from middleware")
    return userIdFromMiddleware
  }

  // Fallback to Supabase call (for API routes or edge cases)
  console.log("[Auth] Fallback to Supabase call")
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("User not authenticated")
  }

  return user.id
}

export async function getUserEmail(): Promise<string> {
  const headersList = await headers()
  const userEmail = headersList.get("x-user-email")
  console.log("[Auth] getUserEmail FROM HEADERS", userEmail)
  return userEmail || ""
}

// Identity linking functions
export async function linkDiscordAccount() {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'discord',
    options: {
      redirectTo: `${websiteURL}api/auth/callback?action=link`,
    },
  })
  if (data.url) {
    redirect(data.url)
  }
  if (error) {
    throw new Error(error.message)
  }
}

export async function linkGoogleAccount() {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo: `${websiteURL}api/auth/callback?action=link`,
    },
  })
  if (data.url) {
    redirect(data.url)
  }
  if (error) {
    throw new Error(error.message)
  }
}

export async function unlinkIdentity(identity: any) {
  const supabase = await createClient()
  const { error } = await supabase.auth.unlinkIdentity(identity)
  if (error) {
    throw new Error(error.message)
  }
  return { success: true }
}

export async function getUserIdentities() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('User not authenticated')
  }

  // Get user's identities using the proper method
  const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities()
  
  if (identitiesError) {
    throw new Error(identitiesError.message)
  }

  return identities
}