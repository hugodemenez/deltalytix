import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { ImportType } from './import-type-selection'
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  importType: ImportType
  setRawCsvData: React.Dispatch<React.SetStateAction<string[][][]>>
  setCsvData: React.Dispatch<React.SetStateAction<string[][]>>
  setHeaders: React.Dispatch<React.SetStateAction<string[]>>
  setStep: React.Dispatch<React.SetStateAction<number>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

export default function FileUpload({
  importType,
  setRawCsvData,
  setCsvData,
  setHeaders,
  setStep,
  setError
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])

  const processRithmicCsv = useCallback((data: string[][]) => {
    const processedData: string[][] = [];
    let currentAccountNumber = '';
    let currentInstrument = '';
    let headers: string[] = [];
  
    const isAccountNumber = (value: string) => {
      return value.length > 4 && 
             !/^[A-Z]{3}\d$/.test(value) && 
             !/^\d+$/.test(value) && 
             value !== 'Account' && 
             value !== 'Entry Order Number';
    };
  
    const isInstrument = (value: string) => {
      return /^[A-Z]{3}\d$/.test(value);
    };
  
    data.forEach((row) => {
      if (row[0] && isAccountNumber(row[0])) {
        currentAccountNumber = row[0];
      } else if (row[0] && isInstrument(row[0])) {
        currentInstrument = row[0];
      } else if (row[0] === 'Entry Order Number') {
        headers = ['AccountNumber', 'Instrument', ...row];
      } else if (headers.length > 0 && row[0] && row[0] !== 'Entry Order Number' && row[0] !== 'Account') {
        processedData.push([currentAccountNumber, currentInstrument, ...row]);
      }
    });
  
    if (processedData.length > 0 && headers.length > 0) {
      setCsvData(processedData);
      setHeaders(headers);
      setStep(3); // Skip header selection for Rithmic
    } else {
      setError("Unable to process Rithmic CSV. Please check the file format.");
    }
  }, [setCsvData, setHeaders, setStep, setError]);

  const processTradezellaOrTradovateCsv = useCallback((data: string[][]) => {
    if (data.length > 0) {
      const headers = data[0].filter(header => header && header.trim() !== '')
      setHeaders(headers)
      setCsvData(data.slice(1))  // Remove the header row from csvData
      setStep(2) // Go to header selection step
    } else {
      setError("The CSV file appears to be empty or invalid.")
    }
  }, [setCsvData, setHeaders, setStep, setError])

  const processFiles = useCallback(() => {
    let allData: string[][][] = []
    let processedCount = 0

    const processNextFile = (index: number) => {
      if (index >= files.length) {
        setRawCsvData(allData)
        if (importType === 'rithmic-performance') {
          processRithmicCsv(allData.flat())
        } else {
          processTradezellaOrTradovateCsv(allData.flat())
        }
        return
      }

      Papa.parse(files[index], {
        complete: (result) => {
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            allData.push(result.data as string[][])
            processedCount++
            processNextFile(index + 1)
          } else {
            setError(`File ${files[index].name} appears to be empty or invalid.`)
          }
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`)
        }
      })
    }

    processNextFile(0)
  }, [files, importType, setRawCsvData, setError, processRithmicCsv, processTradezellaOrTradovateCsv])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true })

  return (
    <div className="space-y-4">
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the CSV files here ...</p>
        ) : (
          <p>Drag and drop CSV files here, or click to select files</p>
        )}
      </div>
      {files.length > 0 && (
        <div>
          <h3>Selected Files:</h3>
          <ul>
            {files.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
          <Button onClick={processFiles}>Process Files</Button>
        </div>
      )}
    </div>
  )
}