import { NextResponse } from 'next/server'
import { getOAuthRedirectUrl } from '@/server/oauth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  try {
    const url = await getOAuthRedirectUrl('google', {
      next: searchParams.get('next'),
      locale: searchParams.get('locale') ?? undefined,
      mode: searchParams.get('action') === 'link' ? 'link' : 'sign-in',
    })

    if (!url) {
      return NextResponse.json({ error: 'Google OAuth URL unavailable' }, { status: 500 })
    }

    return NextResponse.redirect(url)
  } catch (error) {
    console.error('[OAuth] Google redirect failed:', error)
    return NextResponse.redirect(
      new URL('/authentication?error=oauth_unavailable', request.url),
    )
  }
}
