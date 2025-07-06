'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { useAnalysis } from "@/hooks/use-analysis"
import { useAnalysisStore } from "@/store/analysis-store"
import { AnalysisSkeleton } from "./analysis-skeleton"
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  BarChart3, 
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  Trash2
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"

interface AnalysisSection {
  title: string
  description: string
  insights: AnalysisInsight[]
  score: number
  trend: 'up' | 'down' | 'neutral'
  recommendations: string[]
}

interface AnalysisInsight {
  type: 'positive' | 'negative' | 'neutral'
  message: string
  metric?: string
}

export function AnalysisOverview() {
  const t = useI18n()
  const currentLocale = useCurrentLocale()
  const { analyzeSection, analyzeSectionDirect, isLoading, error, completionError } = useAnalysis()
  const { getSectionData, getLastUpdated, clearCache } = useAnalysisStore()
  
  // Rate limiting state
  const [lastRequestTime, setLastRequestTime] = useState<number>(0)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const RATE_LIMIT_MS = 2000 // 2 seconds between requests
  
  // Check if any loading is in progress
  const hasAnyLoading = Object.values(isLoading).some(Boolean)
  
  // Rate limiting check
  const checkRateLimit = useCallback(() => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime
    return timeSinceLastRequest < RATE_LIMIT_MS
  }, [lastRequestTime])
  
  // Reset rate limit after timeout
  useEffect(() => {
    if (isRateLimited) {
      const timeout = setTimeout(() => {
        setIsRateLimited(false)
      }, RATE_LIMIT_MS)
      return () => clearTimeout(timeout)
    }
  }, [isRateLimited])
  


  const sectionConfigs = [
    {
      key: 'global' as const,
      title: t('analysis.global.title'),
      description: t('analysis.global.description'),
      icon: BarChart3
    },
    {
      key: 'instrument' as const,
      title: t('analysis.instrument.title'),
      description: t('analysis.instrument.description'),
      icon: Target
    },
    {
      key: 'accounts' as const,
      title: t('analysis.accounts.title'),
      description: t('analysis.accounts.description'),
      icon: Activity
    },
    {
      key: 'timeOfDay' as const,
      title: t('analysis.timeOfDay.title'),
      description: t('analysis.timeOfDay.description'),
      icon: Clock
    }
  ]

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getInsightIcon = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'negative':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }



  const handleAnalyzeSection = useCallback((section: 'global' | 'instrument' | 'accounts' | 'timeOfDay') => {
    if (checkRateLimit()) {
      setIsRateLimited(true)
      return
    }
    
    console.log(`Starting analysis for section: ${section}`)
    setLastRequestTime(Date.now())
    analyzeSection(section, currentLocale)
  }, [checkRateLimit, currentLocale, analyzeSection])

  const handleClearCache = useCallback(() => {
    if (hasAnyLoading) return
    clearCache()
  }, [hasAnyLoading, clearCache])

  const handleAnalyzeAllSections = useCallback(() => {
    if (checkRateLimit()) {
      setIsRateLimited(true)
      return
    }
    
    console.log('Starting analysis for all sections in parallel')
    setLastRequestTime(Date.now())
    
    // Start all sections in parallel using direct API calls
    sectionConfigs.forEach((config) => {
      analyzeSectionDirect(config.key, currentLocale)
    })
  }, [checkRateLimit, currentLocale, analyzeSectionDirect, sectionConfigs])
  


  // Show error if there's a completion error
  if (completionError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('analysis.title')}</h2>
            <p className="text-muted-foreground">{t('analysis.description')}</p>
          </div>
        </div>
        
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              {t('analysis.error')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 dark:text-red-400">
              {completionError.message || t('analysis.errorGeneric')}
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="mt-4"
              variant="outline"
            >
              {t('analysis.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('analysis.title')}</h2>
          <p className="text-muted-foreground">{t('analysis.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleClearCache}
            variant="ghost"
            size="sm"
            title={t('analysis.clearCache')}
            disabled={hasAnyLoading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            {getLastUpdated() ? t('analysis.lastUpdated', { date: new Date(getLastUpdated()!).toLocaleDateString() }) : t('analysis.notAnalyzed')}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sectionConfigs.map((config) => {
          const sectionData = getSectionData(config.key)
          const Icon = config.icon
          const isCurrentlyLoading = isLoading[config.key]
          
          // Debug logging
          console.log(`Section ${config.key}:`, { isCurrentlyLoading, hasData: !!sectionData })
          
          // Show skeleton loader if currently loading
          if (isCurrentlyLoading) {
            return (
              <AnalysisSkeleton
                key={config.key}
                icon={Icon}
                title={config.title}
                description={config.description}
              />
            )
          }
          
          return (
            <Card key={config.key} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {config.title}
                    </CardTitle>
                    <CardDescription>{config.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {sectionData && (
                      <>
                        {getTrendIcon(sectionData.trend)}
                        <span className={`text-lg font-semibold ${getScoreColor(sectionData.score)}`}>
                          {sectionData.score}/100
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {sectionData && <Progress value={sectionData.score} className="w-full" />}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {sectionData ? (
                  <>
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">{t('analysis.keyInsights')}</h4>
                      {sectionData.insights.map((insight, insightIndex) => (
                        <div key={insightIndex} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          {getInsightIcon(insight.type)}
                          <div className="flex-1">
                            <p className="text-sm">{insight.message}</p>
                            {insight.metric && (
                              <Badge variant="outline" className="mt-1">
                                {insight.metric}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">{t('analysis.recommendations')}</h4>
                      <div className="space-y-2">
                        {sectionData.recommendations.map((rec, recIndex) => (
                          <div key={recIndex} className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                            <p className="text-sm text-muted-foreground">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      {error[config.key] || t('analysis.noData')}
                    </p>
                    <Button
                      onClick={() => handleAnalyzeSection(config.key)}
                      disabled={isCurrentlyLoading || isRateLimited}
                    >
                      {isCurrentlyLoading ? t('analysis.loading') : t('analysis.generate')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
} 