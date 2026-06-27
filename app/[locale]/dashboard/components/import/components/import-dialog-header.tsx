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
    <DialogHeader className="flex-none p-4 sm:p-6 border-b space-y-3 sm:space-y-4">
      <DialogTitle className="text-base sm:text-lg pr-8">{t((currentStep?.title || 'import.title') as any, { count: 1 })}</DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground">
        {t((currentStep?.description || 'import.description') as any, { count: 1 })}
      </DialogDescription>
      <div className="space-y-2">
        <div className="w-full bg-secondary h-2 rounded-full">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ 
              width: `${totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 100}%`
            }}
          />
        </div>
        <div className="md:hidden text-xs text-primary font-medium">
          {t((currentStep?.title || 'import.title') as any, { count: 1 })}
          <span className="text-muted-foreground font-normal">
            {' '}({currentStepIndex + 1}/{totalSteps})
          </span>
        </div>
        <div className="hidden md:flex justify-between text-xs text-muted-foreground px-1 gap-2 overflow-x-auto">
          {platform.steps.map((s, index) => (
            <div 
              key={s.id}
              className={cn(
                "transition-colors whitespace-nowrap shrink-0",
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