'use server'
import { UIMessage } from "ai"
import { prisma, prismaBase } from "@/lib/prisma"
import { addDays } from "date-fns"
import { Mood } from "@/prisma/generated/prisma/client"
import { revalidateTag } from "next/cache"
import { getUserId } from "@/server/auth"
import {
  decryptJournalConversation,
  encryptJournalConversation,
} from "@/lib/journal-field-crypto"
import {
  conversationWrite,
  storedConversationIsUnread,
  storedJsonEquals,
} from "@/lib/journal-field-write-guard"

export async function saveChat(messages: UIMessage[]): Promise<Mood | null> {
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
      return {
        ...msg,
        parts: textParts
      }
    }
    // If no parts, just use the content directly
    return msg
  })

  const existingMood = await prismaBase.mood.findFirst({
    where: {
      userId,
      day: {
        gte: todayUTC,
        lt: addDays(todayUTC, 1),
      },
    },
    select: { id: true, conversation: true },
  })

  // Expire immediately so next time we load the user data, we get the latest data
  revalidateTag(`user-data-${userId}`, { expire: 0 })

  if (existingMood) {
    conversationWrite({
      existingUndecryptable: storedConversationIsUnread(existingMood.conversation),
      incoming: textOnlyMessages,
    })
    const result = await prismaBase.mood.updateMany({
      where: {
        id: existingMood.id,
        conversation: storedJsonEquals(existingMood.conversation),
      },
      data: {
        conversation: encryptJournalConversation(
          JSON.stringify(textOnlyMessages),
        ),
      },
    })
    if (result.count === 0) {
      throw new Error(
        "Refusing to overwrite mood.conversation: stored value changed concurrently.",
      )
    }
    return prisma.mood.findUnique({ where: { id: existingMood.id } })
  } else {
    // Create new mood entry
    const newMood = await prisma.mood.create({
      data: {
        userId,
        day: todayUTC,
        mood: "NEUTRAL", // Default mood
        conversation: encryptJournalConversation(
          JSON.stringify(textOnlyMessages),
        ),
      },
    })
    return newMood
  }
}

export async function loadChat(): Promise<UIMessage[]> {
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

  const mood = await prismaBase.mood.findFirst({
    where: {
      userId,
      day: {
        gte: todayUTC,
        lt: addDays(todayUTC, 1),
      },
    },
    select: { conversation: true },
  })

  if (mood && storedConversationIsUnread(mood.conversation)) {
    throw new Error(
      "Refusing to load unread mood.conversation. The stored transcript could not be decrypted; it was not empty.",
    )
  }
  const conversation = decryptJournalConversation(mood?.conversation)
  if (!conversation) return []
  if (Array.isArray(conversation)) return conversation as UIMessage[]
  if (typeof conversation === "string") {
    return JSON.parse(conversation) as UIMessage[]
  }
  return []
} 