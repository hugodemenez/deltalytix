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
  inline?: boolean
}

export function ImportDialogHeader({ step, importType, inline = false }: ImportDialogHeaderProps) {
  const t = useI18n()
  const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
  if (!platform) return null

  const visibleSteps = inline
    ? platform.steps.filter((s) => s.id !== 'select-import-type')
    : platform.steps
  const currentStep = platform.steps.find(s => s.id === step)
  const currentStepIndex = visibleSteps.findIndex(s => s.id === step)
  const totalSteps = visibleSteps.length

  if (inline) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-normal tracking-tight md:text-2xl">
            {t((currentStep?.title || 'import.title') as any, { count: 1 })}
          </h3>
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-black/55 dark:text-white/55 md:text-base">
            {t((currentStep?.description || 'import.description') as any, { count: 1 })}
          </p>
        </div>
        <div className="space-y-2">
          <div className="h-px w-full bg-black/10 dark:bg-white/10">
            <div
              className="h-px bg-[oklch(0.22_0.01_95)] transition-all duration-150 dark:bg-[oklch(0.94_0.01_95)]"
              style={{
                width: `${totalSteps > 1 ? (Math.max(currentStepIndex, 0) / (totalSteps - 1)) * 100 : 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between gap-2 overflow-x-auto text-xs text-black/45 dark:text-white/45">
            {visibleSteps.map((s, index) => (
              <div
                key={s.id}
                className={cn(
                  "shrink-0 whitespace-nowrap transition-colors duration-150",
                  currentStepIndex >= index && "text-black dark:text-white"
                )}
              >
                {t(s.title as any, { count: 1 })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <DialogHeader className="flex-none space-y-3 border-b p-4 sm:space-y-4 sm:p-6">
      <DialogTitle className="pr-8 text-base sm:text-lg">{t((currentStep?.title || 'import.title') as any, { count: 1 })}</DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground">
        {t((currentStep?.description || 'import.description') as any, { count: 1 })}
      </DialogDescription>
      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-secondary">
          <div 
            className="h-2 rounded-full bg-primary transition-all duration-300 ease-in-out"
            style={{ 
              width: `${totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 100}%`
            }}
          />
        </div>
        <div className="text-xs font-medium text-primary md:hidden">
          {t((currentStep?.title || 'import.title') as any, { count: 1 })}
          <span className="font-normal text-muted-foreground">
            {' '}({currentStepIndex + 1}/{totalSteps})
          </span>
        </div>
        <div className="hidden justify-between gap-2 overflow-x-auto px-1 text-xs text-muted-foreground md:flex">
          {visibleSteps.map((s, index) => (
            <div 
              key={s.id}
              className={cn(
                "shrink-0 whitespace-nowrap transition-colors",
                currentStepIndex >= index && "text-primary"
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
