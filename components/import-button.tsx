'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { UploadIcon, InfoIcon } from 'lucide-react'
import { saveTrades } from '@/server/database'
import { Trade } from '@prisma/client'
import { createClient } from '@/hooks/auth'
import { useRouter } from 'next/navigation'

type ColumnConfig = {
  [key: string]: {
    defaultMapping: string[];
    required: boolean;
  };
};

const columnConfig: ColumnConfig = {
  "instrument": { defaultMapping: ["sym", "symbol", "ticker", "instrument"], required: true },
  "buyId": { defaultMapping: ["buyFillId",], required: false },
  "sellId": { defaultMapping: ["sellFillId", "exit_id", "id"], required: false },
  "quantity": { defaultMapping: ["qty", "quantity", "amount", "volume", "size"], required: true },
  "buyPrice": { defaultMapping: ["buyPrice",], required: true },
  "sellPrice": { defaultMapping: ["sellPrice",], required: true },
  "buyDate": { defaultMapping: ["boughtTimestamp",], required: true },
  "sellDate": { defaultMapping: ["soldTimestamp",], required: true },
  "pnl": { defaultMapping: ["pnl", "profit", "profit_loss", "gain_loss"], required: false },
  "timeInPosition": { defaultMapping: ["duration",], required: false },
}

const destinationColumns = Object.keys(columnConfig)
const requiredFields = destinationColumns.filter(column => columnConfig[column].required)

const suggestedAccounts = ["50k", "25k"]

export default function Component() {
  const [isOpen, setIsOpen] = useState(false)
  const [rawCsvData, setRawCsvData] = useState<string[][]>([])
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<{ [key: string]: string }>({})
  const [includedFields, setIncludedFields] = useState<{ [key: string]: boolean }>({})
  const [accountNumber, setAccountNumber] = useState('')
  const [step, setStep] = useState(0)
  const [selectedHeaderIndex, setSelectedHeaderIndex] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [isCustomAccount, setIsCustomAccount] = useState(false)
  const customInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    Papa.parse(file, {
      complete: (result) => {
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          setRawCsvData(result.data as string[][])
          processHeaderSelection(0, result.data as string[][])
          setStep(1)
          setError(null)
        } else {
          setError("The CSV file appears to be empty or invalid.")
        }
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`)
      }
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const processHeaderSelection = (index: number, data: string[][]) => {
    if (data[index]) {
      setSelectedHeaderIndex(index)
      const newCsvData = data.slice(index)
      setCsvData(newCsvData)
      const newHeaders = data[index].filter(header => header && header.trim() !== '')
      setHeaders(newHeaders)

      const newMappings: { [key: string]: string } = {}
      const newIncludedFields: { [key: string]: boolean } = {}
      newHeaders.forEach(header => {
        const matchedDestination = Object.entries(columnConfig).find(([_, config]) =>
          config.defaultMapping.some(match => header.toLowerCase().includes(match.toLowerCase()))
        )
        if (matchedDestination) {
          newMappings[header] = matchedDestination[0]
          newIncludedFields[header] = true
        } else {
          newMappings[header] = ''
          newIncludedFields[header] = false
        }
      })
      setMappings(newMappings)
      setIncludedFields(newIncludedFields)
    } else {
      setError("Invalid header row selected.")
    }
  }

  const handleHeaderSelection = (index: number) => {
    processHeaderSelection(index, rawCsvData)
  }

  const handleMapping = (header: string, value: string) => {
    setMappings(prev => ({ ...prev, [header]: value }))
    setIncludedFields(prev => ({ ...prev, [header]: true }))
  }

  const handleIncludeToggle = (header: string) => {
    setIncludedFields(prev => ({ ...prev, [header]: !prev[header] }))
  }

  const isRequiredFieldsMapped = () => {
    return requiredFields.every(field =>
      Object.entries(mappings).some(([key, value]) => value === field && includedFields[key])
    )
  }

  const getMissingRequiredFields = (): string[] => {
    return requiredFields.filter(field =>
      !Object.entries(mappings).some(([key, value]) => value === field && includedFields[key])
    )
  }

  const handleNextStep = () => {
    if (step === 2 && !isRequiredFieldsMapped()) {
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
    } else {
      setStep(step + 1)
    }
  }


  const handleSave =  async () => {
    const supabase = createClient()
    await supabase.auth.refreshSession()
    const { data : {user}} = await supabase.auth.getUser()


    const jsonData = csvData.slice(1).map(row => {
      const item: { [key: string]: string | BigInt | number } = { accountNumber }
      headers.forEach((header, index) => {
        if (includedFields[header] && mappings[header]) {
          // If quantity col then convert to number
          if (mappings[header] === 'quantity') {
            item[mappings[header]] = parseFloat(row[index])
          } 
          else {
            item[mappings[header]] = row[index]
          }
        }
      })
      if (item.buyId && item.sellId) {
      item.userId = user!.id;
      item.id = user!.id.concat(item.buyId as string,item.sellId as string)
      }
      return item as unknown as Trade
    })
    const filteredData = jsonData.filter((item) => item.instrument && item.quantity && item.buyPrice && item.sellPrice && item.buyDate && item.sellDate)
    console.log('JSON Data:', filteredData)

    await saveTrades(filteredData)
    toast({
      title: "CSV data saved for "+user!.id,
      description: "Your CSV data has been successfully imported.",
    })
    // Here you would typically send jsonData to your database
    setIsOpen(false)
    setStep(0)
    setRawCsvData([])
    setCsvData([])
    setHeaders([])
    setMappings({})
    setIncludedFields({})
    setAccountNumber('')
    setSelectedHeaderIndex(0)
    setError(null)
    setIsCustomAccount(false)
    router.refresh()
  }

  const handleAccountSelection = (value: string) => {
    if (value === 'custom') {
      setIsCustomAccount(true)
      setAccountNumber('')
    } else {
      setIsCustomAccount(false)
      setAccountNumber(value)
    }
  }

  useEffect(() => {
    if (isCustomAccount && customInputRef.current) {
      customInputRef.current.focus()
    }
  }, [isCustomAccount])

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer">
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the CSV file here ...</p>
            ) : (
              <p>Drag and drop a CSV file here, or click to select a file</p>
            )}
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        )
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-medium">Select Header Row</h3>
              <InfoIcon className="h-4 w-4 text-gray-500" />
            </div>
            <div className="max-h-[calc(80vh-200px)] overflow-auto">
              <Table>
                <TableBody>
                  {rawCsvData.slice(0, 5).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="w-[50px]">
                        <RadioGroup value={selectedHeaderIndex.toString()} onValueChange={(value) => handleHeaderSelection(parseInt(value))}>
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
            {headers.length > 0 && csvData.length > 0 ? (
              <div className="max-h-[calc(80vh-200px)] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Your File Column</TableHead>
                      <TableHead>Your Sample Data</TableHead>
                      <TableHead>Destination Column</TableHead>
                      <TableHead>Include</TableHead>
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
                                <SelectItem key={i} value={column}>
                                  {column}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={includedFields[header]}
                            onCheckedChange={() => handleIncludeToggle(header)}
                            disabled={columnConfig[mappings[header]]?.required}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
            <div className="flex items-center space-x-2">
              <Select onValueChange={handleAccountSelection} value={isCustomAccount ? 'custom' : accountNumber}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select or enter account" />
                </SelectTrigger>
                <SelectContent>
                  {suggestedAccounts.map((account, index) => (
                    <SelectItem key={index} value={account}>
                      {account}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Enter custom account</SelectItem>
                </SelectContent>
              </Select>
              {isCustomAccount && (
                <Input
                  ref={customInputRef}
                  placeholder="Enter custom account"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-[200px]"
                />
              )}
            </div>
          </div>
        )
    }
  }

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>
        <UploadIcon className="mr-2 h-4 w-4" /> Import CSV
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {step === 0 && "Upload"}
              {step === 1 && "Select Header"}
              {step === 2 && "Map Columns"}
              {step === 3 && "Select Account"}
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
            {step < 3 && (
              <Button
                onClick={handleNextStep}
                disabled={step === 1 && selectedHeaderIndex === null}
              >
                Next
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleSave} disabled={!accountNumber}>
                Save
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}