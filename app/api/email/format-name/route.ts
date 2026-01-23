import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/prisma/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { openai } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import { z } from "zod"

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Schema for the AI response
const nameInferenceSchema = z.object({
  names: z.array(z.object({
    email: z.string().describe("The original email address"),
    firstName: z.string().nullable().describe("Inferred first name from email, or null if not inferrable"),
    lastName: z.string().nullable().describe("Inferred last name from email, or null if not inferrable"),
    confidence: z.enum(["high", "medium", "low"]).describe("Confidence level of the inference")
  }))
})

// Allow longer processing time for batch operations
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { batchSize = 10, forceUpdate = false, emails: targetEmails }: { batchSize?: number, forceUpdate?: boolean, emails?: string[] } = body

    // Determine target subscribers
    let subscribers
    if (Array.isArray(targetEmails) && targetEmails.length > 0) {
      // Targeted selection by explicit emails
      subscribers = await prisma.newsletter.findMany({
        where: {
          isActive: true,
          email: { in: targetEmails }
        },
        select: {
          email: true,
          firstName: true,
          lastName: true
        }
      })
    } else {
      // Batch mode based on rules
      const whereClause = forceUpdate 
        ? { isActive: true }
        : { 
            isActive: true,
            firstName: "trader"
          }

      subscribers = await prisma.newsletter.findMany({
        where: whereClause,
        select: {
          email: true,
          firstName: true,
          lastName: true
        },
        take: batchSize
      })
    }

    if (subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscribers need name inference",
        processed: 0,
        updated: 0
      })
    }

    console.log(`Processing ${subscribers.length} emails for name inference`)

    // Prepare emails for AI processing
    const emails = subscribers.map(sub => sub.email)

    // Use AI to infer names from emails
    const { output } = await generateText({
      model: 'openai/gpt-5-mini',
      output: Output.object({ schema: nameInferenceSchema }),
      prompt: `You are an expert at inferring names from email addresses. Analyze the following email addresses and try to extract first and last names where possible.

Rules:
1. Look for common patterns like "john.doe@company.com", "jane_smith@domain.com", "mike123@email.com"
2. Consider cultural naming conventions and common name patterns
3. Be conservative - only infer names when you're reasonably confident
4. For emails like "trader@domain.com" or "admin@company.com", return null for names
5. For emails with numbers or random characters, be more cautious
6. Consider that some emails might be team emails vs personal emails

Email addresses to analyze:
${emails.map((email, index) => `${index + 1}. ${email}`).join('\n')}

Return the inferred names with confidence levels:
- "high": Clear name pattern (e.g., "john.doe@company.com")
- "medium": Likely name but some uncertainty (e.g., "j.smith@domain.com") 
- "low": Possible name but high uncertainty (e.g., "jsmith123@email.com")`,
      temperature: 0.3, // Lower temperature for more consistent results
    })

    // Process the AI results and update database
    let updatedCount = 0
    const results = []

    for (const inference of output.names) {
      const subscriber = subscribers.find(sub => sub.email === inference.email)
      if (!subscriber) continue

      // Only update if we have a reasonable inference and it's different from current
      const shouldUpdate = inference.firstName && 
        inference.confidence !== "low" &&
        (subscriber.firstName === null || 
         subscriber.firstName === "trader" || 
         subscriber.firstName !== inference.firstName)

      if (shouldUpdate) {
        try {
          await prisma.newsletter.update({
            where: { email: inference.email },
            data: {
              firstName: inference.firstName,
              lastName: inference.lastName
            }
          })
          updatedCount++
          results.push({
            email: inference.email,
            oldName: subscriber.firstName,
            newName: inference.firstName,
            confidence: inference.confidence,
            status: "updated"
          })
        } catch (error) {
          console.error(`Failed to update ${inference.email}:`, error)
          results.push({
            email: inference.email,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error"
          })
        }
      } else {
        results.push({
          email: inference.email,
          inferredName: inference.firstName,
          confidence: inference.confidence,
          status: "skipped",
          reason: inference.confidence === "low" ? "Low confidence" : "No change needed"
        })
      }
    }

    console.log(`Name inference completed: ${updatedCount} updated out of ${subscribers.length} processed`)

    return NextResponse.json({
      success: true,
      message: `Processed ${subscribers.length} emails, updated ${updatedCount} names`,
      processed: subscribers.length,
      updated: updatedCount,
      results: results,
      summary: {
        totalProcessed: subscribers.length,
        totalUpdated: updatedCount,
        totalSkipped: results.filter(r => r.status === 'skipped').length,
        totalErrors: results.filter(r => r.status === 'error').length
      }
    })

  } catch (error) {
    console.error("Error in name inference:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to process name inference",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// GET endpoint to check how many subscribers need name inference
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const forceUpdate = searchParams.get('forceUpdate') === 'true'

    const whereClause = forceUpdate 
      ? { isActive: true }
      : { 
          isActive: true,
          firstName: "trader"
        }

    const count = await prisma.newsletter.count({
      where: whereClause
    })

    const totalActive = await prisma.newsletter.count({
      where: { isActive: true }
    })

    return NextResponse.json({
      success: true,
      needsInference: count,
      totalActive: totalActive,
      forceUpdate: forceUpdate
    })

  } catch (error) {
    console.error("Error checking subscribers:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to check subscribers",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
