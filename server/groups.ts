'use server'

import { prisma } from '@/lib/prisma'
import { Group, Account } from '@/context/data-provider'
import { createClient } from './auth'

export interface GroupWithAccounts extends Group {
  accounts: Account[]
}

export async function getGroupsAction(): Promise<GroupWithAccounts[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || ''
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

export async function renameGroupAction(groupId: string, name: string): Promise<Group> {
  try {
    const group = await prisma.group.update({
      where: { id: groupId },
      data: { name },
      include: {
        accounts: true,
      },
    })
    return group
  } catch (error) {
    console.error('Error renaming group:', error)
    throw error
  }
}

export async function saveGroupAction(name: string): Promise<Group> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || ''
  try {
    // Check if group already exists
    const existingGroup = await prisma.group.findFirst({
      where: { name, userId },
      include: {
        accounts: true,
      },
    })
    if (existingGroup) {
      return existingGroup
    }
    // Create new group
    const group = await prisma.group.create({
      data: {
        name,
        userId,
      },
      include: {
        accounts: true,
      },
    })
    return group
  } catch (error) {
    console.error('Error creating group:', error)
    throw error
  }
}

export async function updateGroupAction(groupId: string, name: string): Promise<Group> {
  try {
    const group = await prisma.group.update({
      where: { id: groupId },
      data: { name },
      include: {
        accounts: true,
      },
    })
    return group
  } catch (error) {
    console.error('Error updating group:', error)
    throw error
  }
}

export async function deleteGroupAction(groupId: string): Promise<void> {
  try {
    await prisma.group.delete({
      where: { id: groupId },
    })
  } catch (error) {
    console.error('Error deleting group:', error)
    throw error
  }
}

export async function moveAccountToGroupAction(accountId: string, targetGroupId: string | null): Promise<void> {
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

