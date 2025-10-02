"use client"

import { useRef, useState, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react'

interface AudioPlayerProps {
  audioBuffer: ArrayBuffer
  fileName: string
  className?: string
}

export function AudioPlayer({ audioBuffer, fileName, className = "" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Create audio URL from buffer
  useEffect(() => {
    if (audioBuffer) {
      const blob = new Blob([audioBuffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      
      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [audioBuffer])

  // Initialize audio element
  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      const handleLoadedMetadata = () => {
        setDuration(audio.duration)
        setIsLoading(false)
      }

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
      }

      const handleEnded = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }

      const handlePlay = () => setIsPlaying(true)
      const handlePause = () => setIsPlaying(false)

      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('play', handlePlay)
      audio.addEventListener('pause', handlePause)

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('play', handlePlay)
        audio.removeEventListener('pause', handlePause)
        audio.pause()
      }
    }
  }, [audioUrl])

  const togglePlayPause = async () => {
    if (!audioRef.current) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        setIsLoading(true)
        await audioRef.current.play()
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      setIsLoading(false)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    
    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    audioRef.current.volume = newVolume
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    
    if (isMuted) {
      audioRef.current.volume = volume
      setIsMuted(false)
    } else {
      audioRef.current.volume = 0
      setIsMuted(true)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleDownload = () => {
    if (!audioBuffer) return
    
    const blob = new Blob([audioBuffer], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!audioUrl) {
    return (
      <div className={`p-4 bg-gray-50 dark:bg-gray-900 rounded-lg ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          No audio file loaded
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <div className="space-y-4">
        {/* File name */}
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {fileName}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            disabled={!duration}
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause button */}
            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="p-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>

            {/* Volume controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="p-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-full transition-colors"
            title="Download audio file"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Duration info */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(duration)}
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  )
}
