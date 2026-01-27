'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Trade } from '@/prisma/generated/prisma/browser'

interface PdfProcessingState {
  // PDF processing data
  processedFiles: Array<{
    text: string
    csv: string[][]
    fileName: string
    fileSize: number
    textLength: number
    hasValidText: boolean
    extractionQuality: 'poor' | 'fair' | 'good'
  }>
  processedTrades: Trade[]
  processedHeaders: string[]
  processedCsvData: string[][]
  uploadedFiles: File[]
  isProcessingComplete: boolean
  
  // Actions
  setProcessedFiles: (files: PdfProcessingState['processedFiles']) => void
  setProcessedTrades: (trades: Trade[]) => void
  setProcessedHeaders: (headers: string[]) => void
  setProcessedCsvData: (data: string[][]) => void
  setUploadedFiles: (files: File[]) => void
  setIsProcessingComplete: (complete: boolean) => void
  clearPdfProcessingData: () => void
}

export const usePdfProcessingStore = create<PdfProcessingState>()(
  persist(
    (set) => ({
      // Initial state
      processedFiles: [],
      processedTrades: [],
      processedHeaders: [],
      processedCsvData: [],
      uploadedFiles: [],
      isProcessingComplete: false,
      
      // Actions
      setProcessedFiles: (files) => set({ processedFiles: files }),
      setProcessedTrades: (trades) => set({ processedTrades: trades }),
      setProcessedHeaders: (headers) => set({ processedHeaders: headers }),
      setProcessedCsvData: (data) => set({ processedCsvData: data }),
      setUploadedFiles: (files) => set({ uploadedFiles: files }),
      setIsProcessingComplete: (complete) => set({ isProcessingComplete: complete }),
      clearPdfProcessingData: () => set({
        processedFiles: [],
        processedTrades: [],
        processedHeaders: [],
        processedCsvData: [],
        uploadedFiles: [],
        isProcessingComplete: false,
      }),
    }),
    {
      name: 'pdf-processing-store',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for temporary data
      // Don't persist Files as they can't be serialized
      partialize: (state) => ({
        processedFiles: state.processedFiles,
        processedTrades: state.processedTrades,
        processedHeaders: state.processedHeaders,
        processedCsvData: state.processedCsvData,
        isProcessingComplete: state.isProcessingComplete,
        // uploadedFiles intentionally excluded
      }),
    }
  )
) 