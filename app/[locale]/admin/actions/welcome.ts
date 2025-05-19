"use server"

import { render } from "@react-email/render"
import WelcomeEmail from "@/components/emails/welcome"
import { getLatestVideoFromPlaylist } from "./youtube"

export async function renderWelcomeEmailPreview(params: {
  firstName: string
  email: string
  language: string
}) {
  try {
    // Get the latest YouTube video ID
    const youtubeId = await getLatestVideoFromPlaylist() || 'ugvyK1c3yPc' // Default video ID if null
    
    const html = await render(
      WelcomeEmail({
        firstName: params.firstName,
        email: params.email,
        language: params.language,
        youtubeId
      })
    )

    return {
      success: true,
      html: `<!DOCTYPE html>
        <html>
          <head>
            <base target="_blank" />
            <style>
              body { margin: 0; padding: 20px; }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>`
    }
  } catch (error) {
    console.error("Failed to render welcome email preview:", error)
    return { error: "Failed to render welcome email preview" }
  }
}
