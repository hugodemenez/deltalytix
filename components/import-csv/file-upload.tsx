import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface FileUploadProps {
  isRithmicImport: boolean
  setIsRithmicImport: React.Dispatch<React.SetStateAction<boolean>>
  setRawCsvData: React.Dispatch<React.SetStateAction<string[][]>>
  setCsvData: React.Dispatch<React.SetStateAction<string[][]>>
  setHeaders: React.Dispatch<React.SetStateAction<string[]>>
  setStep: React.Dispatch<React.SetStateAction<number>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

export default function FileUpload({
  isRithmicImport,
  setIsRithmicImport,
  setRawCsvData,
  setCsvData,
  setHeaders,
  setStep,
  setError
}: FileUploadProps) {
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
      setStep(2)
    } else {
      setError("Unable to process Rithmic CSV. Please check the file format.")
    }
  }, [setHeaders, setCsvData, setStep, setError])

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
            const newHeaders = (result.data[0] as string[]).filter(header => header && header.trim() !== '')
            setHeaders(newHeaders)
            setCsvData(result.data as string[][])
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
  }, [isRithmicImport, processRithmicCsv, setRawCsvData, setCsvData, setHeaders, setStep, setError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

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
      </div>
    </div>
  )
}