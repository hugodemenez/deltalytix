"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/server/auth"
import { revalidatePath } from "next/cache"

export async function ensureAccountAndAssignGroup(
  accountNumber: string,
  groupId: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "User not found" }
  }
  try {
    // Check if account exists
    let account = await prisma.account.findUnique({
      where: {
        number_userId: {
          number: accountNumber,
          userId: user.id,
        },
      },
    })

    // Create if it doesn't exist
    if (!account) {
      account = await prisma.account.create({
        data: {
          number: accountNumber,
          userId: user.id,
        },
      })
    }

    // If groupId is provided, verify it exists and belongs to the user
    if (groupId) {
      const group = await prisma.group.findFirst({
        where: {
          id: groupId,
          userId: user.id,
        },
      })

      if (!group) {
        return { success: false, error: "Group not found or does not belong to user" }
      }
    }

    // Then move the account to the selected group
    await prisma.account.update({
      where: { id: account.id },
      data: { groupId },
    })

    return { success: true }
  } catch (error) {
    console.error("Error in ensureAccountAndAssignGroup:", error)
    return { success: false, error: "Failed to assign account to group" }
  }
} 

export async function getAccounts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        number: true,
        groupId: true,
      },
    })
    return accounts
  } catch (error) {
    console.error("Error in getAccounts:", error)
    return []
  }
}
