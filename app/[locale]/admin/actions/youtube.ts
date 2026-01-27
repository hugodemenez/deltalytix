"use server"

import { YoutubeTranscript } from 'youtube-transcript'
import { generateText, Output } from "ai"
import { z } from 'zod/v3';

const DELTALYTIX_CONTEXT = `Deltalytix est une plateforme web pour day traders de futures, avec une interface intuitive et personnalisable. Conçue à partir de mon expérience personnelle en tant que day trader de futures, utilisant des stratégies de scalping, elle propose des fonctionnalités comme la gestion de multiple compte, le suivi des challenges propfirms, et des tableaux de bord personnalisables. Notre but est de fournir aux traders des analyses approfondies sur leurs habitudes de trading pour optimiser leurs stratégies et améliorer leur prise de décision.`

const summarySchema = z.object({
  summary: z.string().describe("Un résumé technique concis des mises à jour présentées")
})

export async function generateTranscriptSummary(transcript: string): Promise<string | null> {
  try {
    const { output } = await generateText({
      model: 'openai/gpt-5-mini',
      output: Output.object({ schema: summarySchema }),
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

    return output.summary || null
  } catch (error) {
    console.error('Error generating transcript summary:', error)
    return null
  }
}

export async function fetchTranscriptServer(videoId: string): Promise<string | null> {
  "use server"
  
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    console.log(transcript)
    
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
    
    const data = await response.json() as YouTubePlaylistResponse;
    
    if (!data.items || data.items.length === 0) {
      console.error('No videos found in playlist');
      return null;
    }

    // Sort items by published date in descending order to get the latest one
    const sortedItems = data.items.sort((a, b) => 
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

interface PlaylistVideo {
  videoId: string;
  publishedAt: string;
  title: string;
}

interface YouTubePlaylistItem {
  snippet: {
    publishedAt: string;
    title: string;
  };
  contentDetails: {
    videoId: string;
  };
}

interface YouTubePlaylistResponse {
  items: YouTubePlaylistItem[];
}

/**
 * Get the week number and year for a given date
 */
function getWeekInfo(date: Date): { week: number; year: number } {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return { week, year: date.getFullYear() };
}

/**
 * Check if two dates are in the same week
 */
function isSameWeek(date1: Date, date2: Date): boolean {
  const week1 = getWeekInfo(date1);
  const week2 = getWeekInfo(date2);
  return week1.week === week2.week && week1.year === week2.year;
}

/**
 * Fetch all videos from the Deltalytix YouTube playlist
 * Returns a map of video IDs indexed by publish date
 */
export async function getAllVideosFromPlaylistAction(): Promise<Map<string, PlaylistVideo> | null> {
  try {
    const playlistId = 'PLHyK_WJWO5vcsSKePM0GvJmeY5QRBW40S';
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.error('YouTube API key not found in environment variables');
      return null;
    }
    
    // Get all items from the playlist
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`,
      { cache: 'force-cache' } // Cache for build time
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API error:', errorData);
      return null;
    }
    
    const data = await response.json() as YouTubePlaylistResponse;
    
    if (!data.items || data.items.length === 0) {
      console.error('No videos found in playlist');
      return null;
    }

    // Create a map of videos by their ISO date string
    const videoMap = new Map<string, PlaylistVideo>();
    
    data.items.forEach((item) => {
      const videoId = item.contentDetails?.videoId;
      const publishedAt = item.snippet?.publishedAt;
      const title = item.snippet?.title;
      
      if (videoId && publishedAt) {
        const dateKey = publishedAt.split('T')[0]; // Use just the date part as key
        videoMap.set(dateKey, {
          videoId,
          publishedAt,
          title: title || ''
        });
      }
    });
    
    return videoMap;
  } catch (error) {
    console.error('Error fetching videos from playlist:', error);
    return null;
  }
}

/**
 * Find the YouTube video ID that matches a given post date (same week)
 * This should be called at build time to match videos to posts
 */
export async function findVideoIdForPostDateAction(postDate: string): Promise<string | null> {
  try {
    const videoMap = await getAllVideosFromPlaylistAction();
    
    if (!videoMap) {
      return null;
    }
    
    const postDateObj = new Date(postDate);
    
    // Try to find a video published in the same week
    for (const [, video] of videoMap.entries()) {
      const videoDate = new Date(video.publishedAt);
      if (isSameWeek(postDateObj, videoDate)) {
        console.log(`Matched post date ${postDate} with video published on ${video.publishedAt} (${video.title})`);
        return video.videoId;
      }
    }
    
    console.log(`No video found for post date ${postDate}`);
    return null;
  } catch (error) {
    console.error('Error finding video for post date:', error);
    return null;
  }
} 