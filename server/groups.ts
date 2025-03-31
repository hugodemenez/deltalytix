'use server'

import { prisma } from '@/lib/prisma'
import { Group, Account } from '@prisma/client'

export interface GroupWithAccounts extends Group {
  accounts: Account[]
}

export async function getGroups(userId: string): Promise<GroupWithAccounts[]> {
  try {
    const groups = await prisma.group.findMany({
      where: { userId },
      include: {
        accounts: true,
      },
    })
    return groups
  } catch (error) {
    console.error('Error fetching groups:', error)
    throw error
  }
}

export async function createGroup(userId: string, name: string): Promise<Group> {
  try {
    const group = await prisma.group.create({
      data: {
        name,
        userId,
      },
    })
    return group
  } catch (error) {
    console.error('Error creating group:', error)
    throw error
  }
}

export async function updateGroup(groupId: string, name: string): Promise<Group> {
  try {
    const group = await prisma.group.update({
      where: { id: groupId },
      data: { name },
    })
    return group
  } catch (error) {
    console.error('Error updating group:', error)
    throw error
  }
}

export async function deleteGroup(groupId: string): Promise<void> {
  try {
    await prisma.group.delete({
      where: { id: groupId },
    })
  } catch (error) {
    console.error('Error deleting group:', error)
    throw error
  }
}

export async function moveAccountToGroup(accountId: string, targetGroupId: string | null): Promise<void> {
  try {
    await prisma.account.update({
      where: { id: accountId },
      data: { groupId: targetGroupId },
    })
  } catch (error) {
    console.error('Error moving account to group:', error)
    throw error
  }
} 