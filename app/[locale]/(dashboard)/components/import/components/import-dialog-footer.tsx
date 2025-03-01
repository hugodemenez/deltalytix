'use client'

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { ImportType } from "../import-type-selection"

interface ImportDialogFooterProps {
  step: number
  importType: ImportType
  onBack: () => void
  onNext: () => void
  isSaving: boolean
  isNextDisabled?: boolean
}

export function ImportDialogFooter({
  step,
  importType,
  onBack,
  onNext,
  isSaving,
  isNextDisabled
}: ImportDialogFooterProps) {
  const t = useI18n()

  const getNextButtonText = () => {
    if (isSaving) return t('import.button.saving')
    if (step === 4 || (step === 3 && importType === 'rithmic-orders')) {
      return t('import.button.save')
    }
    return t('import.button.next')
  }

  return (
    <div className="flex-none p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-[68px]">
      <div className="flex justify-end items-center gap-4">
        {step > 0 && (
          <Button 
            variant="outline" 
            onClick={onBack}
            className="w-fit min-w-[100px]"
          >
            {t('import.button.back')}
          </Button>
        )}
        <Button 
          onClick={onNext}
          className={cn(
            "w-fit min-w-[100px]",
            (step === 0 && importType === 'rithmic-sync') && "invisible"
          )}
          disabled={isNextDisabled}
        >
          {getNextButtonText()}
        </Button>
      </div>
    </div>
  )
} 