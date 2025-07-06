import { useCallback, useRef } from 'react'
import { useAnalysisStore } from '@/store/analysis-store'
import { useCompletion } from '@ai-sdk/react'

export type AnalysisSection = 'global' | 'instrument' | 'accounts' | 'timeOfDay'

export function useAnalysis() {
  const {
    setSectionData,
    setLoading,
    setError,
    isLoading,
    error,
    getSectionData,
    getSummary,
    getLastUpdated
  } = useAnalysisStore()

  // Track the current section being analyzed
  const currentSectionRef = useRef<AnalysisSection | null>(null)

  const {
    complete,
    completion,
    isLoading: isCompleting,
    error: completionError
  } = useCompletion({
    api: '/api/ai/analysis',
    onFinish: (prompt, completion) => {
      try {
        // Try to parse the completion as JSON
        const parsedData = JSON.parse(completion)
        
        // Use the tracked current section instead of trying to parse the title
        const section = currentSectionRef.current || 'global'
        
        // Store the parsed data
        setSectionData(section, parsedData)
        setLoading(section, false)
        
        // Clear the current section ref
        currentSectionRef.current = null
      } catch (parseError) {
        console.error('Failed to parse analysis response:', parseError)
        const section = currentSectionRef.current || 'global'
        setError(section, 'Failed to parse analysis response')
        setLoading(section, false)
        currentSectionRef.current = null
      }
    },
    onError: (error) => {
      console.error('Analysis completion error:', error)
      const section = currentSectionRef.current || 'global'
      setError(section, error.message || 'Analysis failed')
      setLoading(section, false)
      currentSectionRef.current = null
    }
  })

  const analyzeSection = useCallback(async (section: AnalysisSection, locale: string = 'en', timezone: string = 'UTC') => {
    setLoading(section, true)
    setError(section, null)
    
    // Track the current section being analyzed
    currentSectionRef.current = section

    try {
      await complete('', {
        body: {
          section,
          locale,
          timezone
        }
      })
    } catch (error) {
      console.error(`Error analyzing ${section}:`, error)
      setError(section, error instanceof Error ? error.message : 'Analysis failed')
      setLoading(section, false)
      currentSectionRef.current = null
    }
  }, [complete, setLoading, setError])

  const analyzeAllSections = useCallback(async (locale: string = 'en', timezone: string = 'UTC') => {
    const sections: AnalysisSection[] = ['global', 'instrument', 'accounts', 'timeOfDay']
    
    // Analyze sections sequentially to avoid overwhelming the API
    for (const section of sections) {
      await analyzeSection(section, locale, timezone)
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }, [analyzeSection])

  return {
    // Actions
    analyzeSection,
    analyzeAllSections,
    
    // State
    isLoading,
    error,
    isCompleting,
    completionError,
    
    // Data
    getSectionData,
    getSummary,
    getLastUpdated,
    
    // Raw completion data (for debugging)
    completion
  }
} 