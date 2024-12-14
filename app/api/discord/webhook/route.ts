import { NextResponse } from 'next/server'

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL as string

if (!DISCORD_WEBHOOK_URL) {
  throw new Error('Missing DISCORD_WEBHOOK_URL environment variable')
}

export async function POST(request: Request) {
  try {
    const { 
      username, 
      gateway, 
      error, 
      userId, 
      userEmail, 
      discordId, 
      discordUsername 
    } = await request.json()

    const message = {
      content: discordId 
        ? `Support request from <@${discordId}>`
        : `Support request from ${userEmail}`,
      embeds: [{
        title: "Rithmic Connection Support Request",
        description: discordId
          ? "User can be contacted through Discord"
          : `User can be contacted via email: ${userEmail}`,
        color: 0xFF0000, // Red color
        fields: [
          {
            name: "User ID",
            value: userId || "Not provided",
            inline: true
          },
          {
            name: "User Email",
            value: userEmail || "Not provided",
            inline: true
          },
          {
            name: "Gateway",
            value: gateway || "Not provided",
            inline: true
          },
          {
            name: "Rithmic Username",
            value: username || "Not provided",
            inline: true
          },
          ...(discordId ? [{
            name: "Discord Contact",
            value: `Username: ${discordUsername}\n[Open in App](discord://discordapp.com/users/${discordId}) • [Open in Browser](https://discord.com/users/${discordId})`,
            inline: false
          }] : []),
          {
            name: "Error Message",
            value: error || "Not provided",
          }
        ],
        timestamp: new Date().toISOString()
      }]
    }

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      throw new Error('Failed to send Discord notification')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send support request' },
      { status: 500 }
    )
  }
} 