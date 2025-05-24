'use client'

import React, { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { UploadIcon, type UploadIconHandle } from '@/components/animated-icons/upload'
import { Trade } from '@prisma/client'
import { saveTrades } from '@/server/database'
import ImportTypeSelection, { ImportType } from './import-type-selection'
import FileUpload from './file-upload'
import HeaderSelection from './header-selection'
import AccountSelection from './account-selection'
import { useUserData } from '@/components/context/user-data'
import ColumnMapping from './column-mapping'
import { useI18n } from "@/locales/client"
import { ImportDialogHeader } from './components/import-dialog-header'
import { ImportDialogFooter } from './components/import-dialog-footer'
import { platforms } from './config/platforms'
import { FormatPreview } from './components/format-preview'
import { cn } from '@/lib/utils'

type ColumnConfig = {
  [key: string]: {
    defaultMapping: string[];
    required: boolean;
  };
};

const columnConfig: ColumnConfig = {
  "accountNumber": { defaultMapping: ["account", "accountnumber"], required: false },
  "instrument": { defaultMapping: ["symbol", "ticker"], required: true },
  "entryId": { defaultMapping: ["entryId", "entryorderid"], required: false },
  "closeId": { defaultMapping: ["closeId", "closeorderid"], required: false },
  "quantity": { defaultMapping: ["qty", "amount"], required: true },
  "entryPrice": { defaultMapping: ["entryprice", "entryprice"], required: true },
  "closePrice": { defaultMapping: ["closeprice", "exitprice"], required: true },
  "entryDate": { defaultMapping: ["entrydate", "entrydate"], required: true },
  "closeDate": { defaultMapping: ["closedate", "exitdate"], required: true },
  "pnl": { defaultMapping: ["pnl", "profit"], required: true },
  "timeInPosition": { defaultMapping: ["timeinposition", "duration"], required: false },
  "side": { defaultMapping: ["side", "direction"], required: false },
  "commission": { defaultMapping: ["commission", "fee"], required: false },
}

type Step = 
  | 'select-import-type'
  | 'upload-file'
  | 'select-headers'
  | 'map-columns'
  | 'select-account'
  | 'preview-trades'
  | 'complete';

export type { Step };

export default function ImportButton() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [step, setStep] = useState<Step>('select-import-type')
  const [importType, setImportType] = useState<ImportType>('')
  const [rawCsvData, setRawCsvData] = useState<string[][]>([])
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<{ [key: string]: string }>({})
  const [accountNumber, setAccountNumber] = useState<string>('')
  const [newAccountNumber, setNewAccountNumber] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [processedTrades, setProcessedTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const uploadIconRef = useRef<UploadIconHandle>(null)

  const { toast } = useToast()
  const { trades, refreshTrades, user } = useUserData()
  const t = useI18n()

  const generateTradeHash = (trade: Partial<Trade>): string => {
    if (!user) {
      return ''
    }
    const hashString = `${user.id}-${trade.accountNumber}-${trade.instrument}-${trade.entryDate}-${trade.closeDate}-${trade.quantity}-${trade.entryId}-${trade.closeId}-${trade.timeInPosition}`
    return hashString
  }

  const handleSave = async () => {
    if (!user) {
      toast({
        title: t('import.error.auth'),
        description: t('import.error.authDescription'),
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      let newTrades: Trade[] = []
          console.log('[ImportButton] Processing trades:', processedTrades)
          newTrades = processedTrades.map(trade => ({
            ...trade,
            accountNumber: trade.accountNumber || accountNumber || newAccountNumber,
            userId: user.id,
            id: generateTradeHash(trade),
          }))
     
          // Filter out empty trades
          newTrades = newTrades.filter(trade => {
            // Check if all required fields are present and not empty
            !trade.accountNumber && console.log('trade.accountNumber missing', trade)
            !trade.instrument && console.log('trade.instrument missing', trade)
            trade.quantity === 0 && console.log('trade.quantity is 0', trade)
            !trade.entryPrice && console.log('trade.entryPrice missing', trade)
            !trade.closePrice && console.log('trade.closePrice missing', trade)
            !trade.entryDate && console.log('trade.entryDate missing', trade)
            !trade.closeDate && console.log('trade.closeDate missing', trade)
            return trade.accountNumber &&
              trade.instrument &&
              trade.quantity !== 0 &&
              (trade.entryPrice || trade.closePrice) &&
              (trade.entryDate || trade.closeDate);
          });

      console.log('[ImportButton] Saving trades:', newTrades)
      const result = await saveTrades(newTrades)
      if(result.error){
        if (result.error === "DUPLICATE_TRADES") {
          toast({
            title: t('import.error.duplicateTrades'),
            description: t('import.error.duplicateTradesDescription'),
            variant: "destructive",
          })
        } else if (result.error === "NO_TRADES_ADDED") {
          toast({
            title: t('import.error.noTradesAdded'),
            description: t('import.error.noTradesAddedDescription'),
            variant: "destructive",
          })
        } else {
          toast({
            title: t('import.error.failed'),
            description: t('import.error.failedDescription'),
            variant: "destructive",
          })
        }
        return
      }
      // Update the trades
      await refreshTrades()
      setIsOpen(false)
      toast({
        title: t('import.success'),
        description: t('import.successDescription', { numberOfTradesAdded: result.numberOfTradesAdded }),
      })
      // Reset the import process
      resetImportState()

    } catch (error) {
      console.error('Error saving trades:', error)
      toast({
        title: t('import.error.failed'),
        description: t('import.error.failedDescription'),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const resetImportState = () => {
    setImportType('')
    setStep('select-import-type')
    setRawCsvData([])
    setCsvData([])
    setHeaders([])
    setMappings({})
    setAccountNumber('')
    setNewAccountNumber('')
    setProcessedTrades([])
    setError(null)
  }

  const isRequiredFieldsMapped = (): boolean => {
    const requiredFields = Object.entries(columnConfig)
      .filter(([_, config]) => config.required)
      .map(([field, _]) => field);
    return requiredFields.every(field => Object.values(mappings).includes(field));
  }

  const getMissingRequiredFields = (): string[] => {
    const requiredFields = Object.entries(columnConfig)
      .filter(([_, config]) => config.required)
      .map(([field, _]) => field);
    return requiredFields.filter(field => !Object.values(mappings).includes(field));
  }

  const handleNextStep = () => {
    const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
    if (!platform) return

    const currentStepIndex = platform.steps.findIndex(s => s.id === step)
    if (currentStepIndex === -1) return

    // Handle standard flow
    const nextStep = platform.steps[currentStepIndex + 1]
    if (!nextStep) {
      handleSave()
      return
    }

    setStep(nextStep.id)
  }

  const handleBackStep = () => {
    const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
    if (!platform) return

    const currentStepIndex = platform.steps.findIndex(s => s.id === step)
    if (currentStepIndex <= 0) return

    const prevStep = platform.steps[currentStepIndex - 1]
    if (!prevStep) return

    setStep(prevStep.id)
  }

  const renderStep = () => {
    const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
    if (!platform) return null

    const currentStep = platform.steps.find(s => s.id === step)
    if (!currentStep) return null

    const Component = currentStep.component

    // Handle special cases for components that need specific props
    if (Component === ImportTypeSelection) {
      return (
        <div className="flex flex-col gap-4 h-full">
          <Component
            selectedType={importType}
            setSelectedType={setImportType}
            setIsOpen={setIsOpen}
          />
        </div>
      )
    }

    if (Component === FileUpload) {
      return (
        <Component
          importType={importType}
          setRawCsvData={setRawCsvData}
          setCsvData={setCsvData}
          setHeaders={setHeaders}
          setStep={setStep}
          setError={setError}
        />
      )
    }

    if (Component === HeaderSelection) {
      return (
        <Component
          rawCsvData={rawCsvData}
          setCsvData={setCsvData}
          setHeaders={setHeaders}
          setError={setError}
        />
      )
    }

    if (Component === AccountSelection) {
      return (
        <Component
          accounts={Array.from(new Set(trades.map(trade => trade.accountNumber)))}
          accountNumber={accountNumber}
          setAccountNumber={setAccountNumber}
          newAccountNumber={newAccountNumber}
          setNewAccountNumber={setNewAccountNumber}
        />
      )
    }

    if (Component === ColumnMapping) {
      return (
        <Component
          headers={headers}
          csvData={csvData}
          mappings={mappings}
          setMappings={setMappings}
          error={error}
          importType={importType}
        />
      )
    }

    if (Component === FormatPreview) {
      return (
        <Component
          trades={csvData}
          processedTrades={processedTrades}
          setProcessedTrades={setProcessedTrades}
          setIsLoading={setIsLoading}
          isLoading={isLoading}
          headers={headers}
          mappings={mappings}
        />
      )
    }
    
    // Handle processor components
    if (platform.processorComponent) {
      return (
        <platform.processorComponent
          csvData={csvData}
          headers={headers}
          setProcessedTrades={setProcessedTrades}
          accountNumber={accountNumber || newAccountNumber}
        />
      )
    }

    // Handle custom components
    if (platform.customComponent) {
      return <platform.customComponent setIsOpen={setIsOpen} />
    }

    return null
  }

  const isNextDisabled = () => {
    if (isLoading) return true
    
    const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
    if (!platform) return true

    const currentStep = platform.steps.find(s => s.id === step)
    if (!currentStep) return true

    // File upload step
    if (currentStep.component === FileUpload && csvData.length === 0) return true
    
    // Account selection for Tradovate
    if (currentStep.component === AccountSelection && importType === 'tradovate' && !accountNumber && !newAccountNumber) return true
    
    // Account selection for other platforms
    if (currentStep.component === AccountSelection && !accountNumber && !newAccountNumber) return true

    return false
  }

  return (
    <div>
      <Button 
        onClick={() => setIsOpen(true)} 
        variant="default"
        className={cn(
          "justify-start text-left font-normal w-full",
        )}
        id="import-data"
        onMouseEnter={() => uploadIconRef.current?.startAnimation()}
        onMouseLeave={() => uploadIconRef.current?.stopAnimation()}
      >
        <UploadIcon ref={uploadIconRef} className="h-4 w-4 mr-2" /> 
        <span className='hidden md:block'>{t('import.button')}</span>
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex flex-col max-w-[80vw] h-[80vh] p-0">
          <ImportDialogHeader step={step} importType={importType} />
          
          <div className="flex-1 overflow-hidden p-6">
            {renderStep()}
          </div>

          <ImportDialogFooter
            step={step}
            importType={importType}
            onBack={handleBackStep}
            onNext={handleNextStep}
            isSaving={isSaving}
            isNextDisabled={isNextDisabled()}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}