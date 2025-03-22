'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { ImportType } from './import-type-selection'
import { Progress } from "@/components/ui/progress"
import { XIcon, FileIcon, AlertCircle, ArrowUpCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { platforms } from './config/platforms'
import { Step } from './import-button'

interface FileUploadProps {
  importType: ImportType
  setRawCsvData: React.Dispatch<React.SetStateAction<string[][]>>
  setCsvData: React.Dispatch<React.SetStateAction<string[][]>>
  setHeaders: React.Dispatch<React.SetStateAction<string[]>>
  setStep: React.Dispatch<React.SetStateAction<Step>>
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
  const t = useI18n()

  const processFile = useCallback((file: File, index: number) => {
    return new Promise<void>((resolve, reject) => {
      // First read the first line to detect delimiter
      const reader = new FileReader();
      reader.onload = (e) => {
        const firstLine = e.target?.result?.toString().split('\n')[0] || '';
        const delimiter = firstLine.includes(';') ? ';' : ',';
        
        Papa.parse(file, {
          delimiter,
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
      };
      reader.onerror = () => {
        reject(new Error("Error reading file"))
      };
      reader.readAsText(file);
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

    try {
      const platform = platforms.find(p => p.type === importType)
      if (!platform) {
        throw new Error("Invalid import type")
      }

      // If platform doesn't have processFile (e.g., Rithmic Sync), skip processing
      if (!platform.processFile) {
        return
      }

      let concatenatedData: string[][] = []
      let headers: string[] = []

      parsedFiles.forEach((file, index) => {
        const { headers: fileHeaders, processedData } = platform.processFile!(file)
        if (index === 0) {
          headers = fileHeaders
          concatenatedData = processedData
        } else {
          concatenatedData = [...concatenatedData, ...processedData]
        }
      })

      console.log(headers, concatenatedData)
      setRawCsvData([headers, ...concatenatedData])
      setCsvData(concatenatedData)
      setHeaders(headers)

      // Find current step index and move to next step
      const currentStepIndex = platform.steps.findIndex(step => step.id === 'upload-file')
      if (currentStepIndex !== -1 && currentStepIndex < platform.steps.length - 1) {
        setStep(platform.steps[currentStepIndex + 1].id)
      }
      
      setError(null)
    } catch (error) {
      setError((error as Error).message)
    }
  }, [importType, parsedFiles, setRawCsvData, setCsvData, setHeaders, setStep, setError])

  useEffect(() => {
    if (parsedFiles.length > 0 && parsedFiles.length === uploadedFiles.length && Object.values(uploadProgress).every(progress => progress === 100)) {
      concatenateFiles()
    }
  }, [parsedFiles, uploadProgress, concatenateFiles, uploadedFiles.length])

  return (
    <div className="space-y-4 w-full h-full p-8 flex flex-col items-center justify-center">
      <div 
        {...getRootProps()} 
        className={cn(
          "h-80 w-full max-w-2xl border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 ease-in-out",
          "hover:border-primary/50 group relative",
          isDragActive 
            ? "border-primary bg-primary/5 scale-[0.99]" 
            : "border-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-900/50",
          "cursor-pointer flex items-center justify-center"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <ArrowUpCircle 
            className={cn(
              "h-14 w-14 transition-all duration-300 ease-bounce",
              isDragActive 
                ? "text-primary scale-110 -translate-y-2" 
                : "text-muted-foreground group-hover:text-primary group-hover:scale-110 group-hover:-translate-y-2"
            )} 
          />
          {isDragActive ? (
            <div className="space-y-2 relative">
              <p className="text-xl font-medium text-primary animate-in fade-in slide-in-from-bottom-2">
                {t('import.upload.dropHere')}
              </p>
              <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-3">
                {t('import.upload.weWillHandle')}
              </p>
            </div>
          ) : (
            <div className="space-y-2 relative">
              <p className="text-xl font-medium group-hover:text-primary transition-colors">
                {t('import.upload.dragAndDrop')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('import.upload.clickToBrowse')}
              </p>
            </div>
          )}
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500 w-full max-w-2xl">
          <h3 className="text-lg font-semibold">{t('import.upload.uploadedFiles')}</h3>
          {uploadedFiles.map((file, index) => (
            <div 
              key={index} 
              className={cn(
                "flex items-center justify-between",
                "bg-gray-100 dark:bg-gray-800 rounded-lg",
                "p-3 hover:bg-gray-200 dark:hover:bg-gray-700",
                "transition-all duration-200 ease-in-out",
                "animate-in slide-in-from-bottom fade-in",
                "group"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-2 rounded-md group-hover:bg-primary/20 transition-colors">
                  <FileIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('import.upload.fileSize', { size: (file.size / 1024).toFixed(1) })}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Progress 
                  value={uploadProgress[file.name] || 0} 
                  className="w-24 h-2"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XIcon className="h-4 w-4" />
                  <span className="sr-only">{t('import.upload.removeFile')}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <Alert className="animate-in slide-in-from-bottom-5 duration-700 w-full max-w-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('import.upload.note')}</AlertTitle>
          <AlertDescription>
            {t('import.upload.noteDescription')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}