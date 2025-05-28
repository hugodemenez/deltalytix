import React, { useEffect, useState, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { XIcon, AlertTriangleIcon, InfoIcon, RefreshCwIcon, SparklesIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { ImportType } from './import-type-selection'
import { mappingSchema } from '@/app/api/ai/mappings/schema'
import { cn } from '@/lib/utils'
import { z } from 'zod'

type MappingObject = z.infer<typeof mappingSchema>
type MappingKey = keyof MappingObject

type ColumnConfig = {
  [key: string]: {
    defaultMapping: string[];
    required: boolean;
  };
};

const columnConfig: ColumnConfig = {
  "accountNumber": { defaultMapping: ["account", "accountnumber"], required: false },
  "instrument": { defaultMapping: ["symbol", "ticker"], required: true },
  "entryId": { defaultMapping: ["buyid", "buyorderid"], required: false },
  "closeId": { defaultMapping: ["sellid", "sellorderid"], required: false },
  "quantity": { defaultMapping: ["qty", "amount"], required: true },
  "entryPrice": { defaultMapping: ["buyprice", "entryprice"], required: true },
  "closePrice": { defaultMapping: ["sellprice", "exitprice"], required: true },
  "entryDate": { defaultMapping: ["buydate", "entrydate"], required: true },
  "closeDate": { defaultMapping: ["selldate", "exitdate"], required: true },
  "pnl": { defaultMapping: ["pnl", "profit"], required: true },
  "timeInPosition": { defaultMapping: ["timeinposition", "duration"], required: false },
  "side": { defaultMapping: ["side", "direction"], required: false },
  "commission": { defaultMapping: ["commission", "fee"], required: false },
}

const destinationColumns = Object.keys(columnConfig)

interface ColumnMappingProps {
  headers: string[];
  csvData: string[][];
  mappings: { [key: string]: string };
  setMappings: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  error: string | null;
  importType: ImportType;
}

export default function ColumnMapping({ headers, csvData, mappings, setMappings, error, importType }: ColumnMappingProps) {

  const { object, submit, isLoading } = useObject<MappingObject>({
    api: '/api/ai/mappings',
    schema: mappingSchema,
    onError(error) {
      console.error('Error generating AI mappings:', error);
    },
    onFinish({ object }) {
      
      setMappings(prev => {
        const newMappings = { ...prev };
        // For each destination column in the object
        if (object) {
          Object.entries(object).forEach(([destinationColumn, header]) => {
            // If this header exists in our CSV and isn't already mapped
            if (headers.includes(header) && !Object.values(prev).includes(destinationColumn)) {
              newMappings[header] = destinationColumn;
            }
          });
        }
        return newMappings;
      });

    }
  });

  const handleMapping = (header: string, value: string) => {
    setMappings(prev => {
      const newMappings = { ...prev }
      if (newMappings[header]) {
        delete newMappings[header]
      }
      Object.keys(newMappings).forEach(key => {
        if (newMappings[key] === value) {
          delete newMappings[key]
        }
      })
      newMappings[header] = value
      return newMappings
    })
  }

  const handleRemoveMapping = (header: string) => {
    setMappings(prev => {
      const newMappings = { ...prev }
      delete newMappings[header]
      return newMappings
    })
  }

  const getRemainingFieldsToMap = (): string[] => {
    return destinationColumns.filter(column =>
      !Object.values(mappings).includes(column)
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        {getRemainingFieldsToMap().length > 0 && (
          <div className="flex-none bg-yellow-100/50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 p-4 rounded-r mb-4" role="alert">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <SparklesIcon className="h-6 w-6 text-yellow-500 dark:text-yellow-400 animate-pulse" />
                  <div className="absolute -inset-1 bg-yellow-200 dark:bg-yellow-800 rounded-full blur-sm opacity-50 animate-ping" />
                </div>
                <div>
                  <p className="font-bold">Unmapped Fields</p>
                  <p className="text-sm mt-1">Use AI to automatically map your CSV columns to the correct fields.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => submit({ fieldColumns: headers, firstRows: csvData.slice(1, 6) })}
                className="flex items-center gap-2 bg-white/50 dark:bg-yellow-900/30 hover:bg-white/80 dark:hover:bg-yellow-900/50 text-yellow-700 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700 transition-colors"
              >
                <RefreshCwIcon className={cn("h-4 w-4", isLoading && "animate-spin")} />
                Use AI for mapping
              </Button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {getRemainingFieldsToMap().map((field, index) => (
            <span key={index} className={`bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm`}>
              {field}
              {columnConfig[field] && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {columnConfig[field].required ? <AlertTriangleIcon className="h-4 w-4 ml-1 text-red-500 inline" /> : <InfoIcon className="h-4 w-4 ml-1 text-yellow-500 inline" />}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{columnConfig[field].required ? "Required field" : "Optional field"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Your File Column</TableHead>
              <TableHead>Your Sample Data</TableHead>
              <TableHead>Destination Column</TableHead>
              <TableHead>Actions</TableHead>
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
                  <Select 
                    onValueChange={(value) => handleMapping(header, value)} 
                    value={Object.entries(object || {}).find(([_, value]) => value === header)?.[0]}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select one" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationColumns.map((column, i) => (
                        <SelectItem key={i} value={column} disabled={Object.values(mappings).includes(column) && mappings[header] !== column}>
                          {column}
                          {columnConfig[column].required && (
                            <span className="ml-1 text-yellow-500">*</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {mappings[header] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMapping(header)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  )
}