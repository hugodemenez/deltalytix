// components/newsletter-transcription.tsx
"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Mic, FileText, Download, Copy, Check } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { toast } from 'sonner'

interface AudioSegment {
  buffer: ArrayBuffer
  fileName: string
  startTime: number
  endTime: number
  index: number
}

interface TranscriptionResult {
  text: string
  language: string
  duration: number
  segmentIndex: number
}

interface TranscriptionComponentProps {
  segments: AudioSegment[]
  onTranscriptionComplete?: (results: TranscriptionResult[]) => void
}

export function TranscriptionComponent({ segments, onTranscriptionComplete }: TranscriptionComponentProps) {
  const t = useI18n()
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionResults, setTranscriptionResults] = useState<TranscriptionResult[]>([])
  const [progress, setProgress] = useState(0)
  const [currentSegment, setCurrentSegment] = useState<number | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const transcribeAllSegments = async () => {
    if (segments.length === 0) return

    try {
      setIsTranscribing(true)
      setProgress(0)
      setTranscriptionResults([])

      const results: TranscriptionResult[] = []

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        setCurrentSegment(i + 1)
        
        try {
          // Convert ArrayBuffer to Blob for API call
          const audioBlob = new Blob([segment.buffer], { type: 'audio/wav' })
          
          // Create FormData for the API call
          const formData = new FormData()
          formData.append('audio', audioBlob, `segment_${segment.index}.wav`)

          // Call the transcription API
          const response = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
          }

          const data = await response.json()
          
          // Calculate duration (approximate based on buffer size)
          const duration = segment.buffer.byteLength / (16000 * 2) // Assuming 16kHz, 16-bit audio

          const result: TranscriptionResult = {
            text: data.transcription || 'Transcription non disponible',
            language: 'fr',
            duration,
            segmentIndex: segment.index
          }

          results.push(result)
          
          // Update progress
          const progressPercent = ((i + 1) / segments.length) * 100
          setProgress(progressPercent)
          
        } catch (segmentError) {
          console.error(`Failed to transcribe segment ${segment.index}:`, segmentError)
          
          // Add error result
          const errorResult: TranscriptionResult = {
            text: 'Erreur de transcription',
            language: 'fr',
            duration: 0,
            segmentIndex: segment.index
          }
          results.push(errorResult)
        }
      }

      setTranscriptionResults(results)
      
      if (onTranscriptionComplete) {
        onTranscriptionComplete(results)
      }

      toast.success(`Transcription terminée: ${results.length} segments traités`)
    } catch (error) {
      console.error('Transcription failed:', error)
      toast.error('Échec de la transcription')
    } finally {
      setIsTranscribing(false)
      setCurrentSegment(null)
    }
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast.success('Texte copié dans le presse-papiers')
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
      toast.error('Échec de la copie')
    }
  }

  const downloadTranscription = () => {
    if (transcriptionResults.length === 0) return

    const fullText = transcriptionResults
      .sort((a, b) => a.segmentIndex - b.segmentIndex)
      .map(result => `Segment ${result.segmentIndex} (${result.duration.toFixed(1)}s): ${result.text}`)
      .join('\n\n')

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transcription_complete.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getTotalDuration = () => {
    return transcriptionResults.reduce((total, result) => total + result.duration, 0)
  }

  if (segments.length === 0) {
    return (
      <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6 text-center">
          <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Aucun segment audio disponible pour la transcription
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-black border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Mic className="w-5 h-5" />
          Transcription Audio (Français)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="default">
              Prêt
            </Badge>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {segments.length} segments disponibles
            </span>
          </div>
          
          <Button
            onClick={transcribeAllSegments}
            disabled={isTranscribing}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Transcription...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Transcrire tous les segments
              </>
            )}
          </Button>
        </div>

        {/* Progress */}
        {isTranscribing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {currentSegment ? `Segment ${currentSegment}/${segments.length}` : 'Préparation...'}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Transcription Results */}
        {transcriptionResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Résultats de transcription
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {getTotalDuration().toFixed(1)}s total
                </Badge>
                <Button
                  onClick={downloadTranscription}
                  variant="outline"
                  size="sm"
                  className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transcriptionResults
                .sort((a, b) => a.segmentIndex - b.segmentIndex)
                .map((result) => (
                  <div
                    key={result.segmentIndex}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            Segment {result.segmentIndex}
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {result.duration.toFixed(1)}s
                          </span>
                        </div>
                        <p className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed">
                          {result.text || "Aucune transcription disponible"}
                        </p>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(result.text, result.segmentIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {copiedIndex === result.segmentIndex ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
