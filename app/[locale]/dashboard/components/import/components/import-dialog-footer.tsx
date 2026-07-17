'use client'

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { ImportType } from "../import-type-selection"
import { platforms } from "../config/platforms"
import { Step } from "../import-button"

interface ImportDialogFooterProps {
  step: Step
  importType: ImportType
  onBack: () => void
  onNext: () => void
  isSaving: boolean
  isNextDisabled?: boolean
  canGoBack?: boolean
  inline?: boolean
}

export function ImportDialogFooter({
  step,
  importType,
  onBack,
  onNext,
  isSaving,
  isNextDisabled,
  canGoBack,
  inline = false,
}: ImportDialogFooterProps) {
  const t = useI18n()
  const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
  if (!platform) return null

  const currentStep = platform.steps.find(s => s.id === step)
  if (!currentStep) return null

  const currentStepIndex = platform.steps.findIndex(s => s.id === step)
  const showBack = canGoBack ?? currentStepIndex > 0

  const getNextButtonText = () => {
    if (isSaving) return t('import.button.saving')
    if (currentStep.isLastStep) {
      return t('import.button.save')
    }
    return t('import.button.next')
  }

  if (inline) {
    return (
      <div className="flex items-center justify-end gap-3 border-t border-black/10 pt-6 dark:border-white/10">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-sm border border-black/20 px-6 text-sm font-medium transition-[opacity,transform,background-color] duration-150 hover:bg-black/5 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/5"
          >
            {t('import.button.back')}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={isNextDisabled || isSaving}
          className={cn(
            "inline-flex h-11 items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]",
            currentStepIndex === 0 &&
              (importType === 'rithmic-sync' ||
                importType === 'tradovate-sync' ||
                importType === 'dxfeed-sync') &&
              "invisible"
          )}
        >
          {getNextButtonText()}
        </button>
      </div>
    )
  }

  return (
    <div className="flex-none border-t bg-background/95 p-3 backdrop-blur-sm supports-backdrop-filter:bg-background/60 sm:p-4">
      <div className="flex items-center justify-end gap-2 sm:gap-4">
        {showBack && (
          <Button 
            variant="outline" 
            onClick={onBack}
            disabled={isSaving}
            className="w-fit min-w-[80px] sm:min-w-[100px]"
          >
            {t('import.button.back')}
          </Button>
        )}
        <Button 
          onClick={onNext}
          className={cn(
            "w-fit min-w-[80px] sm:min-w-[100px]",
            (currentStepIndex === 0 && (importType === 'rithmic-sync' || importType === 'tradovate-sync' || importType === 'dxfeed-sync')) && "invisible"
          )}
          disabled={isNextDisabled || isSaving}
        >
          {getNextButtonText()}
        </Button>
      </div>
    </div>
  )
}
