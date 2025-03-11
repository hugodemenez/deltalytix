'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type Conversation = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export async function saveMood(
  userId: string,
  mood: 'bad' | 'okay' | 'great',
  conversation?: Conversation[],
  date?: Date
) {
  try {
    // Get current date with time set to start of day in user's timezone
    const now = new Date()
    const targetDate = date || now
    const today = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 12) // Set to noon to avoid timezone issues

    // Check if mood already exists for today
    const existingMood = await prisma.mood.findFirst({
      where: {
        userId,
        day: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    })

    if (existingMood) {
      // Update existing mood
      const updatedMood = await prisma.mood.update({
        where: { id: existingMood.id },
        data: {
          mood,
          conversation: conversation ? JSON.stringify(conversation) : undefined,
          updatedAt: now,
        },
      })
      revalidatePath('/')
      return updatedMood
    }

    // Create new mood
    const newMood = await prisma.mood.create({
      data: {
        userId,
        day: today,
        mood,
        conversation: conversation ? JSON.stringify(conversation) : undefined,
      },
    })

    revalidatePath('/')
    return newMood
  } catch (error) {
    console.error('Error saving mood:', error)
    throw error
  }
}

export async function getMoodForDay(userId: string, date: Date) {
  try {
    // Set the time to noon to avoid timezone issues
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const mood = await prisma.mood.findFirst({
      where: {
        userId,
        day: {
          gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          lt: new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate()),
        },
      },
    })

    return mood ? {
      ...mood,
      conversation: mood.conversation ? JSON.parse(mood.conversation as string) : null,
    } : null
  } catch (error) {
    console.error('Error getting mood:', error)
    throw error
  }
}

export async function getMoodHistory(userId: string, startDate: Date, endDate: Date) {
  try {
    const moods = await prisma.mood.findMany({
      where: {
        userId,
        day: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        day: 'asc',
      },
    })

    return moods.map(mood => ({
      ...mood,
      conversation: mood.conversation ? JSON.parse(mood.conversation as string) : null,
    }))
  } catch (error) {
    console.error('Error getting mood history:', error)
    throw error
  }
} 