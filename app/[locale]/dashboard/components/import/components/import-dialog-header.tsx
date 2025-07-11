'use client'

import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { platforms } from "../config/platforms"
import { ImportType } from "../import-type-selection"
import { Step } from "../import-button"

interface ImportDialogHeaderProps {
  step: Step
  importType: ImportType
}

export function ImportDialogHeader({ step, importType }: ImportDialogHeaderProps) {
  const t = useI18n()
  const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
  if (!platform) return null

  const currentStep = platform.steps.find(s => s.id === step)
  const currentStepIndex = platform.steps.findIndex(s => s.id === step)
  const totalSteps = platform.steps.length

  return (
    <DialogHeader className="flex-none p-6 border-b space-y-4">
      <DialogTitle>{t((currentStep?.title || 'import.title') as any, { count: 1 })}</DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground">
        {t((currentStep?.description || 'import.description') as any, { count: 1 })}
      </DialogDescription>
      <div className="space-y-2">
        <div className="w-full bg-secondary h-2 rounded-full">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ 
              width: `${(currentStepIndex / (totalSteps - 1)) * 100}%`
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          {platform.steps.map((s, index) => (
            <div 
              key={s.id}
              className={cn(
                "transition-colors whitespace-nowrap",
                currentStepIndex >= index && "text-primary font-medium"
              )}
            >
              {t(s.title as any, { count: 1 })}
            </div>
          ))}
        </div>
      </div>
    </DialogHeader>
  )
} 