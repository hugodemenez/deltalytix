import { prisma } from "@/lib/prisma"
import { getUserId } from "@/server/auth"

/**
 * Confirms the session user owns the team or is one of its managers before any
 * team-scoped read or export. Team ids arrive from the client, so membership
 * must be checked server-side — the dashboard page gate is not enough.
 */
export async function requireTeamAccess(teamId: string): Promise<string> {
  const userId = await getUserId()

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      userId: true,
      managers: {
        where: { managerId: userId },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!team) {
    throw new Error("Unauthorized")
  }

  const isOwner = team.userId === userId
  const isManager = team.managers.length > 0

  if (!isOwner && !isManager) {
    throw new Error("Unauthorized")
  }

  return userId
}
