import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { createHmac, timingSafeEqual } from "crypto"
import { createClient } from "@/server/auth"

// Add route segment config
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// Token generation and validation
function generateToken(email: string): string {
  const secret = process.env.ENCRYPTION_KEY || 'fallback-secret-key'
  const timestamp = Date.now().toString()
  const data = `${email}:${timestamp}`
  const hmac = createHmac('sha256', secret)
  hmac.update(data)
  const signature = hmac.digest('hex')
  return Buffer.from(`${data}:${signature}`).toString('base64url')
}

function validateToken(token: string, email: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const [emailFromToken, timestamp, signature] = decoded.split(':')
    
    // Check if email matches
    if (emailFromToken !== email) {
      return false
    }
    
    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp)
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return false
    }
    
    // Verify signature
    const secret = process.env.ENCRYPTION_KEY || 'fallback-secret-key'
    const data = `${emailFromToken}:${timestamp}`
    const hmac = createHmac('sha256', secret)
    hmac.update(data)
    const expectedSignature = hmac.digest('hex')
    
    // Use timing-safe comparison
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)
    
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false
    }
    
    return timingSafeEqual(signatureBuffer, expectedBuffer)
  } catch (error) {
    console.error('Token validation error:', error)
    return false
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const token = searchParams.get('token')

    // Try to get authenticated user first
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // If user is authenticated, use their email
    if (user?.email) {
      const newsletter = await prisma.newsletter.findUnique({
        where: { email: user.email },
        select: {
          email: true,
          isActive: true,
          monthlyStats: true,
          weeklyUpdates: true,
          renewalNotifications: true,
        }
      })

      if (!newsletter) {
        // Return default preferences if not found
        return NextResponse.json({
          email: user.email,
          isActive: true,
          monthlyStats: true,
          weeklyUpdates: true,
          renewalNotifications: true,
        })
      }

      return NextResponse.json(newsletter)
    }

    // If not authenticated, require email and token
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Token parameter is required' },
        { status: 400 }
      )
    }

    // Validate token
    if (!validateToken(token, email)) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get the newsletter preferences
    const newsletter = await prisma.newsletter.findUnique({
      where: { email },
      select: {
        email: true,
        isActive: true,
        monthlyStats: true,
        weeklyUpdates: true,
        renewalNotifications: true,
      }
    })

    if (!newsletter) {
      return NextResponse.json(
        { error: 'Email not found in newsletter list' },
        { status: 404 }
      )
    }

    return NextResponse.json(newsletter)
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, token, monthlyStats, weeklyUpdates, renewalNotifications } = body

    // Try to get authenticated user first
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // If user is authenticated, use their email
    if (user?.email) {
      const newsletter = await prisma.newsletter.upsert({
        where: { email: user.email },
        update: {
          monthlyStats: monthlyStats ?? true,
          weeklyUpdates: weeklyUpdates ?? true,
          renewalNotifications: renewalNotifications ?? true,
        },
        create: {
          email: user.email,
          isActive: true,
          monthlyStats: monthlyStats ?? true,
          weeklyUpdates: weeklyUpdates ?? true,
          renewalNotifications: renewalNotifications ?? true,
        }
      })

      return NextResponse.json({
        success: true,
        preferences: {
          email: newsletter.email,
          monthlyStats: newsletter.monthlyStats,
          weeklyUpdates: newsletter.weeklyUpdates,
          renewalNotifications: newsletter.renewalNotifications,
        }
      })
    }

    // If not authenticated, require email and token
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Validate token
    if (!validateToken(token, email)) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Update or create newsletter preferences
    const newsletter = await prisma.newsletter.upsert({
      where: { email },
      update: {
        monthlyStats: monthlyStats ?? true,
        weeklyUpdates: weeklyUpdates ?? true,
        renewalNotifications: renewalNotifications ?? true,
      },
      create: {
        email,
        isActive: true,
        monthlyStats: monthlyStats ?? true,
        weeklyUpdates: weeklyUpdates ?? true,
        renewalNotifications: renewalNotifications ?? true,
      }
    })

    return NextResponse.json({
      success: true,
      preferences: {
        email: newsletter.email,
        monthlyStats: newsletter.monthlyStats,
        weeklyUpdates: newsletter.weeklyUpdates,
        renewalNotifications: newsletter.renewalNotifications,
      }
    })
  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper endpoint to generate a token for testing/email generation
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const token = generateToken(email)
    
    return NextResponse.json({
      token,
      expiresIn: '24 hours'
    })
  } catch (error) {
    console.error('Generate token error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
