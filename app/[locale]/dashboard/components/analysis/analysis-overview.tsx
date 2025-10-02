'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import {
  Clock,
  Trash2
} from "lucide-react"
import { AccountsAnalysis } from "./accounts-analysis"

export function AnalysisOverview() {
  const t = useI18n()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-primary">{t('analysis.title')}</h2>
          <p className="text-base text-muted-foreground">{t('analysis.description')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => { }}
            variant="ghost"
            size="default"
            title={t('analysis.clearCache')}
            disabled={false}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {false ? t('analysis.lastUpdated', { date: new Date().toLocaleDateString() }) : t('analysis.notAnalyzed')}
          </Badge>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-1">
        <AccountsAnalysis/>
      </div>
    </div>
  )
} 