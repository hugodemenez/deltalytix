import { createClient } from "@/server/auth"

/**
 * Gate for admin-only server actions.
 *
 * The proxy already redirects non-admins away from `/admin` pages, but every
 * privileged export still needs its own check: action ids are reachable from any
 * page that imports the module, and proxy matching is not part of the action
 * contract. Fail closed when ADMIN_USER_ID is unset.
 */
export async function requireAdminUser(): Promise<string> {
  const adminUserId = process.env.ADMIN_USER_ID

  if (!adminUserId) {
    throw new Error("Unauthorized")
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user || user.id !== adminUserId) {
    throw new Error("Unauthorized")
  }

  return user.id
}
