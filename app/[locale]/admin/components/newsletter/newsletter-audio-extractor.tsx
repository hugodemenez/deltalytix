// components/audio-extractor.tsx
"use client"

import { useRef, useState } from 'react'
import { Input, Output, Conversion, ALL_FORMATS, BlobSource, Mp3OutputFormat, WavOutputFormat, BufferTarget } from 'mediabunny'

interface AudioExtractorProps {
  onAudioExtracted?: (audioBuffer: ArrayBuffer, fileName: string) => void
  onTranscriptionComplete?: (transcription: string, fileName: string) => void
}

interface ChunkInfo {
  index: number
  size: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  fileName: string
  audioBuffer: ArrayBuffer
  audioUrl?: string
}

export function AudioExtractor({ onAudioExtracted, onTranscriptionComplete }: AudioExtractorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionProgress, setTranscriptionProgress] = useState('')
  const [completedChunks, setCompletedChunks] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [chunks, setChunks] = useState<ChunkInfo[]>([])
  const [audioChunks, setAudioChunks] = useState<ArrayBuffer[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const recreateAudioUrl = (chunk: ChunkInfo) => {
    try {
      // Revoke old URL if it exists
      if (chunk.audioUrl) {
        URL.revokeObjectURL(chunk.audioUrl)
      }
      
      // Create new blob and URL
      const audioBlob = new Blob([chunk.audioBuffer], { type: 'audio/wav' })
      const newUrl = URL.createObjectURL(audioBlob)
      
      console.log(`Recreated audio URL for chunk ${chunk.index + 1}:`, newUrl)
      
      // Update the chunk with new URL
      setChunks(prev => prev.map(c => 
        c.index === chunk.index ? { ...c, audioUrl: newUrl } : c
      ))
      
      return newUrl
    } catch (error) {
      console.error(`Failed to recreate audio URL for chunk ${chunk.index + 1}:`, error)
      return null
    }
  }

  const splitAudioByDuration = async (input: any, chunkDurationSeconds: number = 30) => {
    // Get the total duration of the audio
    const totalDuration = await input.computeDuration()
    console.log(`Total audio duration: ${totalDuration.toFixed(2)} seconds`)
    
    // Calculate number of chunks needed
    const numChunks = Math.ceil(totalDuration / chunkDurationSeconds)
    console.log(`Splitting into ${numChunks} chunks of ${chunkDurationSeconds} seconds each`)
    
    const chunks: ArrayBuffer[] = []
    
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * chunkDurationSeconds
      const endTime = Math.min((i + 1) * chunkDurationSeconds, totalDuration)
      
      console.log(`Creating chunk ${i + 1}/${numChunks}: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`)
      
      // Create output for this chunk
      const output = new Output({
        format: new WavOutputFormat(),
        target: new BufferTarget(),
      })
      
      // Create conversion with trimming - let Mediabunny handle the audio track
      const conversion = await Conversion.init({
        input,
        output,
        trim: {
          start: startTime,
          end: endTime,
        },
      })
      
      // Execute the conversion to get the chunk
      await conversion.execute()
      
      const chunkBuffer = output.target.buffer
      if (!chunkBuffer) {
        throw new Error(`Failed to create chunk ${i + 1}`)
      }
      
      chunks.push(chunkBuffer)
      console.log(`Chunk ${i + 1} created: ${(chunkBuffer.byteLength / (1024 * 1024)).toFixed(1)}MB`)
    }
    
    return chunks
  }

  const transcribeAudio = async (audioBuffer: ArrayBuffer, fileName: string) => {
    if (!onTranscriptionComplete) return

    setIsTranscribing(true)
    try {
      // Check if file is too large (over 2MB)
      const maxSize = 2 * 1024 * 1024 // 2MB
      
      if (audioBuffer.byteLength > maxSize) {
        const fileSizeMB = (audioBuffer.byteLength / (1024 * 1024)).toFixed(1)
        console.log(`Audio file is large (${fileSizeMB}MB), splitting into chunks...`)
        setTranscriptionProgress(`Large file detected (${fileSizeMB}MB), splitting into chunks...`)
        
        // Create input from the audio buffer for proper splitting
        const input = new Input({
          source: new BlobSource(new Blob([audioBuffer], { type: 'audio/wav' })),
          formats: ALL_FORMATS,
        })
        
        let audioChunks: ArrayBuffer[]
        
        try {
          // Try duration-based splitting first
          console.log('Attempting duration-based audio splitting...')
          audioChunks = await splitAudioByDuration(input, 30)
        } catch (durationError) {
          console.warn('Duration-based splitting failed, falling back to simple splitting:', durationError)
          
          // Fallback to simple file size splitting - but this won't work for audio playback
          // We need to create proper WAV chunks, not just binary slices
          throw new Error('Duration-based splitting failed and simple splitting creates invalid audio files. Please try a smaller file or contact support.')
        }
        
        console.log(`Split into ${audioChunks.length} chunks`)
        setTotalChunks(audioChunks.length)
        setCompletedChunks(0)
        setTranscriptionProgress(`Split into ${audioChunks.length} chunks, transcribing in parallel...`)
        
        // Create chunk info for UI preview with audio URLs
        const chunkInfos: ChunkInfo[] = audioChunks.map((chunk, index) => {
          // Create a proper WAV blob with correct MIME type
          const audioBlob = new Blob([chunk], { type: 'audio/wav' })
          const audioUrl = URL.createObjectURL(audioBlob)
          
          console.log(`Created audio URL for chunk ${index + 1}:`, audioUrl)
          
          return {
            index,
            size: chunk.byteLength,
            status: 'pending' as const,
            fileName: `${fileName.replace('.wav', '')}_part_${index + 1}_${(index * 30).toFixed(0)}s-${((index + 1) * 30).toFixed(0)}s.wav`,
            audioBuffer: chunk,
            audioUrl
          }
        })
        setChunks(chunkInfos)
        
        // Store chunks for later transcription
        setAudioChunks(audioChunks)
        setFileName(fileName)
        
        // Wait for user to review chunks before starting transcription
        setTranscriptionProgress(`Ready to transcribe ${audioChunks.length} chunks. Review chunks above and click "Start Transcription" when ready.`)
        
      } else {
        // File is small enough, transcribe directly
        const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })
        const audioFile = new File([audioBlob], fileName, { type: 'audio/wav' })

        // Create FormData for the API request
        const formData = new FormData()
        formData.append('audio', audioFile)

        // Send to Whisper API
        const response = await fetch('/api/ai/transcribe', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Transcription failed')
        }

        const result = await response.json()
        if (onTranscriptionComplete) {
          onTranscriptionComplete(result.transcription, fileName)
        }
      }
      
    } catch (error) {
      console.error('Transcription error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Failed to extract audio: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const startTranscription = async () => {
    if (!audioChunks.length || !fileName) return

    setIsTranscribing(true)
    try {
      // Create transcription promises for parallel processing
      const transcriptionPromises = audioChunks.map(async (chunk, index) => {
        const chunkFileName = `${fileName.replace('.wav', '')}_part_${index + 1}.wav`
        
        console.log(`Starting transcription for chunk ${index + 1}/${audioChunks.length}...`)
        
        // Update chunk status to processing
        setChunks(prev => prev.map(chunk => 
          chunk.index === index ? { ...chunk, status: 'processing' } : chunk
        ))
        
        // Create a File object from the chunk
        const audioBlob = new Blob([chunk], { type: 'audio/wav' })
        const audioFile = new File([audioBlob], chunkFileName, { type: 'audio/wav' })

        // Create FormData for the API request
        const formData = new FormData()
        formData.append('audio', audioFile)

        // Send to Whisper API
        const response = await fetch('/api/ai/transcribe', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          // Update chunk status to error
          setChunks(prev => prev.map(chunk => 
            chunk.index === index ? { ...chunk, status: 'error' } : chunk
          ))
          throw new Error(`Transcription failed for chunk ${index + 1}`)
        }

        const result = await response.json()
        console.log(`Completed transcription for chunk ${index + 1}/${audioChunks.length}`)
        
        // Update chunk status to completed
        setChunks(prev => prev.map(chunk => 
          chunk.index === index ? { ...chunk, status: 'completed' } : chunk
        ))
        
        // Update progress
        setCompletedChunks(prev => {
          const newCount = prev + 1
          setTranscriptionProgress(`Transcribing in parallel... ${newCount}/${audioChunks.length} chunks completed`)
          return newCount
        })
        
        return { index, transcription: result.transcription }
      })

      // Wait for all transcriptions to complete
      const results = await Promise.all(transcriptionPromises)
      
      // Sort results by index to maintain order
      const sortedResults = results.sort((a, b) => a.index - b.index)
      const transcriptions = sortedResults.map(result => result.transcription)
      
      // Combine all transcriptions
      const fullTranscription = transcriptions
        .map((transcript, index) => `--- Part ${index + 1} ---\n\n${transcript}`)
        .join('\n\n')
      if (onTranscriptionComplete) {
        onTranscriptionComplete(fullTranscription, fileName)
      }
      
    } catch (error) {
      console.error('Transcription error:', error)
      setError('Failed to transcribe audio. Please try again.')
    } finally {
      setIsTranscribing(false)
      setTranscriptionProgress('')
      setCompletedChunks(0)
      setTotalChunks(0)
      setAudioChunks([])
      setFileName('')
      
      // Clean up audio URLs
      chunks.forEach(chunk => {
        if (chunk.audioUrl) {
          URL.revokeObjectURL(chunk.audioUrl)
        }
      })
      setChunks([])
    }
  }

  const extractAudio = async (file: File) => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Starting audio extraction for file:', file.name, file.type, file.size)
      
      // Create input from the video file
      const input = new Input({
        source: new BlobSource(file),
        formats: ALL_FORMATS,
      })

      // Check if the file has audio tracks
      console.log('Checking for audio tracks...')
      const audioTrack = await input.getPrimaryAudioTrack()
      console.log('Audio track found:', audioTrack)
      
      if (!audioTrack) {
        throw new Error('No audio track found in the video file')
      }

      // Create output for WAV audio (more compatible than MP3)
      console.log('Creating output format...')
      const output = new Output({
        format: new WavOutputFormat(),
        target: new BufferTarget(),
      })

      // Perform the conversion - Mediabunny should automatically handle audio extraction
      console.log('Initializing conversion...')
      const conversion = await Conversion.init({ input, output })
      console.log('Conversion initialized, executing...')
      await conversion.execute()
      console.log('Conversion completed')

      // Get the resulting audio buffer
      const buffer = output.target.buffer
      console.log('Buffer generated:', buffer ? buffer.byteLength : 'null')
      
      if (!buffer) {
        throw new Error('Failed to generate audio file - no buffer created')
      }
      
      // Pass the audio buffer to the parent component for Whisper processing
      const audioFileName = `${file.name.replace(/\.[^/.]+$/, '')}.wav`
      
      if (onAudioExtracted) {
        onAudioExtracted(buffer, audioFileName)
        console.log('Audio extraction completed successfully, passed to parent component')
      }
      
      // If transcription callback is provided, automatically transcribe
      if (onTranscriptionComplete) {
        await transcribeAudio(buffer, audioFileName)
      }
      
      // If no callbacks provided, fallback to download
      if (!onAudioExtracted && !onTranscriptionComplete) {
        const blob = new Blob([buffer], { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = audioFileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        console.log('Audio extraction completed successfully, downloaded')
      }

    } catch (error) {
      console.error('Error extracting audio:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Failed to extract audio: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('video/')) {
      extractAudio(file)
    }
  }

  return (
    <div className="p-4">
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        disabled={isLoading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      
      {isLoading && (
        <div className="mt-2 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Extracting audio...</span>
        </div>
      )}
      
      {isTranscribing && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
            <span>{transcriptionProgress || 'Transcribing with Whisper...'}</span>
          </div>
          
          {totalChunks > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedChunks / totalChunks) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
      
      {/* Start Transcription Button */}
      {audioChunks.length > 0 && !isTranscribing && (
        <div className="mt-3">
          <button
            onClick={startTranscription}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Start Transcription ({audioChunks.length} chunks)
          </button>
        </div>
      )}

      {/* Chunk Preview */}
      {chunks.length > 0 && (
        <div className="mt-3 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Chunk Preview:</h4>
          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
            {chunks.map((chunk) => (
              <div 
                key={chunk.index}
                className={`flex items-center justify-between p-2 rounded-md text-xs border ${
                  chunk.status === 'pending' ? 'bg-gray-50 border-gray-200' :
                  chunk.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                  chunk.status === 'completed' ? 'bg-green-50 border-green-200' :
                  'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    chunk.status === 'pending' ? 'bg-gray-400' :
                    chunk.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                    chunk.status === 'completed' ? 'bg-green-500' :
                    'bg-red-500'
                  }`}></div>
                  <span className="font-mono text-xs">
                    Part {chunk.index + 1} ({chunk.index * 30}s-{(chunk.index + 1) * 30}s)
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Audio Preview Button */}
                  {chunk.audioUrl && (
                    <button
                      onClick={async () => {
                        try {
                          console.log(`Playing chunk ${chunk.index + 1}, URL:`, chunk.audioUrl)
                          
                          // Check if URL is still valid
                          if (!chunk.audioUrl || chunk.audioUrl.startsWith('blob:') === false) {
                            console.error('Invalid audio URL:', chunk.audioUrl)
                            return
                          }
                          
                          const audio = new Audio(chunk.audioUrl)
                          
                          // Add error handling
                          audio.onerror = (e) => {
                            console.error(`Audio playback error for chunk ${chunk.index + 1}:`, e)
                            console.error('Audio URL:', chunk.audioUrl)
                            console.error('Audio src:', audio.src)
                          }
                          
                          audio.onloadstart = () => {
                            console.log(`Started loading chunk ${chunk.index + 1}`)
                          }
                          
                          audio.oncanplay = () => {
                            console.log(`Can play chunk ${chunk.index + 1}`)
                          }
                          
                          await audio.play()
                          console.log(`Successfully started playing chunk ${chunk.index + 1}`)
                        } catch (error) {
                          console.error(`Failed to play chunk ${chunk.index + 1}:`, error)
                          console.error('Chunk details:', {
                            index: chunk.index,
                            size: chunk.size,
                            url: chunk.audioUrl,
                            fileName: chunk.fileName
                          })
                          
                          // Try to recreate the audio URL and play again
                          console.log(`Attempting to recreate audio URL for chunk ${chunk.index + 1}...`)
                          const newUrl = recreateAudioUrl(chunk)
                          if (newUrl) {
                            try {
                              const newAudio = new Audio(newUrl)
                              await newAudio.play()
                              console.log(`Successfully played chunk ${chunk.index + 1} with recreated URL`)
                            } catch (retryError) {
                              console.error(`Still failed to play chunk ${chunk.index + 1} after recreating URL:`, retryError)
                            }
                          }
                        }
                      }}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                      title="Play audio preview"
                    >
                      <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                  
                  <span className="text-gray-500">
                    {(chunk.size / (1024 * 1024)).toFixed(1)}MB
                  </span>
                  <span className={`text-xs font-medium ${
                    chunk.status === 'pending' ? 'text-gray-500' :
                    chunk.status === 'processing' ? 'text-blue-600' :
                    chunk.status === 'completed' ? 'text-green-600' :
                    'text-red-600'
                  }`}>
                    {chunk.status === 'pending' ? 'Pending' :
                     chunk.status === 'processing' ? 'Processing...' :
                     chunk.status === 'completed' ? 'Done' :
                     'Error'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}