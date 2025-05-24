'use server'
import { Message } from "@ai-sdk/react"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"

export async function saveChat(userId: string, messages: Message[]) {
  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12))

  // Try to find existing mood entry for today
  const existingMood = await prisma.mood.findFirst({
    where: {
      userId,
      day: {
        gte: new Date(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate()),
        lt: new Date(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate() + 1),
      },
    },
  })

  if (existingMood) {
    // Update existing mood entry
    await prisma.mood.update({
      where: {
        id: existingMood.id,
      },
      data: {
        conversation: JSON.stringify(messages),
      },
    })
  } else {
    // Create new mood entry
    await prisma.mood.create({
      data: {
        userId,
        day: todayUTC,
        mood: "NEUTRAL", // Default mood
        conversation: JSON.stringify(messages),
      },
    })
  }
}

export async function loadChat(userId: string): Promise<Message[]> {
  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12))

  // Find mood entry for today
  const mood = await prisma.mood.findFirst({
    where: {
      userId,
      day: {
        gte: new Date(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate()),
        lt: new Date(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate() + 1),
      },
    },
  })

  // Return conversation if it exists, otherwise empty array
  return mood?.conversation ? JSON.parse(mood.conversation as string) : []
} 