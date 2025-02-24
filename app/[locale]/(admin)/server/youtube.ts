"use server"

import { YoutubeTranscript } from 'youtube-transcript'
import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { z } from "zod"

const DELTALYTIX_CONTEXT = `Deltalytix est une plateforme web pour day traders de futures, avec une interface intuitive et personnalisable. Conçue à partir de mon expérience personnelle en tant que day trader de futures, utilisant des stratégies de scalping, elle propose des fonctionnalités comme la gestion de multiple compte, le suivi des challenges propfirms, et des tableaux de bord personnalisables. Notre but est de fournir aux traders des analyses approfondies sur leurs habitudes de trading pour optimiser leurs stratégies et améliorer leur prise de décision.`

const summarySchema = z.object({
  summary: z.string().describe("Un résumé technique concis des mises à jour présentées")
})

export async function fetchYoutubeTranscript(videoId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    
    if (!transcript || transcript.length === 0) {
      return null
    }

    // Combine all transcript pieces into one text
    const fullText = transcript
      .map(item => item.text)
      .join(' ')
      .trim()

    return fullText
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error)
    return null
  }
}

export async function generateTranscriptSummary(transcript: string): Promise<string | null> {
  try {
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-4-turbo-preview"),
      schema: summarySchema,
      prompt: `Tu es un expert en développement web et en trading qui aide à résumer les mises à jour de Deltalytix.
${DELTALYTIX_CONTEXT}

Ta tâche est de :
1. Analyser la transcription d'une vidéo YouTube
2. Générer un résumé technique concis (150-200 mots) des nouvelles fonctionnalités ou mises à jour présentées
3. Mettre l'accent sur les aspects techniques et les avantages pour les traders
4. Utiliser une terminologie précise du trading de futures
5. Rester factuel et ne pas extrapoler au-delà du contenu de la transcription

Voici la transcription de la vidéo. Génère un résumé technique des mises à jour présentées :

${transcript}`,
      temperature: 0.7,
    })

    let content = { summary: "" }

    for await (const partialObject of partialObjectStream) {
      if (partialObject.summary) content.summary = partialObject.summary
    }

    return content.summary || null
  } catch (error) {
    console.error('Error generating transcript summary:', error)
    return null
  }
} 