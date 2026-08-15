import { NextResponse } from "next/server"
import { headers } from 'next/headers'
import { buildWeeklyRecapEmail } from "@/lib/weekly-recap-email"

export async function POST(req: Request, props: { params: Promise<{ userid: string }> }) {
  const params = await props.params;
  try {
    // Verify that this is a legitimate request with the correct secret
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await buildWeeklyRecapEmail(params.userid)
    return NextResponse.json(result)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error', stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    )
  }
}
