import React, { useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface HeaderSelectionProps {
  rawCsvData: string[][]
  setCsvData: React.Dispatch<React.SetStateAction<string[][]>>
  setHeaders: React.Dispatch<React.SetStateAction<string[]>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

export default function HeaderSelection({ rawCsvData, setCsvData, setHeaders, setError }: HeaderSelectionProps) {
  const processHeaderSelection = useCallback((index: number, data: string[][]) => {
    const newHeaders = data[index].filter(header => header && header.trim() !== '')
    setHeaders(newHeaders)
    setCsvData(data.slice(index))
    setError(null)
  }, [setCsvData, setHeaders, setError]);

  useEffect(() => {
    if (rawCsvData.length > 0) {
      processHeaderSelection(0, rawCsvData)
    }
  }, [rawCsvData, processHeaderSelection]);

  return (
    <div className="space-y-4">
      <div className="max-h-[calc(80vh-200px)] overflow-auto">
        <Table>
          <TableBody>
            {rawCsvData.map((row: string[], rowIndex: number) => (
              <TableRow key={rowIndex}>
                <TableCell className="w-[50px]">
                  <RadioGroup defaultValue="0" onValueChange={(value) => processHeaderSelection(parseInt(value), rawCsvData)}>
                    <RadioGroupItem value={rowIndex.toString()} id={`row-${rowIndex}`} />
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