'use server'

import { createClient } from '@/server/auth'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export async function generateThorToken() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex')
    
    // Update or create user with new token
    await prisma.user.update({
      where: {
        auth_user_id: user.id
      },
      data: {
        thorToken: token
      }
    })

    return { token }
  } catch (error) {
    console.error('Failed to generate Thor token:', error)
    return { error: 'Failed to generate token' }
  }
}

export async function getThorToken() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const userData = await prisma.user.findUnique({
      where: {
        auth_user_id: user.id
      },
      select: {
        thorToken: true
      }
    })

    return { token: userData?.thorToken }
  } catch (error) {
    console.error('Failed to get Thor token:', error)
    return { error: 'Failed to get token' }
  }
} 