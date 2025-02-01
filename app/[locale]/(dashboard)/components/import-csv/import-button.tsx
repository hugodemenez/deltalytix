'use client'

import React, { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { UploadIcon } from 'lucide-react'
import { useTrades } from '@/components/context/trades-data'
import { Trade } from '@prisma/client'
import { getTrades, saveTrades } from '@/server/database'
import ImportTypeSelection, { ImportType } from './import-type-selection'
import FileUpload from './file-upload'
import HeaderSelection from './header-selection'
import AccountSelection from './account-selection'
import { useUser } from '@/components/context/user-data'
import RithmicOrderProcessor from './rithmic-order-processor-new'
import RithmicPerformanceProcessor from './rithmic-performance-processor'
import TradovateProcessor from './tradovate-processor'
import ColumnMapping from './column-mapping'
import TradezellaProcessor from './tradezella-processor'
import NinjaTraderPerformanceProcessor from './ninjatrader-performance-processor'
import QuantowerOrderProcessor from './quantower-processor'
import TopstepProcessor from './topstep-processor'
import { cn } from '@/lib/utils'
import { useI18n } from "@/locales/client"

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

export default function ImportButton() {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [step, setStep] = useState<number>(0)
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

  const { toast } = useToast()
  const { trades, setTrades, refreshTrades } = useTrades()
  const { user } = useUser()
  const t = useI18n()

  const formatPnl = (pnl: string | undefined): { pnl: number, error?: string } => {
    if (typeof pnl !== 'string' || pnl.trim() === '') {
      console.warn('Invalid PNL value:', pnl);
      return { pnl: 0, error: 'Invalid PNL value' };
    }

    let formattedPnl = pnl.trim();

    if (formattedPnl.includes('(')) {
      formattedPnl = formattedPnl.replace('(', '-').replace(')', '');
    }

    const numericValue = parseFloat(formattedPnl.replace(/[$,]/g, ''));

    if (isNaN(numericValue)) {
      console.warn('Unable to parse PNL value:', pnl);
      return { pnl: 0, error: 'Unable to parse PNL value' };
    }

    return { pnl: numericValue };
  };

  const convertTimeInPosition = (time: string | undefined): number | undefined => {
    if (typeof time !== 'string' || time.trim() === '') {
      console.warn('Invalid time value:', time);
      return 0;
    }
    if (/^\d+\.\d+$/.test(time)) {
      // Round to the nearest second
      const floatTime = Math.round(parseFloat(time));
      return floatTime;
    }
    const timeInPosition = time;
    const minutesMatch = timeInPosition.match(/(\d+)min/);
    const secondsMatch = timeInPosition.match(/(\d+)sec/);
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    const timeInSeconds = (minutes * 60) + seconds;
    return timeInSeconds;
  }

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
      switch (importType) {
        case 'quantower':
          newTrades = processedTrades.map(trade => ({
            ...trade,
            userId: user.id,
            id: generateTradeHash(trade),
          }))
          break
        case 'rithmic-orders':
          newTrades = processedTrades.map(trade => ({
            ...trade,
            userId: user.id,
            id: generateTradeHash(trade),
          }))
          break
        case 'rithmic-performance':
          newTrades = processedTrades.map(trade => ({
            ...trade,
            id: generateTradeHash(trade),
            userId: user.id,
          }))
          break
        case 'tradovate':
          newTrades = processedTrades.map(trade => ({
            ...trade,
            id: generateTradeHash(trade),
            accountNumber: newAccountNumber || accountNumber,
            userId: user.id,
          }))
          break
        case 'tradezella':
          newTrades = processedTrades.map(trade => ({
            ...trade,
            id: generateTradeHash(trade),
            userId: user.id,
          }))
          break
        case 'ninjatrader-performance':
          newTrades = processedTrades.map(trade => ({
            ...trade,
            id: `${user.id}-${trade.id}`,
            userId: user.id,
          }))
          break
        case 'topstep':
          newTrades = processedTrades.map(trade => ({
            ...trade,
            id: generateTradeHash(trade),
            userId: user.id,
          }))
          break
        // Default uses AI to map the columns and auto-format the data
        default:
          csvData.forEach(row => {
            const item: Partial<Trade> = {};
            let quantity = 0;
            headers.forEach((header, index) => {
              if (mappings[header]) {
                const key = mappings[header] as keyof Trade;
                const cellValue = row[index];
                switch (key) {
                  case 'quantity':
                    quantity = parseFloat(cellValue) || 0;
                    item[key] = quantity;
                    break;
                  case 'pnl':
                    const { pnl, error } = formatPnl(cellValue)
                    if (error) {
                      return
                    }
                    item[key] = pnl
                    break;
                  case 'commission':
                    item[key] = parseFloat(cellValue) || 0;
                    break;
                  case 'timeInPosition':
                    item[key] = convertTimeInPosition(cellValue);
                    break;
                  default:
                    item[key] = cellValue as any;
                }
              }
            });

            // On rithmic performance, the side is stored as 'B' or 'S'
            if (item.side === 'B' || item.side === 'S') {
              // If side is B or S, then we can set the side based on the side
              item.side = item.side === 'B' ? 'long' : 'short';
            } else {
              // Based on pnl and entryPrice / exitPrice we can determine if it was long or short
              if (item.pnl && item.entryPrice && item.closePrice) {
                if (item.pnl > 0) {
                  item.side = (item.entryPrice > item.closePrice) ? 'short' : 'long';
                } else if (item.pnl < 0) {
                  item.side = (item.entryPrice < item.closePrice) ? 'short' : 'long';
                } else { // If pnl==0, then we need to determine the side based on the date
                  if (item.entryDate && item.closeDate) {
                    item.side = new Date(item.entryDate) < new Date(item.closeDate) ? 'long' : 'short';
                  }
                }
              }
            }

            item.userId = user!.id;
            if (!item.accountNumber) {
              item.accountNumber = accountNumber || newAccountNumber;
            }
            item.id = generateTradeHash(item as Trade).toString();
            newTrades.push(item as Trade);
          })
      }

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
      setImportType('')
      setStep(0)
      setRawCsvData([])
      setCsvData([])
      setHeaders([])
      setMappings({})
      setAccountNumber('')
      setNewAccountNumber('')

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

  const isRequiredFieldsMapped = useCallback((): boolean => {
    const requiredFields = Object.entries(columnConfig)
      .filter(([_, config]) => config.required)
      .map(([field, _]) => field);
    return requiredFields.every(field => Object.values(mappings).includes(field));
  }, [mappings]);

  const getMissingRequiredFields = useCallback((): string[] => {
    const requiredFields = Object.entries(columnConfig)
      .filter(([_, config]) => config.required)
      .map(([field, _]) => field);
    return requiredFields.filter(field => !Object.values(mappings).includes(field));
  }, [mappings]);

  const handleNextStep = () => {
    if (step === 0) {
      setStep(1)
    } else if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      if (importType === 'tradovate') {
        if (accountNumber || newAccountNumber) {
          setStep(3)
        } else {
          toast({
            title: t('import.error.accountRequired'),
            description: t('import.error.accountRequiredDescription'),
            variant: "destructive",
          })
        }
      } else {
        setStep(3)
      }
    } else if (step === 3) {
      switch (importType) {
        case 'quantower':
          handleSave()
          break
        case 'tradovate':
          handleSave()
          break
        case 'rithmic-orders':
          handleSave()
          break
        case 'rithmic-performance':
          handleSave()
          break
        case 'tradezella':
          handleSave()
          break
        case 'ninjatrader-performance':
          handleSave()
          break
        case 'rithmic-sync':
          handleSave()
          break
        case 'topstep':
          handleSave()
          break
        default:
          if (!isRequiredFieldsMapped()) {
            const missingFields = getMissingRequiredFields()
            toast({
              title: t('import.error.requiredFields'),
              description: (
                <div>
                  <p>{t('import.error.requiredFieldsDescription')}</p>
                  <ul className="list-disc pl-4 mt-2">
                    {missingFields.map((field: string) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                  <p className="mt-2">{t('import.error.requiredFieldsNote')}</p>
                </div>
              ),
              variant: "destructive",
            })
          } else if (!Object.values(mappings).includes('accountNumber') && !accountNumber) {
            setStep(4)
          } else {
            handleSave()
          }
      }
    } else if (step === 4) {
      if (accountNumber || newAccountNumber) {
        handleSave()
      } else {
        toast({
          title: t('import.error.accountRequired'),
          description: t('import.error.accountRequiredDescription'),
          variant: "destructive",
        })
      }
    }
  }

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

  const renderStep = () => {
    switch (step) {
      case 0:
        return <ImportTypeSelection selectedType={importType} setSelectedType={setImportType} setIsOpen={setIsOpen} />
      case 1:
        return <FileUpload
          importType={importType}
          setRawCsvData={setRawCsvData}
          setCsvData={setCsvData}
          setHeaders={setHeaders}
          setStep={setStep}
          setError={setError}
        />
      case 2:
        if (importType === 'tradovate') {
          return <AccountSelection
            accounts={Array.from(new Set(trades.map(trade => trade.accountNumber)))}
            accountNumber={accountNumber}
            setAccountNumber={setAccountNumber}
            newAccountNumber={newAccountNumber}
            setNewAccountNumber={setNewAccountNumber}
          />
        }
        return <HeaderSelection
          rawCsvData={rawCsvData}
          setCsvData={setCsvData}
          setHeaders={setHeaders}
          setError={setError}
        />
      case 3:
        switch (importType) {
          case 'quantower':
            return (
              <QuantowerOrderProcessor
                csvData={csvData}
                setProcessedTrades={setProcessedTrades}
              />
            )
          case 'rithmic-orders':
            return (
              <RithmicOrderProcessor
                csvData={csvData}
                headers={headers}
                setProcessedTrades={setProcessedTrades}
              />
            )
          case 'rithmic-performance':
            return (
              <RithmicPerformanceProcessor
                csvData={csvData}
                headers={headers}
                setProcessedTrades={setProcessedTrades}
              />
            )
          case 'tradovate':
            return (
              <TradovateProcessor
                csvData={csvData}
                headers={headers}
                setProcessedTrades={setProcessedTrades}
                accountNumber={accountNumber || newAccountNumber}
              />
            )
          case 'tradezella':
            return (
              <TradezellaProcessor
                csvData={csvData}
                headers={headers}
                setProcessedTrades={setProcessedTrades}
              />
            )
          case 'ninjatrader-performance':
            return (
              <NinjaTraderPerformanceProcessor
                csvData={csvData}
                headers={headers}
                setProcessedTrades={setProcessedTrades}
              />
            )
          case 'topstep':
            return (
              <TopstepProcessor
                csvData={csvData}
                headers={headers}
                setProcessedTrades={setProcessedTrades}
              />
            )
          default:
            return (
              <ColumnMapping
                headers={headers}
                csvData={csvData}
                mappings={mappings}
                setMappings={setMappings}
                error={error}
                importType={importType}
              />
            )
        }
      case 4:
        return <AccountSelection
          accounts={Array.from(new Set(trades.map(trade => trade.accountNumber)))}
          accountNumber={accountNumber}
          setAccountNumber={setAccountNumber}
          newAccountNumber={newAccountNumber}
          setNewAccountNumber={setNewAccountNumber}
        />
      default:
        return null
    }
  }

  return (
    <div>
      <Button onClick={() => setIsOpen(true)} className='w-full' id="import-data">
        <UploadIcon className="sm:mr-2 h-4 w-4" /> 
        <span className='hidden md:block'>{t('import.button')}</span>
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex flex-col max-w-[80vw] h-[80vh] p-0">
          <DialogHeader className="flex-none p-6 border-b space-y-4">
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {getDialogDescription()}
            </DialogDescription>
            <div className="space-y-2">
              <div className="w-full bg-secondary h-2 rounded-full">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${(step / (importType === 'rithmic-orders' ? 3 : importType === 'rithmic-sync' ? 2 : 4)) * 100}%` }}
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

          <div className="flex-1 overflow-hidden h-full w-full">
            {renderStep()}
          </div>

          <div className="flex-none p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex justify-end items-center gap-4">
              {step > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setStep(step - 1)}
                  className="w-fit min-w-[100px]"
                >
                  {t('import.button.back')}
                </Button>
              )}
              {!(step === 0 && importType === 'rithmic-sync') && (
                <Button 
                  onClick={handleNextStep}
                  className="w-fit min-w-[100px]"
                  disabled={
                    (step === 1 && csvData.length === 0) ||
                    ((step === 2 && importType === 'tradovate') && !accountNumber && !newAccountNumber) ||
                    (step === 4 && !accountNumber && !newAccountNumber)
                  }
                >
                  {isSaving 
                    ? t('import.button.saving')
                    : (step === 4 || (step === 3 && importType === 'rithmic-orders') 
                      ? t('import.button.save')
                      : t('import.button.next')
                    )
                  }
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}