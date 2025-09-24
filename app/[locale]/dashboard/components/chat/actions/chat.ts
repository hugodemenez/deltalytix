'use server'
import { UIMessage } from "ai"
import { prisma } from "@/lib/prisma"
import { addDays, format } from "date-fns"
import { Mood } from "@prisma/client"
import { revalidateTag } from "next/cache"
import { getUserId } from "@/server/auth"

export async function saveChat(messages: UIMessage[]): Promise<Mood | null> {
  console.log('Saving chat', messages)
  const userId = await getUserId()
  
  // Check if user exists before proceeding
  if (!userId) {
    console.error('No user ID found')
    return null
  }

  // Verify user exists in database
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (!user) {
    console.error('User not found in database:', userId)
    return null
  }

  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12))

  // Extract only text content from messages, handling both direct content and parts
  const textOnlyMessages = messages.map(msg => {
    if (msg.parts) {
      // If message has parts, only keep text parts
      const textParts = msg.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('')
      return {
        ...msg,
        content: textParts,
        parts: undefined // Remove parts since we've consolidated them into content
      }
    }
    // If no parts, just use the content directly
    return msg
  })

  // Try to find existing mood entry for today
  const existingMood = await prisma.mood.findFirst({
    where: {
      userId,
      day: {
        gte: todayUTC,
        lt: addDays(todayUTC, 1),
      },
    },
  })

  revalidateTag(`user-data-${userId}`)

  if (existingMood) {
    // Update existing mood entry
    const updatedMood = await prisma.mood.update({
      where: {
        id: existingMood.id,
      },
      data: {
        conversation: JSON.stringify(textOnlyMessages),
      },
    })
    return updatedMood
  } else {
    // Create new mood entry
    const newMood = await prisma.mood.create({
      data: {
        userId,
        day: todayUTC,
        mood: "NEUTRAL", // Default mood
        conversation: JSON.stringify(textOnlyMessages),
      },
    })
    return newMood
  }
}

export async function loadChat(): Promise<UIMessage[]> {
  console.log('Loading chat')
  const userId = await getUserId()
  
  // Check if user exists before proceeding
  if (!userId) {
    console.error('No user ID found')
    return []
  }

  // Verify user exists in database
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (!user) {
    console.error('User not found in database:', userId)
    return []
  }

  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12))

  // Find mood entry for today
  const mood = await prisma.mood.findFirst({
    where: {
      userId,
      day: {
        gte: todayUTC,
        lt: addDays(todayUTC, 1),
      },
    },
  })

  revalidateTag(`user-data-${userId}`)
  console.log('Mood', mood)

  // Return conversation if it exists, otherwise empty array
  return mood?.conversation ? JSON.parse(mood.conversation as string) : []
} 