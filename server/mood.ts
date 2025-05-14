'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createClient } from './auth';

export type Conversation = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type MindsetData = {
  emotionValue: number;
  hasTradingExperience: boolean | null;
  selectedNews: string[];
  journalContent: string;
};

export async function saveMindset(
  data: MindsetData,
  date?: Date
) {
  try {
    const supabase = await createClient() 
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Unauthorized')
    }

    // Get current date with time set to start of day in user's timezone
    const now = new Date()
    const targetDate = date || now
    const today = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 12) // Set to noon to avoid timezone issues

    // Get the mood label based on emotion value
    const getMoodLabel = (value: number) => {
      if (value < 20) return 'VERY_SAD'
      if (value < 40) return 'SAD'
      if (value < 60) return 'NEUTRAL'
      if (value < 80) return 'HAPPY'
      return 'VERY_HAPPY'
    }

    // Check if mood already exists for today
    const existingMood = await prisma.mood.findFirst({
      where: {
        userId: user.id,
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
          emotionValue: data.emotionValue,
          hasTradingExperience: data.hasTradingExperience,
          selectedNews: data.selectedNews,
          journalContent: data.journalContent,
          mood: getMoodLabel(data.emotionValue),
          updatedAt: now,
        },
      })
      revalidatePath('/')
      return updatedMood
    }

    // Create new mood
    const newMood = await prisma.mood.create({
      data: {
        userId: user.id,
        day: today,
        emotionValue: data.emotionValue,
        hasTradingExperience: data.hasTradingExperience,
        selectedNews: data.selectedNews,
        journalContent: data.journalContent,
        mood: getMoodLabel(data.emotionValue),
      },
    })

    revalidatePath('/')
    return newMood
  } catch (error) {
    console.error('Error saving mindset:', error)
    throw error
  }
}

export async function saveMood(
  mood: 'bad' | 'okay' | 'great',
  conversation?: Conversation[],
  date?: Date
) {
  try {
    const supabase = await createClient() 
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Unauthorized')
    }
    // Get current date with time set to start of day in user's timezone
    const now = new Date()
    const targetDate = date || now
    const today = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 12) // Set to noon to avoid timezone issues

    // Check if mood already exists for today
    const existingMood = await prisma.mood.findFirst({
      where: {
        userId: user.id,
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
        userId: user.id,
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

export async function getMoodForDay(date: Date) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Unauthorized')
    }

    // Set the time to noon to avoid timezone issues
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const mood = await prisma.mood.findFirst({
      where: {
        userId: user.id,
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

export async function getMoodHistory(userId: string) {
  try {
    const moods = await prisma.mood.findMany({
      where: {
        userId,
      },
      orderBy: {
        day: 'desc',
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

export async function deleteMindset(date: Date) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Unauthorized')
    }

    // Set the time to noon to avoid timezone issues
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const existingMood = await prisma.mood.findFirst({
      where: {
        userId: user.id,
        day: {
          gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          lt: new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate()),
        },
      },
    })

    if (existingMood) {
      await prisma.mood.delete({
        where: { id: existingMood.id },
      })

      revalidatePath('/[locale]/(dashboard)', 'page')
    }
  } catch (error) {
    console.error('Error deleting mood:', error)
    throw error
  }
}

export async function saveJournal(
  journalContent: string,
  date?: Date
) {
  try {
    const supabase = await createClient() 
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Unauthorized')
    }

    // Get current date with time set to start of day in user's timezone
    const now = new Date()
    const targetDate = date || now
    const today = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 12) // Set to noon to avoid timezone issues

    // Check if mood already exists for today
    const existingMood = await prisma.mood.findFirst({
      where: {
        userId: user.id,
        day: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    })

    if (existingMood) {
      // Update existing mood with only journal content
      const updatedMood = await prisma.mood.update({
        where: { id: existingMood.id },
        data: {
          journalContent,
          updatedAt: now,
        },
      })
      revalidatePath('/')
      return updatedMood
    }

    // Create new mood with only journal content
    const newMood = await prisma.mood.create({
      data: {
        userId: user.id,
        day: today,
        journalContent,
        mood: 'NEUTRAL', // Default mood
        emotionValue: 50, // Default emotion value
      },
    })

    revalidatePath('/')
    return newMood
  } catch (error) {
    console.error('Error saving journal:', error)
    throw error
  }
} 