'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { UploadIcon, XIcon, AlertTriangleIcon, InfoIcon, PlusCircleIcon } from 'lucide-react'
import { getTrades, saveTrades } from '@/server/database'
import { Trade } from '@prisma/client'
import { createClient } from '@/hooks/auth'
import { useRouter } from 'next/navigation'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { generateCsvMapping } from '@/lib/generate-csv-mappings'
import { readStreamableValue } from 'ai/rsc'
import { useTrades } from './context/trades-data'

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

const destinationColumns = Object.keys(columnConfig)
const requiredFields = destinationColumns.filter(column => columnConfig[column].required)

export default function Component() {
  const [isOpen, setIsOpen] = useState(false)
  const [rawCsvData, setRawCsvData] = useState<string[][]>([])
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<{ [key: string]: string }>({})
  const [isSaving, setIsSaving] = useState(false)
  const [step, setStep] = useState(0)
  const [selectedHeaderIndex, setSelectedHeaderIndex] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingMappings, setIsGeneratingMappings] = useState(false)
  const [isRithmicImport, setIsRithmicImport] = useState(false)
  const [accountNumber, setAccountNumber] = useState<string>('')
  const [isAddingNewAccount, setIsAddingNewAccount] = useState(false)
  const [newAccountNumber, setNewAccountNumber] = useState<string>('')
  const { toast } = useToast()
  const router = useRouter()
  const { trades, setTrades } = useTrades()

  const accounts = useMemo(() => {
    const accountSet = new Set(trades.map(trade => trade.accountNumber))
    return Array.from(accountSet)
  }, [trades])

  const generateAIMappings = useCallback(async (headers: string[], sampleData: string[][]) => {
    setIsGeneratingMappings(true);
    try {
      const firstRows = sampleData.map(row => {
        const rowData: Record<string, string> = {};
        headers.forEach((header, i) => {
          rowData[header] = row[i];
        });
        return rowData;
      });
      const aiMappings = await generateCsvMapping(headers, firstRows);

      const newMappings: { [key: string]: string } = {};

      for await (const partialObject of readStreamableValue(aiMappings.object)) {
        if (partialObject) {
          Object.entries(partialObject).forEach(([field, value]) => {
            if (typeof value === 'string' && headers.includes(value) && Object.keys(columnConfig).includes(field)) {
              newMappings[value] = field;
            }
          });
        }
      }
      console.log('AI Mappings:', newMappings);

      if (isRithmicImport) {
        newMappings['AccountNumber'] = 'accountNumber';
        newMappings['Instrument'] = 'instrument';
      }

      headers.forEach(header => {
        if (!newMappings[header]) {
          const defaultMapping = Object.entries(columnConfig).find(([_, config]) =>
            config.defaultMapping.includes(header)
          );
          if (defaultMapping) {
            newMappings[header] = defaultMapping[0];
          }
        }
      });

      setMappings(newMappings);
    } catch (error) {
      console.error('Error generating AI mappings:', error);
      toast({
        title: "Error generating mappings",
        description: "An error occurred while generating AI mappings. Please map columns manually.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMappings(false);
    }
  }, [isRithmicImport, toast]);

  const processHeaderSelection = useCallback((index: number, data: string[][]) => {
    setSelectedHeaderIndex(index)
    const newHeaders = data[index].filter(header => header && header.trim() !== '')
    setHeaders(newHeaders)
    setCsvData(data.slice(index))
    generateAIMappings(newHeaders, data.slice(index + 1, index + 6))
  }, [generateAIMappings])

  const processRithmicCsv = useCallback((data: string[][]) => {
    const processedData: string[][] = []
    let currentAccount = ''
    let currentInstrument = ''
    let isHeaderRow = false
    let headers: string[] = []

    const isAccountNumber = (value: string) => {
      return /^(?=.*[a-zA-Z])(?=.*\d).{5,}$/.test(value);
    }

    data.forEach((row) => {
      if (row[0] && isAccountNumber(row[0])) {
        currentAccount = row[0]
      } else if (row[0] && row[0].length === 4) {
        currentInstrument = row[0]
      } else if (row[0] === 'Entry Order Number') {
        isHeaderRow = true
        headers = ['AccountNumber', 'Instrument', ...row]
        processedData.push(headers)
      } else if (isHeaderRow && row[0] && row[0] !== 'Entry Order Number') {
        processedData.push([currentAccount, currentInstrument, ...row])
      }
    })

    if (processedData.length > 0 && headers.length > 0) {
      setCsvData(processedData)
      setHeaders(headers)
      generateAIMappings(headers, processedData.slice(1, 6))
      setStep(2)
    } else {
      setError("Unable to process Rithmic CSV. Please check the file format.")
    }
  }, [generateAIMappings])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    Papa.parse(file, {
      complete: (result) => {
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          setRawCsvData(result.data as string[][])
          if (isRithmicImport) {
            processRithmicCsv(result.data as string[][])
          } else {
            setStep(1)
            setSelectedHeaderIndex(0)
            processHeaderSelection(0, result.data as string[][])
          }
          setError(null)
        } else {
          setError("The CSV file appears to be empty or invalid.")
        }
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`)
      }
    })
  }, [processRithmicCsv, isRithmicImport, processHeaderSelection])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const handleMapping = (header: string, value: string) => {
    setMappings(prev => {
      const newMappings = { ...prev }
      if (newMappings[header]) {
        delete newMappings[header]
      }
      Object.keys(newMappings).forEach(key => {
        if (newMappings[key] === value) {
          delete newMappings[key]
        }
      })
      newMappings[header] = value
      return newMappings
    })
  }

  const handleRemoveMapping = (header: string) => {
    setMappings(prev => {
      const newMappings = { ...prev }
      delete newMappings[header]
      return newMappings
    })
  }

  const isRequiredFieldsMapped = () => {
    return requiredFields.every(field =>
      Object.values(mappings).includes(field)
    )
  }

  const getMissingRequiredFields = (): string[] => {
    return requiredFields.filter(field =>
      !Object.values(mappings).includes(field)
    )
  }

  const getRemainingFieldsToMap = (): string[] => {
    return destinationColumns.filter(column =>
      !Object.values(mappings).includes(column)
    )
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
                {missingFields.map(field => (
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
    const stringToHash = `${trade.userId}${trade.accountNumber}${trade.instrument}${trade.quantity}${trade.buyPrice}${trade.sellPrice}${trade.buyDate}${trade.sellDate}${trade.pnl}${trade.commission}${trade.timeInPosition}`;
  
    let hash = 0;
    for (let i = 0; i < stringToHash.length; i++) {
      const char = stringToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
  
    return Math.abs(hash);
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
    setSelectedHeaderIndex(0)
    setAccountNumber('')
    setNewAccountNumber('')
    setIsAddingNewAccount(false)
    setIsRithmicImport(false)
    setTrades(await getTrades(user!.id))
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rithmic-import"
                checked={isRithmicImport}
                onCheckedChange={(checked) => setIsRithmicImport(checked as boolean)}
              />
              <Label htmlFor="rithmic-import">Rithmic Performance Import</Label>
            </div>
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer">
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>Drop the CSV file here ...</p>
              ) : (
                <p>Drag and drop a CSV file here, or click to select a file</p>
              )}
              {error && <p className="text-red-500 mt-2">{error}</p>}
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-4">
            <div className="max-h-[calc(80vh-200px)] overflow-auto">
              <Table>
                <TableBody>
                  {rawCsvData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="w-[50px]">
                        <RadioGroup value={selectedHeaderIndex.toString()} onValueChange={(value) => processHeaderSelection(parseInt(value), rawCsvData)}>
                          <RadioGroupItem value={rowIndex.toString()} id={`row-${rowIndex}`} />
                        </RadioGroup>
                      </TableCell>
                      {row.slice(0, 6).map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            {isGeneratingMappings ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
              </div>
            ) : headers.length > 0 && csvData.length > 0 ? (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Remaining Fields to Map:</h3>
                  <div className="flex flex-wrap gap-2">
                    {getRemainingFieldsToMap().map((field, index) => (
                      <span key={index} className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-sm">
                        {field}
                        {columnConfig[field].required && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangleIcon className="h-4 w-4 ml-1 text-yellow-500 inline" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Required field</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="max-h-[calc(80vh-300px)] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Your File Column</TableHead>
                        <TableHead>Your Sample Data</TableHead>
                        <TableHead>Destination Column</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {headers.map((header, index) => (
                        <TableRow key={index}>
                          <TableCell>{header}</TableCell>
                          <TableCell>
                            {csvData.slice(1, 4).map((row, i) => (
                              <span key={i} className="mr-2">{row[index]}</span>
                            ))}
                          </TableCell>
                          <TableCell>
                            <Select onValueChange={(value) => handleMapping(header, value)} value={mappings[header] || undefined}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select one" />
                              </SelectTrigger>
                              <SelectContent>
                                {destinationColumns.map((column, i) => (
                                  <SelectItem key={i} value={column} disabled={Object.values(mappings).includes(column) && mappings[header] !== column}>
                                    {column}
                                    {columnConfig[column].required && (
                                      <span className="ml-1 text-yellow-500">*</span>
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {mappings[header] && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMapping(header)}
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <p>No data to display. Please go back and select a valid header row.</p>
            )}
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        )
      case 3:
        return (
          <div className="space-y-4">
            <Label htmlFor="accountNumber">Account Number</Label>
            {isAddingNewAccount ? (
              <div className="flex items-center space-x-2">
                <Input
                  id="newAccountNumber"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  placeholder="Enter new account number"
                  className="flex-grow"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingNewAccount(false)
                    setNewAccountNumber('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Select onValueChange={setAccountNumber} value={accountNumber}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account, index) => (
                      <SelectItem key={index} value={account}>{account}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setIsAddingNewAccount(true)}
                >
                  <PlusCircleIcon className="mr-2 h-4 w-4" />
                  Add New
                </Button>
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div>
      <Button onClick={() => setIsOpen(true)} className='w-full'>
        <UploadIcon className="mr-2 h-4 w-4" /> Import CSV
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