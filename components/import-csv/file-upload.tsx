'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { ImportType } from './import-type-selection'
import { Progress } from "@/components/ui/progress"
import { XIcon, FileIcon, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  importType: ImportType
  setRawCsvData: React.Dispatch<React.SetStateAction<string[][]>>
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [parsedFiles, setParsedFiles] = useState<string[][][]>([])

  const processRithmicPerformanceCsv = useCallback((data: string[][]) => {
    const processedData: string[][] = [];
    let currentAccountNumber = '';
    let currentInstrument = '';
    let headers: string[] = [];

    const isAccountNumber = (value: string) => {
      return value.length > 8 &&
        !/^[A-Z]{3}\d$/.test(value) &&
        !/^\d+$/.test(value) &&
        value !== 'Account' &&
        value !== 'Entry Order Number';
    };

    const isInstrument = (value: string) => {
      // Match common futures instrument patterns:
      // - 2-4 uppercase letters followed by 1-2 digits (e.g. ESZ4, MESZ4, ZNH3)
      // - Optionally prefixed with 'M' for micro contracts
      const isIntrument = /^[A-Z]{2,4}\d{1,2}$/.test(value);
      isIntrument ? console.log(value, isIntrument) : null;
      return isIntrument;
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

    return { headers, processedData };
  }, []);

  const processRithmicOrdersCsv = useCallback((data: string[][]) => {
    const headerRowIndex = data.findIndex(row => row[0] === 'Completed Orders') + 1
    const headers = data[headerRowIndex].filter(header => header && header.trim() !== '')
    const processedData = data.slice(headerRowIndex + 1)
    return { headers, processedData };
  }, []);

  const processTradovateCsv = useCallback((data: string[][]) => {
    const headers = data[0].filter(header => header && header.trim() !== '')
    const processedData = data.slice(1)
    return { headers, processedData };
  }, []);

  const processTradezellaCsv = useCallback((data: string[][]) => {
    const headers = data[0].filter(header => header && header.trim() !== '')
    const processedData = data.slice(1)
    return { headers, processedData };
  }, []);

  const processCsv = useCallback((data: string[][]) => {
    if (data.length > 0) {
      const headers = data[0].filter(header => header && header.trim() !== '')
      return { headers, processedData: data.slice(1) };
    } else {
      throw new Error("The CSV file appears to be empty or invalid.")
    }
  }, [])

  const processFile = useCallback((file: File, index: number) => {
    return new Promise<void>((resolve, reject) => {
      Papa.parse(file, {
        complete: (result) => {
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            setParsedFiles(prevFiles => {
              const newFiles = [...prevFiles]
              newFiles[index] = result.data as string[][]
              return newFiles
            })
            setError(null)
            resolve()
          } else {
            reject(new Error("The CSV file appears to be empty or invalid."))
          }
        },
        error: (error) => {
          reject(new Error(`Error parsing CSV: ${error.message}`))
        }
      })
    })
  }, [setError])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prevFiles => [...prevFiles, ...acceptedFiles])
    acceptedFiles.forEach((file, index) => {
      const totalIndex = uploadedFiles.length + index
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))
      processFile(file, totalIndex)
        .then(() => {
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
        })
        .catch(error => {
          setError(error.message)
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))
        })
    })
  }, [processFile, setError, uploadedFiles.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const removeFile = (index: number) => {
    setUploadedFiles(prevFiles => prevFiles.filter((_, i) => i !== index))
    setParsedFiles(prevFiles => prevFiles.filter((_, i) => i !== index))
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[uploadedFiles[index].name]
      return newProgress
    })
  }

  const concatenateFiles = useCallback(() => {
    if (parsedFiles.length === 0) return

    let concatenatedData: string[][] = []
    let headers: string[] = []

    try {
      switch (importType) {
        case 'rithmic-performance':
          parsedFiles.forEach((file, index) => {
            const { headers: fileHeaders, processedData } = processRithmicPerformanceCsv(file)
            if (index === 0) {
              headers = fileHeaders
              concatenatedData = processedData
            } else {
              concatenatedData = [...concatenatedData, ...processedData]
            }
          })
          break
        case 'rithmic-orders':
          parsedFiles.forEach((file, index) => {
            const { headers: fileHeaders, processedData } = processRithmicOrdersCsv(file)
            if (index === 0) {
              headers = fileHeaders
              concatenatedData = processedData
            } else {
              concatenatedData = [...concatenatedData, ...processedData]
            }
          })
          break
        case 'tradovate':
          parsedFiles.forEach((file, index) => {
            const { headers: fileHeaders, processedData } = processTradovateCsv(file)
            if (index === 0) {
              headers = fileHeaders
              concatenatedData = processedData
            } else {
              concatenatedData = [...concatenatedData, ...processedData]
            }
          })
          break
        case 'tradezella':
          parsedFiles.forEach((file, index) => {
            const { headers: fileHeaders, processedData } = processTradezellaCsv(file)
            if (index === 0) {
              headers = fileHeaders
              concatenatedData = processedData
            } else {
              concatenatedData = [...concatenatedData, ...processedData]
            }
          })
          break
        default:
          parsedFiles.forEach((file, index) => {
            const { headers: fileHeaders, processedData } = processCsv(file)
            if (index === 0) {
              headers = fileHeaders
              concatenatedData = processedData
            } else {
              concatenatedData = [...concatenatedData, ...processedData]
            }
          })
          break
      }

      setRawCsvData([headers, ...concatenatedData])
      setCsvData(concatenatedData)
      setHeaders(headers)
      setStep(importType === 'rithmic-performance' || importType === 'rithmic-orders' ? 3 : 2)
      setError(null)
    } catch (error) {
      setError((error as Error).message)
    }
  }, [importType, parsedFiles, setRawCsvData, setCsvData, setHeaders, setStep, setError, processRithmicPerformanceCsv, processRithmicOrdersCsv, processTradovateCsv, processTradezellaCsv, processCsv])

  useEffect(() => {
    if (parsedFiles.length > 0 && Object.values(uploadProgress).every(progress => progress === 100)) {
      concatenateFiles()
    }
  }, [parsedFiles, uploadProgress, concatenateFiles])

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-lg">Drop the CSV files here ...</p>
        ) : (
          <p className="text-lg">Drag and drop CSV files here, or click to select files</p>
        )}
      </div>
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Uploaded Files:</h3>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
              <div className="flex items-center space-x-2">
                <FileIcon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Progress value={uploadProgress[file.name] || 0} className="w-24" />
                <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                  <XIcon className="h-4 w-4" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {uploadedFiles.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Note</AlertTitle>
          <AlertDescription>
            All uploaded files will be processed using the selected import type.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}