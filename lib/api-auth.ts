import { NextResponse } from "next/server"
import { createClient } from "@/server/auth"

/**
 * Session gate for App Router handlers under `/api/**`.
 *
 * The proxy skips every `/api` path, so route handlers are the only place a
 * caller is authenticated. Returns the verified user id, or a 401 response the
 * handler should return immediately.
 */
export async function requireApiUserId(): Promise<
  { userId: string; error?: undefined } | { userId?: undefined; error: NextResponse }
> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }
    }

    return { userId: user.id }
  } catch {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
}
