"use server"

import { YoutubeTranscript } from 'youtube-transcript'
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from 'zod/v3';

const DELTALYTIX_CONTEXT = `Deltalytix est une plateforme web pour day traders de futures, avec une interface intuitive et personnalisable. Conçue à partir de mon expérience personnelle en tant que day trader de futures, utilisant des stratégies de scalping, elle propose des fonctionnalités comme la gestion de multiple compte, le suivi des challenges propfirms, et des tableaux de bord personnalisables. Notre but est de fournir aux traders des analyses approfondies sur leurs habitudes de trading pour optimiser leurs stratégies et améliorer leur prise de décision.`

const summarySchema = z.object({
  summary: z.string().describe("Un résumé technique concis des mises à jour présentées")
})

export async function generateTranscriptSummary(transcript: string): Promise<string | null> {
  try {
    const { object } = await generateObject({
      model: openai("gpt-4.1-nano-2025-04-14"),
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

    console.log(object)
    return object.summary || null
  } catch (error) {
    console.error('Error generating transcript summary:', error)
    return null
  }
}

export async function fetchTranscriptServer(videoId: string): Promise<string | null> {
  "use server"
  
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

export async function getLatestVideoFromPlaylist(): Promise<string | null> {
  try {
    const playlistId = 'PLHyK_WJWO5vcsSKePM0GvJmeY5QRBW40S';
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.error('YouTube API key not found in environment variables');
      return null;
    }
    
    // Get all items from the playlist
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API error:', errorData);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.error('No videos found in playlist');
      return null;
    }

    // Sort items by published date in descending order to get the latest one
    const sortedItems = data.items.sort((a: any, b: any) => 
      new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime()
    );
    
    // Get the video ID from the most recently published item
    const latestItem = sortedItems[0];
    const videoId = latestItem.contentDetails.videoId;
    
    if (!videoId) {
      console.error('No video ID found in playlist item');
      return null;
    }
    
    return videoId;
  } catch (error) {
    console.error('Error fetching latest video from playlist:', error);
    return null;
  }
} 