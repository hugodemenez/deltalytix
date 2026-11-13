import { NextResponse } from "next/server"
import { jsonError } from '@/lib/api/json-error'
import { authorizeAdminRequest } from '@/lib/admin/auth'
import { buildWeeklyRecapEmail } from "@/lib/weekly-recap-email"

export async function POST(req: Request, props: { params: Promise<{ userid: string }> }) {
  const params = await props.params;
  const auth = await authorizeAdminRequest(req)
  if (!auth.ok) {
    return jsonError({
      code: auth.status === 401 ? 'unauthorized' : 'forbidden',
      message:
        auth.status === 401
          ? 'Admin authentication is required.'
          : 'This user is not on the admin allowlist.',
      hint:
        auth.status === 401
          ? 'Sign in as an allowlisted admin.'
          : 'This account is not on the admin allowlist.',
    })
  }

  try {
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
