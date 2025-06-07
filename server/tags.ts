'use server'

import { createClient } from './auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getTagsAction(userId: string) {
  console.log('getTags', userId)


  try {
    const tags = await prisma.tag.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return tags
  } catch (error) {
    console.error('Failed to fetch tags:', error)
    throw new Error('Failed to fetch tags')
  }
}

export async function createTagAction(formData: {
  name: string
  description?: string
  color: string
}) {
  console.log('createTag', formData)
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const tag = await prisma.tag.create({
      data: {
        ...formData,
        userId: user.id,
      },
    })

    revalidatePath('/dashboard')
    return { tag }
  } catch (error) {
    console.error('Failed to create tag:', error)
    throw new Error('Failed to create tag')
  }
}

export async function updateTagAction(id: string, formData: {
  name: string
  description?: string
  color: string
}) {
  console.log('updateTag', id, formData)
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {

    // First get the old tag name
    const oldTag = await prisma.tag.findUnique({
      where: {
        id,
        userId: user.id,
      },
      select: { name: true }
    })

    if (!oldTag) {
      throw new Error('Tag not found')
    }

    // Start a transaction to ensure both operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Update the tag itself
      await tx.tag.update({
        where: {
          id,
          userId: user.id,
        },
        data: formData,
      })

      // Find all trades that have this tag
      const trades = await tx.trade.findMany({
        where: {
          userId: user.id,
          tags: {
            has: oldTag.name
          }
        }
      })

      // Update each trade to use the new tag name
      await Promise.all(
        trades.map(trade =>
          tx.trade.update({
            where: { id: trade.id },
            data: {
              tags: {
                set: trade.tags.map(tag => 
                  tag === oldTag.name ? formData.name : tag
                )
              }
            }
          })
        )
      )
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Failed to update tag:', error)
    throw new Error('Failed to update tag')
  }
}

export async function deleteTagAction(id: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    // First get the tag name
    const tag = await prisma.tag.findUnique({
      where: {
        id,
        userId: user.id,
      },
      select: { name: true }
    })

    if (!tag) {
      throw new Error('Tag not found')
    }

    // Start a transaction to ensure both operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Remove tag from all trades that have it
      const trades = await tx.trade.findMany({
        where: {
          userId: user.id,
          tags: {
            has: tag.name
          }
        }
      })

      // Update each trade to remove the tag
      await Promise.all(
        trades.map(trade =>
          tx.trade.update({
            where: { id: trade.id },
            data: {
              tags: {
                set: trade.tags.filter(t => t !== tag.name)
              }
            }
          })
        )
      )

      // Delete the tag itself
      await tx.tag.delete({
        where: {
          id,
          userId: user.id,
        }
      })
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete tag:', error)
    throw new Error('Failed to delete tag')
  }
}

export async function syncTradeTagsToTagTableAction() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    // Get all unique tags from trades
    const trades = await prisma.trade.findMany({
      where: { userId: user.id },
      select: { tags: true }
    })

    // Extract unique tags from trades
    const uniqueTradeTagsSet = new Set<string>()
    trades.forEach(trade => {
      trade.tags.forEach(tag => uniqueTradeTagsSet.add(tag.toLowerCase()))
    })
    const uniqueTradeTags = Array.from(uniqueTradeTagsSet)

    // Get existing tags from Tag table
    const existingTags = await prisma.tag.findMany({
      where: { userId: user.id },
      select: { name: true }
    })
    const existingTagNames = new Set(existingTags.map(tag => tag.name.toLowerCase()))

    // Find tags that need to be created
    const tagsToCreate = uniqueTradeTags.filter(tag => !existingTagNames.has(tag))

    // Create missing tags
    if (tagsToCreate.length > 0) {
      await prisma.tag.createMany({
        data: tagsToCreate.map(tag => ({
          name: tag,
          userId: user.id,
          color: '#CBD5E1', // Default color
        })),
        skipDuplicates: true,
      })
    }

    revalidatePath('/dashboard')
    return { 
      tagsCreated: tagsToCreate.length,
      totalUniqueTags: uniqueTradeTags.length
    }
  } catch (error) {
    console.error('Failed to sync tags:', error)
    throw new Error('Failed to sync tags')
  }
} 