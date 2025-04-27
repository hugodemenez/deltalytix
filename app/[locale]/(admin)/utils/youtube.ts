export function extractYouTubeId(url: string): string | null {
  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/watch.*[?&]v=([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  // If the input looks like a video ID already, return it
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
    return url
  }

  return null
}

interface TranscriptSegment {
  text: string
  start: number
  duration: number
}

interface GeneratePromptOptions {
  maxLength?: number
  includeTimestamps?: boolean
}

/**
 * Generates a base prompt from a YouTube video transcript
 * @param videoId The YouTube video ID
 * @param options Configuration options for prompt generation
 * @returns A promise that resolves to the generated prompt or null if failed
 */
export async function generateBasePrompt(
  videoId: string,
  options: GeneratePromptOptions = {}
): Promise<string | null> {
  const { maxLength = 2000, includeTimestamps = false } = options

  try {
    // Fetch transcript using YouTube's captions API
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch video data')
    }

    const html = await response.text()
    
    // Extract captions data from YouTube's initial data
    const captionsMatch = html.match(/"captions":\s*({[^}]+})/);
    if (!captionsMatch) {
      throw new Error('No captions data found')
    }

    // Parse captions data
    const captionsData = JSON.parse(captionsMatch[1])
    const transcriptUrl = captionsData?.playerCaptionsTracklistRenderer?.captionTracks?.[0]?.baseUrl

    if (!transcriptUrl) {
      throw new Error('No transcript URL found')
    }

    // Fetch and parse transcript
    const transcriptResponse = await fetch(transcriptUrl)
    if (!transcriptResponse.ok) {
      throw new Error('Failed to fetch transcript')
    }

    const transcript = await transcriptResponse.text()
    const segments = parseTranscript(transcript)

    // Generate prompt from transcript
    let prompt = ''
    let currentLength = 0

    for (const segment of segments) {
      const segmentText = includeTimestamps 
        ? `[${formatTimestamp(segment.start)}] ${segment.text}`
        : segment.text

      if (currentLength + segmentText.length > maxLength) {
        break
      }

      prompt += segmentText + ' '
      currentLength += segmentText.length
    }

    return prompt.trim()
  } catch (error) {
    console.error('Error generating base prompt:', error)
    return null
  }
}

/**
 * Parses the raw transcript XML into structured segments
 */
function parseTranscript(transcriptXml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(transcriptXml, 'text/xml')
  const textNodes = doc.getElementsByTagName('text')

  for (const node of textNodes) {
    segments.push({
      text: node.textContent || '',
      start: parseFloat(node.getAttribute('start') || '0'),
      duration: parseFloat(node.getAttribute('dur') || '0')
    })
  }

  return segments
}

/**
 * Formats a timestamp in seconds to MM:SS format
 */
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}