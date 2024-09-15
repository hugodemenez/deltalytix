'use server'

import { PrismaClient } from "@prisma/client"

export async function getIsSubscribed(email: string) {
    const prisma = new PrismaClient()
    const subscription = await prisma.subscription.findUnique({where: {email: email}})
    console.log('subscription', subscription)
    
    await prisma.$disconnect()
    return subscription
  }