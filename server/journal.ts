'use server'

import { prisma, prismaBase } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createClient } from './auth';
import { Mood } from '@/prisma/generated/prisma/client';
import {
  encryptJournalConversation,
  encryptJournalField,
  withDecryptedMoodFields,
} from '@/lib/journal-field-crypto';
import {
  conversationWrite,
  mindsetJournalContentWrite,
  storedConversationIsUnread,
  storedJournalIsUnread,
  storedJsonEquals,
} from '@/lib/journal-field-write-guard';

function moodDayBounds(today: Date) {
  return {
    gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
  }
}

async function loadStoredMoodRaw(userId: string, today: Date) {
  return prismaBase.mood.findFirst({
    where: { userId, day: moodDayBounds(today) },
    select: { id: true, journalContent: true, conversation: true },
  })
}

async function decryptedMoodById(id: string) {
  const mood = await prisma.mood.findUnique({ where: { id } })
  if (!mood) {
    throw new Error('Mood not found after write')
  }
  return withDecryptedMoodFields(mood)
}

function parseStoredConversation(value: unknown) {
  if (value == null) return null
  if (typeof value !== 'string') return value
  return JSON.parse(value)
}

export type Conversation = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type MindsetData = {
  emotionValue: number;
  selectedNews: string[];
  journalContent?: string;
  journalEdited?: boolean;
};

export async function saveMindset(
  data: MindsetData,
  date?: string
) {
  try {
    console.log('saveMindset', date)
    const supabase = await createClient() 
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Unauthorized')
    }

    // Convert date string to Date at midday UTC
    let today: Date
    if (date) {
      today = new Date(date + 'T12:00:00Z')
    } else {
      const now = new Date()
      today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12))
    }
    const now = new Date()

    // Get the mood label based on emotion value
    const getMoodLabel = (value: number) => {
      if (value < 20) return 'VERY_SAD'
      if (value < 40) return 'SAD'
      if (value < 60) return 'NEUTRAL'
      if (value < 80) return 'HAPPY'
      return 'VERY_HAPPY'
    }

    const existingMood = await loadStoredMoodRaw(user.id, today)

    if (existingMood) {
      const journalWrite = mindsetJournalContentWrite({
        existingUndecryptable: storedJournalIsUnread(existingMood.journalContent),
        journalEdited: data.journalEdited === true,
        incoming: data.journalContent,
      })
      const moodFields = {
        emotionValue: data.emotionValue,
        selectedNews: data.selectedNews,
        mood: getMoodLabel(data.emotionValue),
        updatedAt: now,
      }
      if ('omit' in journalWrite) {
        const updatedMood = await prisma.mood.update({
          where: { id: existingMood.id },
          data: moodFields,
        })
        revalidatePath('/')
        return withDecryptedMoodFields(updatedMood)
      }
      const result = await prismaBase.mood.updateMany({
        where: {
          id: existingMood.id,
          journalContent: existingMood.journalContent,
        },
        data: {
          ...moodFields,
          journalContent: encryptJournalField(journalWrite.value),
        },
      })
      if (result.count === 0) {
        throw new Error(
          'Refusing to overwrite mood.journalContent: stored value changed concurrently.',
        )
      }
      revalidatePath('/')
      return decryptedMoodById(existingMood.id)
    }

    // Create new mood
    const newMood = await prisma.mood.create({
      data: {
        userId: user.id,
        day: today,
        emotionValue: data.emotionValue,
        selectedNews: data.selectedNews,
        journalContent: encryptJournalField(data.journalContent ?? ''),
        mood: getMoodLabel(data.emotionValue),
      },
    })

    revalidatePath('/')
    return withDecryptedMoodFields(newMood)
  } catch (error) {
    console.error('Error saving mindset:', error)
    throw error
  }
}

export async function saveMood(
  mood: 'bad' | 'okay' | 'great',
  conversation?: Conversation[],
  date?: string
) {
  try {
    const supabase = await createClient() 
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Unauthorized')
    }
    // Convert date string to Date at midday UTC
    let today: Date
    if (date) {
      today = new Date(date + 'T12:00:00Z')
    } else {
      const now = new Date()
      today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12))
    }
    const now = new Date()

    const existingMood = await loadStoredMoodRaw(user.id, today)

    if (existingMood) {
      if (!conversation) {
        const updatedMood = await prisma.mood.update({
          where: { id: existingMood.id },
          data: { mood, updatedAt: now },
        })
        revalidatePath('/')
        return withDecryptedMoodFields(updatedMood)
      }
      conversationWrite({
        existingUndecryptable: storedConversationIsUnread(existingMood.conversation),
        incoming: conversation,
      })
      const result = await prismaBase.mood.updateMany({
        where: {
          id: existingMood.id,
          conversation: storedJsonEquals(existingMood.conversation),
        },
        data: {
          mood,
          conversation: encryptJournalConversation(JSON.stringify(conversation)),
          updatedAt: now,
        },
      })
      if (result.count === 0) {
        throw new Error(
          'Refusing to overwrite mood.conversation: stored value changed concurrently.',
        )
      }
      revalidatePath('/')
      return decryptedMoodById(existingMood.id)
    }

    // Create new mood
    const newMood = await prisma.mood.create({
      data: {
        userId: user.id,
        day: today,
        mood,
        conversation: conversation
          ? encryptJournalConversation(JSON.stringify(conversation))
          : undefined,
      },
    })

    revalidatePath('/')
    return withDecryptedMoodFields(newMood)
  } catch (error) {
    console.error('Error saving mood:', error)
    throw error
  }
}

export async function getMoodForDay(date: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Unauthorized')
    }

    // Convert date string to Date at midday UTC
    const targetDate = new Date(date + 'T12:00:00Z')
    const nextDay = new Date(targetDate)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)

    const mood = await prisma.mood.findFirst({
      where: {
        userId: user.id,
        day: {
          gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          lt: new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate()),
        },
      },
    })

    if (!mood) return null
    const decrypted = withDecryptedMoodFields(mood)
    return {
      ...decrypted,
      conversation: parseStoredConversation(decrypted.conversation),
    }
  } catch (error) {
    console.error('Error getting mood:', error)
    throw error
  }
}

export async function getMoodHistory(fromDate?: Date, toDate?: Date): Promise<Mood[]> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  try {
    const moods = await prisma.mood.findMany({
      where: {
        userId: user.id,
        day: fromDate ? {
          gte: fromDate,
          lt: toDate ? toDate : undefined,
        } : undefined,
      },
      orderBy: {
        day: 'desc',
      },
    })

    return moods.map(mood => {
      const decrypted = withDecryptedMoodFields(mood)
      return {
        ...decrypted,
        conversation: parseStoredConversation(decrypted.conversation),
      }
    })
  } catch (error) {
    console.error('Error getting mood history:', error)
    throw error
  }
}

export async function deleteMindset(date: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Unauthorized')
    }

    // Convert date string to Date at midday UTC
    const targetDate = new Date(date + 'T12:00:00Z')
    const nextDay = new Date(targetDate)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)

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
  date?: string
) {
  try {
    console.log('saveJournal', date)
    const supabase = await createClient() 
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Unauthorized')
    }

    // Convert date string to Date at midday UTC
    let today: Date
    if (date) {
      today = new Date(date + 'T12:00:00Z')
    } else {
      const now = new Date()
      today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12))
    }
    const now = new Date()

    const existingMood = await loadStoredMoodRaw(user.id, today)

    if (existingMood) {
      const journalWrite = mindsetJournalContentWrite({
        existingUndecryptable: storedJournalIsUnread(existingMood.journalContent),
        journalEdited: true,
        incoming: journalContent,
      })
      if ('omit' in journalWrite) {
        return decryptedMoodById(existingMood.id)
      }
      const result = await prismaBase.mood.updateMany({
        where: {
          id: existingMood.id,
          journalContent: existingMood.journalContent,
        },
        data: {
          journalContent: encryptJournalField(journalWrite.value),
          updatedAt: now,
        },
      })
      if (result.count === 0) {
        throw new Error(
          'Refusing to overwrite mood.journalContent: stored value changed concurrently.',
        )
      }
      revalidatePath('/')
      return decryptedMoodById(existingMood.id)
    }

    // Create new mood with only journal content
    const newMood = await prisma.mood.create({
      data: {
        userId: user.id,
        day: today,
        journalContent: encryptJournalField(journalContent),
        mood: 'NEUTRAL', // Default mood
        emotionValue: 50, // Default emotion value
      },
    })

    revalidatePath('/')
    return withDecryptedMoodFields(newMood)
  } catch (error) {
    console.error('Error saving journal:', error)
    throw error
  }
} 