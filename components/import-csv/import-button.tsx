'use client'

import React, { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { UploadIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTrades } from '../context/trades-data'
import { Trade } from '@prisma/client'
import { getTrades, saveTrades } from '@/server/database'
import ImportTypeSelection, { ImportType } from './import-type-selection'
import FileUpload from './file-upload'
import HeaderSelection from './header-selection'
import ColumnMapping from './column-mapping'
import AccountSelection from './account-selection'
import RithmicOrderProcessor from './rithmic-order-processor'
import { useUser } from '../context/user-data'

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
  const [importType, setImportType] = useState<ImportType>('rithmic-performance')
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
  const router = useRouter()
  const { trades, setTrades, refreshTrades } = useTrades()
  const { user } = useUser()

  const formatPnl = (pnl: string | undefined): {pnl: number, error?: string} => {
    if (typeof pnl !== 'string' || pnl.trim() === '') {
      console.warn('Invalid PNL value:', pnl);
      return {pnl: 0, error: 'Invalid PNL value'};
    }

    let formattedPnl = pnl.trim();

    if (formattedPnl.includes('(')) {
      formattedPnl = formattedPnl.replace('(', '-').replace(')', '');
    }

    const numericValue = parseFloat(formattedPnl.replace(/[$,]/g, ''));

    if (isNaN(numericValue)) {
      console.warn('Unable to parse PNL value:', pnl);
      return {pnl: 0, error: 'Unable to parse PNL value'};
    }

    return {pnl: numericValue};
  };

  const convertTimeInPosition = (time: string | undefined): number | undefined => {
    if (typeof time !== 'string' || time.trim() === '') {
      console.warn('Invalid time value:', time);
      return 0;
    }
    if (/^\d+\.\d+$/.test(time)) {
      const floatTime = parseFloat(time);
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
    const hashString = `${trade.userId}-${trade.accountNumber}-${trade.instrument}-${trade.entryDate}-${trade.closeDate}-${trade.quantity}-${trade.entryId}-${trade.closeId}-${trade.timeInPosition}`
    return hashString
  }

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated. Please log in and try again.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      let newTrades: Trade[] = []

      if (importType === 'rithmic-orders') {
        newTrades = processedTrades.map(trade => ({
          ...trade,
          id: generateTradeHash(trade),
          userId: user.id,
        }))
      } else {
        csvData.forEach(row => {
          const item: Partial<Trade> = {};
          let quantity = 0;
          let commission = 0;
    
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
                  const {pnl,error} = formatPnl(cellValue)
                  if (error) {
                    return
                  }
                  item[key] = pnl
                  break;
                case 'commission':
                  commission = parseFloat(cellValue) || 0;
                  break;
                case 'timeInPosition':
                  item[key] = convertTimeInPosition(cellValue);
                  break;
                default:
                  item[key] = cellValue as any;
              }
            }
          });

          // If commission is 0, we default to tradovate values
          if (commission === 0) {
            // If ZN, then commission is 1.94 * quantity
            if (item.instrument?.startsWith('ZN')) {
              item.commission = 1.94 * quantity
            }
            // If ZB, then commission is 2.08 * quantity
            if (item.instrument?.startsWith('ZB')) {
              item.commission = 2.08 * quantity
            }
          }
    
          // Based on pnl and entryPrice / exitPrice we can know if it was long or short
          if (item.pnl && item.entryPrice && item.closePrice) {
            item.side = (item.pnl > 0 && item.entryPrice > item.closePrice) ? 'short' : 'long';
          } else if (item.pnl && item.entryPrice && item.closePrice) {
            item.side = (item.pnl < 0 && item.entryPrice < item.closePrice) ? 'short' : 'long';
            // If entryPrice and closePrice are the same, we need to determine the side based on the date
            if (item.entryDate && item.closeDate) {
              item.side = new Date(item.entryDate) < new Date(item.closeDate) ? 'long' : 'short';
            }
          }     
          item.userId = user!.id;
    
          if (!item.accountNumber) {
            item.accountNumber = accountNumber || newAccountNumber;
          }
          item.id = generateTradeHash(item as Trade).toString();
    
          console.log('item', item)
           newTrades.push(item as Trade);
        })
      }
      
      console.log('newTrades', newTrades)

      // Filter out empty trades
      newTrades = newTrades.filter(trade => {
        // Check if all required fields are present and not empty
        return trade.accountNumber &&
               trade.instrument &&
               trade.quantity !== 0 &&
               (trade.entryPrice || trade.closePrice) &&
               (trade.entryDate || trade.closeDate);
      });

      console.log('filtered trades', newTrades)
      // Log the number of trades after filtering
      console.log(`Filtered ${newTrades.length} valid trades`);

      await saveTrades(newTrades)
      const updatedTrades = await getTrades(user.id)
      setTrades(updatedTrades)
      setIsOpen(false)
      toast({
        title: "Import Successful",
        description: `${newTrades.length} trades have been imported.`,
      })
      // Reset the import process
      setImportType('rithmic-performance')
      setStep(0)
      setRawCsvData([])
      setCsvData([])
      setHeaders([])
      setMappings({})
      setAccountNumber('')
      setNewAccountNumber('')
      // Update trades
      refreshTrades()

    } catch (error) {
      console.error('Error saving trades:', error)
      toast({
        title: "Import Failed",
        description: "An error occurred while importing trades. Please try again.",
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
      if (importType === 'rithmic-orders') {
        setStep(3)
      } else {
        setStep(3)
      }
    } else if (step === 3) {
      if (importType === 'rithmic-orders') {
        handleSave()
      } else if (!isRequiredFieldsMapped()) {
        const missingFields = getMissingRequiredFields()
        toast({
          title: "Required fields not mapped",
          description: (
            <div>
              <p>Please map the following required fields:</p>
              <ul className="list-disc pl-4 mt-2">
                {missingFields.map((field: string) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
              <p className="mt-2">These fields are necessary for proper data import.</p>
            </div>
          ),
          variant: "destructive",
        })
      } else if (!Object.values(mappings).includes('accountNumber') && !accountNumber) {
        setStep(4)
      } else {
        handleSave()
      }
    } else if (step === 4) {
      if (accountNumber || newAccountNumber) {
        handleSave()
      } else {
        toast({
          title: "Account number required",
          description: "Please select an existing account or enter a new one.",
          variant: "destructive",
        })
      }
    }
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return <ImportTypeSelection selectedType={importType} setSelectedType={setImportType} />
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
        return <HeaderSelection 
          rawCsvData={rawCsvData}
          setCsvData={setCsvData}
          setHeaders={setHeaders}
          setError={setError}
        />
      case 3:
        return importType === 'rithmic-orders' ? (
          <RithmicOrderProcessor
            csvData={csvData}
            headers={headers}
            setProcessedTrades={setProcessedTrades}
          />
        ) : (
          <ColumnMapping 
            headers={headers}
            csvData={csvData}
            mappings={mappings}
            setMappings={setMappings}
            error={error}
            importType={importType}
          />
        )
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
      <Button onClick={() => setIsOpen(true)} className='w-full'>
        <UploadIcon className="sm:mr-2 h-4 w-4" /> <span className='hidden md:block'>Import CSV</span>
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {step === 0 && "Select Import Type"}
              {step === 1 && "Upload CSV"}
              {step === 2 && "Select Header Row"}
              {step === 3 && (importType === 'rithmic-orders' ? "Process Rithmic Orders" : "Map Columns")}
              {step === 4 && "Select or Add Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-auto">
            {renderStep()}
          </div>
          <DialogFooter className="mt-4">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="mr-auto">
                Back
              </Button>
            )}
            <Button onClick={handleNextStep}>
              {isSaving ? "Saving..." : (step === 4 || (step === 3 && importType === 'rithmic-orders') ? "Save" : "Next")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}