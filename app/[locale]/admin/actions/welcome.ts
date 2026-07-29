"use server"

import { render } from "@react-email/render"
import WelcomeEmail, { renderWelcomeEmailText, WELCOME_VIDEO_IDS } from "@/components/emails/welcome"
import { getLatestVideoFromPlaylist } from "./youtube"

export async function renderWelcomeEmailPreview(params: {
  firstName: string
  email: string
  language: string
}) {
  try {
    const locale = params.language === "fr" ? "fr" : "en"
    const youtubeId = locale === "fr"
      ? await getLatestVideoFromPlaylist() || WELCOME_VIDEO_IDS.fr
      : WELCOME_VIDEO_IDS.en
    
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
      text: renderWelcomeEmailText({
        firstName: params.firstName,
        email: params.email,
        language: params.language,
        youtubeId
      }),
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
