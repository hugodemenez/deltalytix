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

  // Combine store loading state with completion loading state
  const combinedLoading = {
    global: isLoading.global || (isCompleting && currentSectionRef.current === 'global'),
    instrument: isLoading.instrument || (isCompleting && currentSectionRef.current === 'instrument'),
    accounts: isLoading.accounts || (isCompleting && currentSectionRef.current === 'accounts'),
    timeOfDay: isLoading.timeOfDay || (isCompleting && currentSectionRef.current === 'timeOfDay')
  }

  const analyzeSection = useCallback(async (section: AnalysisSection, locale: string = 'en', timezone: string = 'UTC') => {
    // Set loading state first
    setLoading(section, true)
    setError(section, null)
    
    // Track the current section being analyzed
    currentSectionRef.current = section

    try {
      // Call the completion API
      const result = await complete('', {
        body: {
          section,
          locale,
          timezone
        }
      })
      
      // If the completion was successful but no onFinish was called, handle it here
      if (result && !getSectionData(section)) {
        setLoading(section, false)
        currentSectionRef.current = null
      }
    } catch (error) {
      console.error(`Error analyzing ${section}:`, error)
      setError(section, error instanceof Error ? error.message : 'Analysis failed')
      setLoading(section, false)
      currentSectionRef.current = null
    }
  }, [complete, setLoading, setError, getSectionData])

  // New function for parallel analysis using direct API calls
  const analyzeSectionDirect = useCallback(async (section: AnalysisSection, locale: string = 'en', timezone: string = 'UTC') => {
    // Set loading state first
    setLoading(section, true)
    setError(section, null)

    try {
      // Make direct API call instead of using useCompletion
      const response = await fetch('/api/ai/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section,
          locale,
          timezone
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let result = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        result += chunk
      }

      // Parse the result
      try {
        const parsedData = JSON.parse(result)
        setSectionData(section, parsedData)
      } catch (parseError) {
        console.error(`Failed to parse analysis response for ${section}:`, parseError)
        setError(section, 'Failed to parse analysis response')
      }
    } catch (error) {
      console.error(`Error analyzing ${section}:`, error)
      setError(section, error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setLoading(section, false)
    }
  }, [setLoading, setError, setSectionData])

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
    analyzeSectionDirect,
    analyzeAllSections,
    
    // State
    isLoading: combinedLoading,
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