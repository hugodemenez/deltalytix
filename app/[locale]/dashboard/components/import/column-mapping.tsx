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
import { z } from 'zod/v3';

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

// Helper function to create unique column identifiers
const createUniqueColumnId = (header: string, index: number) => `${header}_${index}`;

// Helper function to get display name for duplicate columns
const getColumnDisplayName = (header: string, index: number, headers: string[]) => {
  const duplicateCount = headers.filter(h => h === header).length;
  return duplicateCount > 1 ? `${header} (${index + 1})` : header;
};

export default function ColumnMapping({ headers, csvData, mappings, setMappings, error, importType }: ColumnMappingProps) {

  const { object, submit, isLoading } = useObject({
    api: '/api/ai/mappings',
    schema: mappingSchema,
    onError(error) {
      console.error('Error generating AI mappings:', error);
    },
    onFinish({ object }) {
      console.log('=== AI MAPPING DEBUG ===');
      console.log('AI Response Object:', object);
      console.log('Headers:', headers);
      
      setMappings(prev => {
        const newMappings = { ...prev };
        // For each destination column in the object
        if (object) {
          Object.entries(object).forEach(([destinationColumn, headerValue]) => {
            if (typeof headerValue !== "string" || headerValue.length === 0) {
              return;
            }
            console.log(`Processing: ${destinationColumn} -> ${headerValue}`);

            // Check if the header value includes position information (e.g., "Prix_1", "Prix_2")
            const positionMatch = headerValue.match(/^(.+)_(\d+)$/);
            
            if (positionMatch) {
              // Handle position-based mapping
              const [, headerName, positionStr] = positionMatch;
              const position = parseInt(positionStr, 10) - 1; // Convert to 0-based index
              
              console.log(`Position-based mapping: ${headerName} at position ${position + 1}`);
              
              // Find the header at the specific position
              if (position >= 0 && position < headers.length && headers[position] === headerName) {
                const uniqueId = createUniqueColumnId(headerName, position);
                console.log(`Mapped to unique ID: ${uniqueId}`);
                // Remove any existing mapping for this unique column first
                if (newMappings[uniqueId]) {
                  delete newMappings[uniqueId];
                }
                newMappings[uniqueId] = destinationColumn;
              } else {
                console.log(`Position ${position + 1} not found or header mismatch`);
              }
            } else {
              // Handle regular mapping (fallback for backward compatibility)
              console.log(`Regular mapping for: ${headerValue}`);
              const headerIndex = headers.findIndex(h => h === headerValue);
              if (headerIndex !== -1 && !Object.values(newMappings).includes(destinationColumn)) {
                const uniqueId = createUniqueColumnId(headerValue, headerIndex);
                console.log(`Mapped to unique ID: ${uniqueId}`);
                // Remove any existing mapping for this unique column first
                if (newMappings[uniqueId]) {
                  delete newMappings[uniqueId];
                }
                newMappings[uniqueId] = destinationColumn;
              } else {
                console.log(`Header ${headerValue} not found or already mapped`);
              }
            }
          });
        }
        console.log('Final mappings:', newMappings);
        return newMappings;
      });

    }
  });

  const handleMapping = (uniqueId: string, value: string) => {
    setMappings(prev => {
      const newMappings = { ...prev }
      
      // Remove any existing mapping for this unique column
      if (newMappings[uniqueId]) {
        delete newMappings[uniqueId]
      }
      
      // Remove any other column that was mapped to the same destination
      Object.keys(newMappings).forEach(key => {
        if (newMappings[key] === value) {
          delete newMappings[key]
        }
      })
      
      // Only add the new mapping if a destination was selected
      if (value) {
        newMappings[uniqueId] = value
      }
      
      return newMappings
    })
  }

  const handleRemoveMapping = (uniqueId: string) => {
    setMappings(prev => {
      const newMappings = { ...prev }
      delete newMappings[uniqueId]
      return newMappings
    })
  }

  const handleUnmapAll = () => {
    setMappings({})
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
                  <div className="absolute -inset-1 bg-yellow-200 dark:bg-yellow-800 rounded-full blur-xs opacity-50 animate-ping" />
                </div>
                <div>
                  <p className="font-bold">Unmapped Fields</p>
                  <p className="text-sm mt-1">Use AI to automatically map your CSV columns to the correct fields.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Convert CSV data to array of objects for AI analysis
                  const sampleData = csvData.slice(1, 6).map(row => {
                    const rowObj: Record<string, string> = {};
                    headers.forEach((header, index) => {
                      rowObj[header] = row[index] || '';
                    });
                    return rowObj;
                  });
                  submit({ fieldColumns: headers, firstRows: sampleData });
                }}
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
              <TableHead className="flex items-center gap-2">
                Actions
                {Object.keys(mappings).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnmapAll}
                    className="h-6 w-6 p-0"
                    title="Unmap all fields"
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headers.map((header, index) => {
              const uniqueId = createUniqueColumnId(header, index);
              const displayName = getColumnDisplayName(header, index, headers);
              return (
                <TableRow key={uniqueId}>
                  <TableCell>{displayName}</TableCell>
                  <TableCell>
                    {csvData.slice(1, 4).map((row, i) => (
                      <span key={i} className="mr-2">{row[index]}</span>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Select 
                      onValueChange={(value) => handleMapping(uniqueId, value)} 
                      value={mappings[uniqueId] || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select one" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinationColumns.map((column, i) => {
                          const isAlreadyMapped = Object.values(mappings).includes(column) && mappings[uniqueId] !== column;
                          return (
                            <SelectItem 
                              key={i} 
                              value={column} 
                              disabled={isAlreadyMapped}
                              className={isAlreadyMapped ? "opacity-50 cursor-not-allowed" : ""}
                            >
                              {column}
                              {columnConfig[column].required && (
                                <span className="ml-1 text-yellow-500">*</span>
                              )}
                              {isAlreadyMapped && (
                                <span className="ml-2 text-xs text-muted-foreground">(already mapped)</span>
                              )}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {mappings[uniqueId] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMapping(uniqueId)}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  )
}