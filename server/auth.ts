'use server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { headers } from "next/headers"
import { User } from '@supabase/supabase-js'

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

/**
 * Wraps Supabase auth operations to handle JSON parsing errors gracefully.
 * When Supabase API returns HTML error pages instead of JSON, this provides
 * a more meaningful error message.
 */
function handleAuthError(error: any): never {
  // Check if this is a JSON parsing error (indicates HTML response)
  if (
    error?.message?.includes('Unexpected token') ||
    error?.message?.includes('is not valid JSON') ||
    error?.originalError?.message?.includes('Unexpected token') ||
    error?.originalError?.message?.includes('is not valid JSON')
  ) {
    console.error('[Auth] Supabase API returned non-JSON response:', {
      error: error.message,
      originalError: error.originalError?.message,
    })
    throw new Error(
      'Authentication service is temporarily unavailable. The service returned an invalid response. Please try again in a few moments.'
    )
  }
  
  // Re-throw other errors as-is
  throw error
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

export async function signInWithDiscord(next: string | null = null, locale?: string) {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  const callbackParams = new URLSearchParams()
  if (next) callbackParams.set('next', next)
  if (locale) callbackParams.set('locale', locale)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${websiteURL}api/auth/callback/${callbackParams.toString() ? `?${callbackParams.toString()}` : ''}`,
    },
  })
  if (data.url) {
    redirect(data.url)
  }
}

export async function signInWithGoogle(next: string | null = null, locale?: string) {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  const callbackParams = new URLSearchParams()
  if (next) callbackParams.set('next', next)
  if (locale) callbackParams.set('locale', locale)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: {
        prompt: 'select_account',
      },
      redirectTo: `${websiteURL}api/auth/callback/${callbackParams.toString() ? `?${callbackParams.toString()}` : ''}`,
    },
  })
  if (data.url) {
    redirect(data.url)
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function signInWithEmail(email: string, next: string | null = null, locale?: string) {
  try {
    const supabase = await createClient()
    const websiteURL = await getWebsiteURL()
    const callbackParams = new URLSearchParams()
    if (next) callbackParams.set('next', next)
    if (locale) callbackParams.set('locale', locale)
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${websiteURL}api/auth/callback/${callbackParams.toString() ? `?${callbackParams.toString()}` : ''}`,
      },
    })
    if (error) {
      throw new Error(error.message)
    }
  } catch (error: any) {
    handleAuthError(error)
  }
}

// Password-based authentication (login)
// If user doesn't exist, automatically creates account and signs in
export async function signInWithPasswordAction(
  email: string,
  password: string,
  next: string | null = null,
  locale?: string
) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    // If sign-in fails, try to create account (user might not exist)
    if (error) {
      // Check if error indicates invalid credentials (could be user doesn't exist or wrong password)
      if (error.message.includes('Invalid login credentials') || 
          error.message.includes('invalid_credentials') ||
          error.message.includes('Email not confirmed')) {
        
        // Try to sign up - if user exists, this will fail and we'll know it's a wrong password
        const websiteURL = await getWebsiteURL()
        const callbackParams = new URLSearchParams()
        if (next) callbackParams.set('next', next)
        if (locale) callbackParams.set('locale', locale)
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${websiteURL}api/auth/callback/${callbackParams.toString() ? `?${callbackParams.toString()}` : ''}`,
          },
        })
        
        if (signUpError) {
          // Check if it's a password validation error (should be shown separately)
          const isPasswordValidationError = 
            signUpError.message.toLowerCase().includes('password should contain') ||
            signUpError.message.toLowerCase().includes('password must contain') ||
            signUpError.message.toLowerCase().includes('password requirements') ||
            signUpError.message.toLowerCase().includes('password is too short') ||
            signUpError.message.toLowerCase().includes('password must be at least')
          
          // If it's a password validation error, throw as-is so they can be displayed
          if (isPasswordValidationError) {
            throw new Error(signUpError.message)
          }
          
          // If sign up fails, it means user already exists
          // Since sign-in also failed with "Invalid login credentials", it could mean:
          // 1. User exists but has no password set (created via magic link) - needs to set password
          // 2. User exists and has password - wrong password was provided
          
          // Check if error indicates user already registered (not just any error)
          const isUserAlreadyRegistered = 
            signUpError.message.toLowerCase().includes('user already registered') ||
            signUpError.message.toLowerCase().includes('already registered') ||
            signUpError.message.toLowerCase().includes('email address is already registered') ||
            signUpError.message.toLowerCase().includes('user already exists')
          
          if (isUserAlreadyRegistered) {
            // User exists but password sign-in failed - likely no password set
            // Send password reset email to allow them to set a password
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${websiteURL}api/auth/callback?type=recovery${callbackParams.toString() ? `&${callbackParams.toString()}` : ''}`,
            })
            
            if (resetError) {
              // If reset fails, fall back to the original error message
              throw new Error('ACCOUNT_EXISTS_NO_PASSWORD: This account exists but doesn\'t have a password set. A password reset email has been sent to your email address. Please check your inbox to set a password.')
            }
            
            // Successfully sent reset email
            throw new Error('ACCOUNT_EXISTS_NO_PASSWORD: This account exists but doesn\'t have a password set. A password reset email has been sent to your email address. Please check your inbox to set a password.')
          }
          
          // For other sign-up errors, assume wrong password (user exists with password)
          throw new Error('INVALID_CREDENTIALS: The password is incorrect. Please try again or use "Forgot password" to reset it.')
        }
        
        // Sign up succeeded
        // If email confirmation is disabled, Supabase automatically signs the user in
        // Check if user is already signed in (session exists)
        if (signUpData.user && signUpData.session) {
          // User is automatically signed in (email confirmation disabled)
          try {
            await ensureUserInDatabase(signUpData.user, locale)
          } catch (e) {
            // Non-fatal; still proceed
            console.error('[signInWithPasswordAction] ensureUserInDatabase failed:', e)
          }
          return { success: true, next }
        }
        
        // If email confirmation is enabled, user needs to confirm email first
        // Try to sign in - this will fail if email is not confirmed
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          // If sign-in fails, it might be because email is not confirmed
          if (signInError.message.includes('Email not confirmed') || signInError.message.includes('email_not_confirmed')) {
            throw new Error('EMAIL_NOT_CONFIRMED: Please check your email and confirm your account before signing in.')
          }
          throw new Error(signInError.message)
        }
        
        // Continue with normal flow after successful sign-in
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await ensureUserInDatabase(user, locale)
          }
        } catch (e) {
          // Non-fatal; still proceed
          console.error('[signInWithPasswordAction] ensureUserInDatabase failed:', e)
        }
        
        return { success: true, next }
      }
      
      // For other errors, throw as-is
      throw new Error(error.message)
    }

    // Sign-in succeeded normally
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await ensureUserInDatabase(user, locale)
      }
    } catch (e) {
      // Non-fatal; still proceed
      console.error('[signInWithPasswordAction] ensureUserInDatabase failed:', e)
    }

    // Optionally handle redirect on the client; return success and let client route
    return { success: true, next }
  } catch (error: any) {
    handleAuthError(error)
  }
}

// Password-based registration – auto signs in if email confirmation is disabled
export async function signUpWithPasswordAction(
  email: string,
  password: string,
  next: string | null = null,
  locale?: string
) {
  try {
    const supabase = await createClient()
    const websiteURL = await getWebsiteURL()
    const callbackParams = new URLSearchParams()
    if (next) callbackParams.set('next', next)
    if (locale) callbackParams.set('locale', locale)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${websiteURL}api/auth/callback/${callbackParams.toString() ? `?${callbackParams.toString()}` : ''}`,
      },
    })
    if (error) {
      throw new Error(error.message)
    }
    
    // If email confirmation is disabled, user is automatically signed in
    if (data.user && data.session) {
      try {
        await ensureUserInDatabase(data.user, locale)
      } catch (e) {
        // Non-fatal; still proceed
        console.error('[signUpWithPasswordAction] ensureUserInDatabase failed:', e)
      }
    }
    
    return { success: true, next }
  } catch (error: any) {
    handleAuthError(error)
  }
}

// Allow a logged-in user (e.g., magic link users) to set or change a password
export async function setPasswordAction(newPassword: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      throw new Error(error.message)
    }
    return { success: true }
  } catch (error: any) {
    handleAuthError(error)
  }
}

/**
 * ensureUserInDatabase
 *
 * Ensures there is a corresponding user record in the public schema linked to the
 * Supabase Auth user, and synchronizes the preferred language/locale from the client.
 *
 * Behavior:
 * - If a user with matching `auth_user_id` exists, updates the email if it changed and
 *   keeps language set to the provided `locale` (fallbacks to existing value).
 * - If no match by `auth_user_id`, optionally checks for an existing user by email; if an
 *   email conflict with a different `auth_user_id` is detected, signs out and throws.
 * - Otherwise, creates a new `user` with `id` and `auth_user_id` set to the Supabase user id,
 *   email set from the Supabase profile, and language set to `locale` (default 'en'). Also
 *   attempts to create a default dashboard layout for first-time users.
 *
 * Parameters:
 * - user: Supabase `User` object (required). Must contain a valid `id`.
 * - locale: Optional locale string from the client (e.g. 'en', 'fr'). When provided, it is
 *   persisted to the `language` field for the user record.
 *
 * Returns:
 * - The up-to-date Prisma `user` record.
 *
 * Side effects:
 * - May sign the user out on integrity or identification errors.
 * - May create a default dashboard layout for new users.
 *
 * Errors:
 * - Throws on missing user or id, account conflicts, Prisma integrity/validation issues, or
 *   unexpected errors. NEXT_REDIRECT errors are re-thrown to allow Next.js redirects.
 */
export async function ensureUserInDatabase(user: User, locale?: string) {
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

    // If user exists by auth_user_id, update fields if needed
    if (existingUserByAuthId) {
      const shouldUpdateEmail = existingUserByAuthId.email !== user.email;
      const shouldUpdateLanguage = !!locale && locale !== existingUserByAuthId.language;

      if (shouldUpdateEmail || shouldUpdateLanguage) {
        console.log('[ensureUserInDatabase] Updating existing user record');
        try {
          const updatedUser = await prisma.user.update({
            where: {
              auth_user_id: user.id // Always use auth_user_id as the unique identifier
            },
            data: {
              email: shouldUpdateEmail ? (user.email || existingUserByAuthId.email) : existingUserByAuthId.email,
              language: shouldUpdateLanguage ? (locale as string) : existingUserByAuthId.language
            },
          });
          console.log('[ensureUserInDatabase] SUCCESS: User updated successfully');
          return updatedUser;
        } catch (updateError) {
          console.error('[ensureUserInDatabase] ERROR: Failed to update user record:', updateError);
          throw new Error('Failed to update user');
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
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type
    })

    if (data.user && data.session) {
      const locale = email.includes('.fr') ? 'fr' : 'en';
      await ensureUserInDatabase(data.user, locale)
    }

    if (error) {
      throw new Error(error.message)
    }

    return data
  } catch (error: any) {
    handleAuthError(error)
  }
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
  try {
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
  } catch (error: any) {
    handleAuthError(error)
  }
}

export async function getUserEmail(): Promise<string> {
  const headersList = await headers()
  const userEmail = headersList.get("x-user-email")
  console.log("[Auth] getUserEmail FROM HEADERS", userEmail)
  return userEmail || ""
}

// Lightweight updater for user language without full ensure logic
export async function updateUserLanguage(locale: string): Promise<{ updated: boolean }> {
  console.log("[Auth] updateUserLanguage", locale)
  const allowedLocales = new Set(['en', 'fr'])
  if (!allowedLocales.has(locale)) {
    return { updated: false }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) {
    return { updated: false }
  }

  const existing = await prisma.user.findUnique({ where: { auth_user_id: user.id } })
  if (!existing) {
    return { updated: false }
  }

  if (existing.language === locale) {
    return { updated: false }
  }

  await prisma.user.update({
    where: { auth_user_id: user.id },
    data: { language: locale },
  })
  return { updated: true }
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
  try {
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
  } catch (error: any) {
    handleAuthError(error)
  }
}