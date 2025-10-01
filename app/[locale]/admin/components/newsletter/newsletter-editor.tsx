"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { sendNewsletter } from "@/app/[locale]/admin/actions/newsletter"
import { useNewsletter } from "./newsletter-context"
import { Loader2, Sparkles, Upload } from "lucide-react"
import { generateNewsletterContent } from "../../actions/generate-newsletter"
import { generateTranscriptSummary } from "../../actions/youtube"
import type { NewsletterContent } from "./newsletter-context"
import { extractYouTubeId } from "../../utils/youtube"
import { fetchTranscriptServer } from "../../actions/youtube"
import { AudioExtractor } from "./newsletter-audio-extractor"
import { AudioSplitter } from "./newsletter-audio-splitter"

export function NewsletterEditor() {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const { content, setContent } = useNewsletter()
  const [description, setDescription] = useState("")
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false)

  // Automatically fetch and set transcript when URL changes
  useEffect(() => {
    const fetchTranscript = async () => {
      const videoId = extractYouTubeId(youtubeUrl)
      if (!videoId) return

      try {
        setIsLoadingTranscript(true)
        const transcript = await fetchTranscriptServer(videoId)
        console.log(transcript)

        if (transcript) {
          // Generate summary from transcript
          const summary = await generateTranscriptSummary(transcript)
          console.log(summary)
          if (summary) {
            setDescription(summary)
          } else {
            toast.error("Impossible de générer le résumé de la vidéo")
          }
        } else {
          toast.error("Impossible de récupérer la transcription de la vidéo")
        }
      } catch (error) {
        console.error('Error fetching transcript:', error)
        toast.error("Erreur lors de la récupération de la transcription")
      } finally {
        setIsLoadingTranscript(false)
      }
    }

    if (youtubeUrl) {
      fetchTranscript()
    }
  }, [youtubeUrl])

  const handleGenerate = async () => {
    const videoId = extractYouTubeId(youtubeUrl)
    if (!videoId) {
      toast.error("Veuillez entrer une URL YouTube valide")
      return
    }

    try {
      setGenerating(true)
      // Update the video ID in the content
      setContent((prev) => ({ ...prev, youtubeId: videoId }))
      
      const result = await generateNewsletterContent({
        youtubeUrl: `https://youtube.com/watch?v=${videoId}`,
        description
      })

      if (result.success && result.content) {
        setContent((prev: NewsletterContent) => ({
          ...prev,
          youtubeId: videoId,
          subject: result.content.subject,
          introMessage: result.content.introMessage,
          features: result.content.features
        }))
        toast.success("Newsletter générée avec succès!")
      } else {
        console.error('Newsletter generation failed:', result)
        toast.error("Échec de la génération du contenu")
      }
    } catch (error) {
      console.error('Error generating newsletter:', error)
      toast.error("Une erreur est survenue lors de la génération")
    } finally {
      setGenerating(false)
    }
  }

  const handleSend = async () => {
    if (generating || loading) return

    // Store current content in case we need to restore it
    const currentContent = { ...content }
    
    setLoading(true)
    try {
      const result = await sendNewsletter(currentContent)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      
      // Ensure content is still the same after server action
      setContent(currentContent)
      toast.success("Newsletter envoyée avec succès")
    } catch (error) {
      // Restore content in case of error
      setContent(currentContent)
      toast.error(error instanceof Error ? error.message : "Échec de l'envoi de la newsletter")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-white dark:bg-black border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">Composer une Newsletter</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="youtubeUrl" className="text-gray-700 dark:text-gray-300">URL de la vidéo YouTube</Label>
            <Input
              id="youtubeUrl"
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              placeholder="ex: https://youtube.com/watch?v=dQw4w9WgXcQ"
              required
              className="bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <AudioExtractor 
            onAudioExtracted={(audioBuffer, fileName) => {
              // Audio extracted, but no transcription here
              toast.success(`Audio extracted from ${fileName}`)
            }}
          />

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">Audio Splitter (10-second segments)</Label>
            <AudioSplitter 
              onSegmentsCreated={(segments) => {
                toast.success(`Created ${segments.length} audio segments`)
                console.log('Audio segments created:', segments)
              }}
              onTranscriptionComplete={(transcriptions) => {
                toast.success(`Transcription completed: ${transcriptions.length} segments`)
                console.log('Transcriptions completed:', transcriptions)
                // You can use these transcriptions to populate the description field
                const fullText = transcriptions
                  .sort((a, b) => a.segmentIndex - b.segmentIndex)
                  .map(t => t.text)
                  .join(' ')
                setDescription(fullText)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">
              Sur quoi as-tu travaillé ?
              {isLoadingTranscript && " (Chargement de la transcription...)"}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Décris ce sur quoi tu as travaillé dans cette vidéo. Par exemple: 'J'ai implémenté une nouvelle fonctionnalité de gestion des trades avec des graphiques interactifs...'"
              required
              className="min-h-[100px] bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled={isLoadingTranscript}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
              onClick={handleGenerate}
              disabled={generating || loading || !youtubeUrl || !description}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer & Prévisualiser
                </>
              )}
            </Button>

            <Button 
              type="button"
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white"
              onClick={handleSend}
              disabled={loading || generating || !content.subject}
            >
              {loading ? "Envoi..." : "Envoyer la Newsletter"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 