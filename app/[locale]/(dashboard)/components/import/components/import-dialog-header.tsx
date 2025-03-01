'use client'

import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { ImportType } from "../import-type-selection"

interface ImportDialogHeaderProps {
  step: number
  importType: ImportType
}

export function ImportDialogHeader({ step, importType }: ImportDialogHeaderProps) {
  const t = useI18n()

  const getDialogTitle = () => {
    switch (step) {
      case 0:
        return t('import.title.selectType')
      case 1:
        return importType === 'rithmic-sync' ? t('import.title.connect') : t('import.title.upload')
      case 2:
        return importType === 'rithmic-sync' ? t('import.title.syncSettings') : t('import.title.selectHeader')
      case 3:
        return importType === 'rithmic-orders' ? t('import.title.processOrders') : t('import.title.mapColumns')
      case 4:
        return t('import.title.selectAccount')
      default:
        return ''
    }
  }

  const getDialogDescription = () => {
    switch (step) {
      case 0:
        return t('import.description.selectType')
      case 1:
        return importType === 'rithmic-sync' ? t('import.description.connect') : t('import.description.upload')
      case 2:
        return importType === 'rithmic-sync' ? t('import.description.syncSettings') : t('import.description.selectHeader')
      case 3:
        return importType === 'rithmic-orders' ? t('import.description.processOrders') : t('import.description.mapColumns')
      case 4:
        return t('import.description.selectAccount')
      default:
        return ''
    }
  }

  const totalSteps = importType === 'rithmic-orders' ? 3 : importType === 'rithmic-sync' ? 2 : 4

  return (
    <DialogHeader className="flex-none p-6 border-b space-y-4">
      <DialogTitle>{getDialogTitle()}</DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground">
        {getDialogDescription()}
      </DialogDescription>
      <div className="space-y-2">
        <div className="w-full bg-secondary h-2 rounded-full">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <div className={cn("transition-colors", step >= 0 && "text-primary font-medium")}>
            {t('import.step.importType')}
          </div>
          {importType === 'rithmic-sync' ? (
            <>
              <div className={cn("transition-colors", step >= 1 && "text-primary font-medium")}>
                {t('import.step.connect')}
              </div>
              <div className={cn("transition-colors", step >= 2 && "text-primary font-medium")}>
                {t('import.step.settings')}
              </div>
            </>
          ) : (
            <>
              <div className={cn("transition-colors", step >= 1 && "text-primary font-medium")}>
                {t('import.step.upload')}
              </div>
              <div className={cn("transition-colors", step >= 2 && "text-primary font-medium")}>
                {t('import.step.headers')}
              </div>
              <div className={cn("transition-colors", step >= 3 && "text-primary font-medium")}>
                {importType === 'rithmic-orders' ? t('import.step.process') : t('import.step.mapColumns')}
              </div>
              {importType !== 'rithmic-orders' && (
                <div className={cn("transition-colors", step >= 4 && "text-primary font-medium")}>
                  {t('import.step.account')}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DialogHeader>
  )
} 