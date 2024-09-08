import React, { useEffect, useState, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { XIcon, AlertTriangleIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { generateCsvMapping } from '@/lib/generate-csv-mappings'
import { readStreamableValue } from 'ai/rsc'
import { ImportType } from './import-type-selection'

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
  const [isGeneratingMappings, setIsGeneratingMappings] = useState(false);

  const generateAIMappings = useCallback(async () => {
    setIsGeneratingMappings(true);
    try {
      const firstRows = csvData.slice(1, 6).map(row => {
        const rowData: Record<string, string> = {};
        headers.forEach((header, i) => {
          rowData[header] = row[i];
        });
        return rowData;
      });
      const aiMappings = await generateCsvMapping(headers, firstRows);

      const newMappings: { [key: string]: string } = {};

      for await (const partialObject of readStreamableValue(aiMappings.object)) {
        if (partialObject) {
          Object.entries(partialObject).forEach(([field, value]) => {
            if (typeof value === 'string' && headers.includes(value) && Object.keys(columnConfig).includes(field)) {
              newMappings[value] = field;
            }
          });
        }
      }

      if (importType === 'rithmic') {
        newMappings['AccountNumber'] = 'accountNumber';
        newMappings['Instrument'] = 'instrument';
      }

      headers.forEach(header => {
        if (!newMappings[header]) {
          const defaultMapping = Object.entries(columnConfig).find(([_, config]) =>
            config.defaultMapping.includes(header.toLowerCase())
          );
          if (defaultMapping) {
            newMappings[header] = defaultMapping[0];
          }
        }
      });

      setMappings(newMappings);
    } catch (error) {
      console.error('Error generating AI mappings:', error);
    } finally {
      setIsGeneratingMappings(false);
    }
  }, [headers, csvData, setMappings, importType]);

  useEffect(() => {
    generateAIMappings();
  }, [generateAIMappings]);

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

  if (isGeneratingMappings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Remaining Fields to Map:</h3>
        <div className="flex flex-wrap gap-2">
          {getRemainingFieldsToMap().map((field, index) => (
            <span key={index} className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-sm">
              {field}
              {columnConfig[field].required && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangleIcon className="h-4 w-4 ml-1 text-yellow-500 inline" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Required field</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </span>
          ))}
        </div>
      </div>
      <div className="max-h-[calc(80vh-300px)] overflow-auto">
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
                  <Select onValueChange={(value) => handleMapping(header, value)} value={mappings[header] || undefined}>
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