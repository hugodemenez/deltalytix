"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useI18n } from '@/locales/client'
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, FileText, Upload, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PdfUploadProps {
  setText: React.Dispatch<React.SetStateAction<string>>
  setFiles: React.Dispatch<React.SetStateAction<File[]>>
}

export default function PdfUpload({
  setText,
  setFiles,
}: PdfUploadProps) {
  const t = useI18n()
  const [files, setLocalFiles] = useState<File[]>([])
  const [rawOcrData, setRawOcrData] = useState<string>('')
  const [showRawData, setShowRawData] = useState(false)
  const [showProcessing, setShowProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<{
    status: string
    step: string
    message: string
    progress: number
  } | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setText('')
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf')
    setLocalFiles(prev => [...prev, ...pdfFiles])
    setFiles(prev => [...prev, ...pdfFiles])
    // Process each PDF file to extract text
    for (const file of pdfFiles) {
      try {
        setShowProcessing(true)
        setProcessingStatus({
          status: 'processing',
          step: 'ocr',
          message: `Processing ${file.name}...`,
          progress: 0
        })

        const formData = new FormData()
        formData.append('attachments', file)

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer()
        const base64Content = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuffer))
        )

        const response = await fetch('/api/imports/ibkr/ocr', {
          method: 'POST',
          body: JSON.stringify({
            attachments: [{
              name: file.name,
              type: file.type,
              content: base64Content
            }]
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to process ${file.name}`)
        }

        const data = await response.json()
        setRawOcrData(prev => prev + '\n\n' + data.text)
        setText(prev => prev + '\n\n' + data.text)

        setProcessingStatus({
          status: 'success',
          step: 'ocr',
          message: `Successfully processed ${file.name}`,
          progress: 100
        })
      } catch (error) {
        console.error('Error processing PDF:', error)
        setProcessingStatus({
          status: 'error',
          step: 'ocr',
          message: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          progress: 0
        })
      }
    }
    setShowProcessing(false)
  }, [setLocalFiles, setText])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  })

  const removeFile = useCallback((index: number) => {
    setLocalFiles(prev => prev.filter((_, i) => i !== index))
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [setLocalFiles, setFiles])


  return (
    <div className="flex flex-col h-full">
      <div className="flex-none space-y-4 mb-4">
        <h2 className="text-xl font-semibold text-center">
          {t('import.upload.title')}
        </h2>
        <p className="text-sm text-muted-foreground text-center">
          {t('import.upload.description')}
        </p>
      </div>

      <div className="flex-none mb-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragActive ? t('import.upload.dragActive') : t('import.upload.dragInactive')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('import.upload.supportedFormats')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showProcessing && processingStatus && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{processingStatus.message}</AlertTitle>
          <AlertDescription>
            {processingStatus.step === 'ocr' && 'Extracting text from PDF...'}
          </AlertDescription>
        </Alert>
      )}

      {files.length > 0 && (
        <div className="flex-1 min-h-0">
          <div className="flex-none mb-2">
            <h3 className="text-sm font-medium">
              {t('import.upload.selectedFiles')}
            </h3>
          </div>
          <ScrollArea className="h-[calc(100%-2rem)] rounded-md border">
            <div className="p-2 space-y-1">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <FileText className="w-4 h-4 flex-none text-muted-foreground" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground flex-none">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="h-6 w-6 flex-none"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <Dialog open={showRawData} onOpenChange={setShowRawData}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('import.upload.rawOcrData')}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <pre className="p-4 bg-muted rounded-lg overflow-x-auto">
              {rawOcrData}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
} 