import { prisma } from "@/lib/prisma"
import { getUserId } from "@/server/auth"

/**
 * Every OAuth table (`OAuthApp`, `OAuthAuthorizationCode`, `OAuthAccessToken`)
 * has a `userId` foreign key onto `User.id`, and the API routes read trades and
 * accounts by that same `User.id`.
 *
 * `getUserId()` returns the *Supabase auth* id. For accounts created before
 * `auth_user_id` was split out the two happen to be equal, but for every user
 * created since they differ — writing the auth id would either violate the
 * foreign key or, worse, key a token to an id whose trades and accounts are
 * empty. Always resolve the row first.
 */
export async function resolveDbUserId(): Promise<string> {
  const authUserId = await getUserId()

  const user = await prisma.user.findFirst({
    where: { OR: [{ auth_user_id: authUserId }, { id: authUserId }] },
    select: { id: true },
  })

  if (!user) {
    throw new Error("No Deltalytix user is linked to this session")
  }

  return user.id
}
