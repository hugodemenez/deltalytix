'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface HeaderSelectionProps {
  rawCsvData: string[][]
  setCsvData: React.Dispatch<React.SetStateAction<string[][]>>
  setHeaders: React.Dispatch<React.SetStateAction<string[]>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

export default function HeaderSelection({ rawCsvData, setCsvData, setHeaders, setError }: HeaderSelectionProps) {
  const [selectedHeaderIndex, setSelectedHeaderIndex] = useState<number>(0)

  const processHeaderSelection = useCallback((index: number, data: string[][]) => {
    const newHeaders = data[index].filter(header => header && header.trim() !== '')
    setHeaders(newHeaders)
    setCsvData(data.slice(index + 1))
    setError(null)
  }, [setCsvData, setHeaders, setError])

  useEffect(() => {
    if (rawCsvData.length > 0) {
      processHeaderSelection(selectedHeaderIndex, rawCsvData)
    }
  }, [rawCsvData, selectedHeaderIndex, processHeaderSelection])

  const handleHeaderSelection = (value: string) => {
    const index = parseInt(value, 10)
    setSelectedHeaderIndex(index)
  }

  return (
    <div className="space-y-4">
      <div className="max-h-[calc(80vh-200px)] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Select</TableHead>
              {rawCsvData[0]?.slice(0, 6).map((_, index) => (
                <TableHead key={index}>Column {index + 1}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rawCsvData.map((row: string[], rowIndex: number) => (
              <TableRow key={rowIndex}>
                <TableCell className="w-[50px]">
                  <RadioGroup value={selectedHeaderIndex.toString()} onValueChange={handleHeaderSelection}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={rowIndex.toString()} id={`row-${rowIndex}`} />
                    </div>
                  </RadioGroup>
                </TableCell>
                {row.slice(0, 6).map((cell: string, cellIndex: number) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}