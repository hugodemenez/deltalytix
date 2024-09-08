'use client'

import { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { UploadIcon } from 'lucide-react'
import { createClient } from '@/hooks/auth'
import { useRouter } from 'next/navigation'
import { useTrades } from '../context/trades-data'
import { Trade } from '@prisma/client'
import { getTrades, saveTrades } from '@/server/database'
import FileUpload from './file-upload'
import HeaderSelection from './header-selection'
import ColumnMapping from './column-mapping'
import AccountSelection from './account-selection'

type ColumnConfig = {
  [key: string]: {
    defaultMapping: string[];
    required: boolean;
  };
};

const columnConfig: ColumnConfig = {
  "accountNumber": { defaultMapping: [], required: false },
  "instrument": { defaultMapping: [], required: true },
  "buyId": { defaultMapping: [], required: false },
  "sellId": { defaultMapping: [], required: false },
  "quantity": { defaultMapping: [], required: true },
  "buyPrice": { defaultMapping: [], required: true },
  "sellPrice": { defaultMapping: [], required: true },
  "buyDate": { defaultMapping: [], required: true },
  "sellDate": { defaultMapping: [], required: true },
  "pnl": { defaultMapping: [], required: true },
  "timeInPosition": { defaultMapping: [], required: false },
  "side": { defaultMapping: [], required: false },
  "commission": { defaultMapping: [], required: false },
}

export default function ImportButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [rawCsvData, setRawCsvData] = useState<string[][]>([])
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<{ [key: string]: string }>({})
  const [accountNumber, setAccountNumber] = useState<string>('')
  const [newAccountNumber, setNewAccountNumber] = useState<string>('')
  const [isRithmicImport, setIsRithmicImport] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const { trades, setTrades } = useTrades()

  const formatPnl = (pnl: string | undefined): number => {
    if (typeof pnl !== 'string' || pnl.trim() === '') {
      console.warn('Invalid PNL value:', pnl);
      return 0;
    }

    let formattedPnl = pnl.trim();

    if (formattedPnl.includes('(')) {
      formattedPnl = formattedPnl.replace('(', '-').replace(')', '');
    }

    const numericValue = parseFloat(formattedPnl.replace(/[$,]/g, ''));

    if (isNaN(numericValue)) {
      console.warn('Unable to parse PNL value:', pnl);
      return 0;
    }

    return numericValue;
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

  function generateTradeHash(trade: Trade): number {
    const stringToHash = `${trade.userId}${trade.accountNumber}${trade.instrument}${trade.quantity}${trade.buyPrice}${trade.sellPrice}${trade.buyDate}${trade.sellDate}${trade.pnl}${trade.commission}${trade.timeInPosition}${trade.buyId}${trade.sellId}`;
  
    let hash = 0;
    for (let i = 0; i < stringToHash.length; i++) {
      const char = stringToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
  
    return Math.abs(hash);
  }

  const isRequiredFieldsMapped = (): boolean => {
    const requiredFields = Object.keys(columnConfig).filter(key => columnConfig[key].required);
    return requiredFields.every(field => Object.values(mappings).includes(field));
  }

  const getMissingRequiredFields = (): string[] => {
    const requiredFields = Object.keys(columnConfig).filter(key => columnConfig[key].required);
    return requiredFields.filter(field => !Object.values(mappings).includes(field));
  }

  const handleSave = async () => {
    const supabase = createClient()
    await supabase.auth.refreshSession()
    const { data: { user } } = await supabase.auth.getUser()

    const jsonData = csvData.slice(1).map(row => {
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
              item[key] = formatPnl(cellValue).toString();
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

      if (quantity !== 0) {
        item.commission = commission / quantity;
      } else {
        item.commission = commission;
      }

      item.userId = user!.id;
      item.id = generateTradeHash(item as Trade).toString();

      if (!item.accountNumber) {
        item.accountNumber = accountNumber || newAccountNumber;
      }

      return item as Trade;
    });

    const filteredData = jsonData.filter((item): item is Trade =>
      !!item.instrument && !!item.quantity && !!item.buyPrice &&
      !!item.sellPrice && !!item.buyDate && !!item.sellDate && !!item.pnl
    )

    setIsSaving(true)
    try {
      const result = await saveTrades(filteredData)
      if (result.error) {
        toast({
          title: "Error saving trades",
          description: result.error,
          variant: "destructive",
        })
        return
      }
      toast({
        title: "CSV data saved for " + user!.id,
        description: "Your CSV data has been successfully imported.",
      })
      setIsOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error saving trades",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
    setIsOpen(false)
    setStep(0)
    setRawCsvData([])
    setCsvData([])
    setHeaders([])
    setMappings({})
    setError(null)
    setAccountNumber('')
    setNewAccountNumber('')
    setIsRithmicImport(false)
    setTrades(await getTrades(user!.id))
  }

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      if (!isRequiredFieldsMapped()) {
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
        setStep(3)
      } else {
        handleSave()
      }
    } else if (step === 3) {
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
        return <FileUpload 
          isRithmicImport={isRithmicImport}
          setIsRithmicImport={setIsRithmicImport}
          setRawCsvData={setRawCsvData}
          setCsvData={setCsvData}
          setHeaders={setHeaders}
          setStep={setStep}
          setError={setError}
        />
      case 1:
        return <HeaderSelection 
          rawCsvData={rawCsvData}
          setCsvData={setCsvData}
          setHeaders={setHeaders}
          setError={setError}
        />
      case 2:
        return <ColumnMapping 
          headers={headers}
          csvData={csvData}
          mappings={mappings}
          setMappings={setMappings}
          error={error}
        />
      case 3:
        return <AccountSelection 
          accounts={Array.from(new Set(trades.map(trade => trade.accountNumber)))}
          accountNumber={accountNumber}
          setAccountNumber={setAccountNumber}
          newAccountNumber={newAccountNumber}
          setNewAccountNumber={setNewAccountNumber}
        />
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
              {step === 0 && "Upload CSV"}
              {step === 1 && "Select Header Row"}
              {step === 2 && "Map Columns"}
              {step === 3 && "Select or Add Account"}
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
            {step > 0 && (
              <Button onClick={handleNextStep}>
                {isSaving ? "Saving..." : (step === 3 ? "Save" : "Next")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}