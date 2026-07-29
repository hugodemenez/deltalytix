'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { ImportType } from './import-type-selection'
import { Progress } from "@/components/ui/progress"
import { XIcon, FileIcon, ArrowUpCircle } from 'lucide-react'
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
    <div className="flex h-full w-full flex-col items-center justify-center space-y-4 py-2">
      <div
        {...getRootProps()}
        className={cn(
          "group relative flex h-80 w-full max-w-2xl cursor-pointer items-center justify-center rounded-sm border border-dashed p-12 text-center transition-[background-color,border-color,transform] duration-150",
          isDragActive
            ? "scale-[0.99] border-black/40 bg-black/5 dark:border-white/40 dark:bg-white/5"
            : "border-black/20 hover:border-black/40 hover:bg-black/5 dark:border-white/20 dark:hover:border-white/40 dark:hover:bg-white/5"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <ArrowUpCircle
            className={cn(
              "h-12 w-12 transition-[color,transform] duration-150",
              isDragActive
                ? "-translate-y-1 text-black dark:text-white"
                : "text-black/45 group-hover:-translate-y-1 group-hover:text-black dark:text-white/45 dark:group-hover:text-white"
            )}
          />
          {isDragActive ? (
            <div className="space-y-2">
              <p className="text-xl font-normal tracking-tight">
                {t('import.upload.dropHere')}
              </p>
              <p className="text-sm text-black/55 dark:text-white/55">
                {t('import.upload.weWillHandle')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xl font-normal tracking-tight transition-colors duration-150">
                {t('import.upload.dragAndDrop')}
              </p>
              <p className="text-sm text-black/55 dark:text-white/55">
                {t('import.upload.clickToBrowse')}
              </p>
            </div>
          )}
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="w-full max-w-2xl space-y-2">
          <h3 className="text-lg font-normal tracking-tight">{t('import.upload.uploadedFiles')}</h3>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="group flex items-center justify-between rounded-sm border border-black/10 px-3 py-3 transition-colors duration-150 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
            >
              <div className="flex items-center space-x-3">
                <div className="rounded-sm bg-black/5 p-2 dark:bg-white/5">
                  <FileIcon className="h-5 w-5 text-black/55 dark:text-white/55" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-black/45 dark:text-white/45">
                    {t('import.upload.fileSize', { size: (file.size / 1024).toFixed(1) })}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Progress
                  value={uploadProgress[file.name] || 0}
                  className="h-2 w-24"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                >
                  <XIcon className="h-4 w-4" />
                  <span className="sr-only">{t('import.upload.removeFile')}</span>
                </Button>
              </div>
            </div>
          ))}
          <p className="border-t border-black/10 pt-4 text-sm leading-relaxed text-black/55 dark:border-white/10 dark:text-white/55">
            <span className="font-medium text-black dark:text-white">{t('import.upload.note')}</span>
            {' '}
            {t('import.upload.noteDescription')}
          </p>
        </div>
      )}
    </div>
  )
}