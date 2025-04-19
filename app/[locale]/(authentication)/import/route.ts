import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect(new URL('/authentication', process.env.NEXT_PUBLIC_APP_URL));
}

export async function POST() {
  return NextResponse.redirect(new URL('/authentication', process.env.NEXT_PUBLIC_APP_URL));
}

