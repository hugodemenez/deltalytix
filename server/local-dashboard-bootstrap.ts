import { prisma } from "@/lib/prisma"
import {
  getLocalDashboardUserEmail,
  getLocalDashboardUserId,
} from "@/lib/local-dashboard-auth"

let bootstrapPromise: Promise<void> | null = null

async function runLocalDashboardBootstrap(): Promise<void> {
  const localUserId = getLocalDashboardUserId()
  const localUserEmail = getLocalDashboardUserEmail()

  await prisma.user.upsert({
    where: { id: localUserId },
    update: {
      auth_user_id: localUserId,
      email: localUserEmail,
    },
    create: {
      id: localUserId,
      auth_user_id: localUserId,
      email: localUserEmail,
      language: "en",
    },
  })

  const { createDefaultDashboardLayout } = await import("@/server/database")
  await createDefaultDashboardLayout(localUserId)
}

export function ensureLocalDashboardUserInDatabase(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runLocalDashboardBootstrap().catch((error) => {
      bootstrapPromise = null
      throw error
    })
  }

  return bootstrapPromise
}
