"use client";

import { Trade } from "@/prisma/generated/prisma/browser";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isValid } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils"; // Assuming you have a utility for className merging
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ChevronDown } from "lucide-react";
import { parsePositionTime } from "@/lib/utils";
import { useI18n } from "@/locales/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React from "react";
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { tradeSchema } from '@/app/api/ai/format-trades/schema'
import { z } from 'zod/v3';
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface FormatPreviewProps {
  trades: string[][];
  processedTrades: Partial<Trade>[];
  setProcessedTrades: (trades: Partial<Trade>[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  isLoading: boolean;
  headers: string[];
  mappings: { [key: string]: string };
}

function transformHeaders(headers: string[], mappings: { [key: string]: string }): string[] {
  return headers.map(header => {
    const mappingKey = Object.keys(mappings).find(key => key === header);
    return mappingKey ? mappings[mappingKey] : header;
  });
}

function transformRowData(rows: string[][], headers: string[], mappings: { [key: string]: string }): string[][] {
  return rows.map(row => {
    const transformedRow: string[] = [];
    
    // Create a mapping from unique ID to destination column and source index
    const uniqueIdToMapping: { [key: string]: { destination: string; sourceIndex: number } } = {};
    headers.forEach((header, index) => {
      const uniqueId = `${header}_${index}`;
      if (mappings[uniqueId]) {
        uniqueIdToMapping[uniqueId] = {
          destination: mappings[uniqueId],
          sourceIndex: index
        };
      }
    });
    
    // Get all unique destination columns that are mapped, in the order they appear in mappings
    const destinationColumns = [...new Set(Object.values(mappings))];
    
    // For each destination column, find the corresponding data using the unique ID
    destinationColumns.forEach(destColumn => {
      const mapping = Object.entries(uniqueIdToMapping).find(([_, mapping]) => mapping.destination === destColumn);
      if (mapping) {
        const [, { sourceIndex }] = mapping;
        transformedRow.push(row[sourceIndex] || '');
      } else {
        transformedRow.push('');
      }
    });
    
    return transformedRow;
  });
}


export function FormatPreview({
  trades: initialTrades,
  processedTrades,
  setProcessedTrades,
  setIsLoading,
  isLoading,
  headers,
  mappings,
}: FormatPreviewProps) {
  const t = useI18n();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Transform headers using mappings - get the destination columns in the correct order
  const transformedHeaders = useMemo(() => {
    const destinationColumns = [...new Set(Object.values(mappings))];
    return destinationColumns;
  }, [mappings]);

  // Calculate valid trades only when initialTrades changes
  const validTrades = useMemo(() =>
    initialTrades.filter(row => row.length > 0 && row[0] !== ""),
    [initialTrades]
  );

  const [error, setError] = useState<string | null>(null);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [processedBatches, setProcessedBatches] = useState<Set<number>>(new Set());
  const [processingBatches, setProcessingBatches] = useState<Set<number>>(new Set());
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [completedBatches, setCompletedBatches] = useState<Set<number>>(new Set());
  const [batchSet1, setBatchSet1] = useState<number[]>([]);
  const [batchSet2, setBatchSet2] = useState<number[]>([]);
  const [currentBatchIndex1, setCurrentBatchIndex1] = useState(0);
  const [currentBatchIndex2, setCurrentBatchIndex2] = useState(0);
  const batchSize = 5;
  const totalBatches = Math.ceil(validTrades.length / batchSize);

  // Use refs to avoid infinite loops in useEffect
  const processedTradesRef = useRef<Partial<Trade>[]>(processedTrades);
  const completedBatchesRef = useRef<Set<number>>(completedBatches);
  const batchSet1Ref = useRef<number[]>(batchSet1);
  const batchSet2Ref = useRef<number[]>(batchSet2);
  const currentBatchIndex1Ref = useRef<number>(currentBatchIndex1);
  const currentBatchIndex2Ref = useRef<number>(currentBatchIndex2);
  const isAutoProcessingRef = useRef<boolean>(isAutoProcessing);
  const isStoppedRef = useRef<boolean>(isStopped);
  
  // Update refs when state changes
  useEffect(() => {
    processedTradesRef.current = processedTrades;
  }, [processedTrades]);
  
  useEffect(() => {
    completedBatchesRef.current = completedBatches;
  }, [completedBatches]);
  
  useEffect(() => {
    batchSet1Ref.current = batchSet1;
  }, [batchSet1]);
  
  useEffect(() => {
    batchSet2Ref.current = batchSet2;
  }, [batchSet2]);
  
  useEffect(() => {
    currentBatchIndex1Ref.current = currentBatchIndex1;
  }, [currentBatchIndex1]);
  
  useEffect(() => {
    currentBatchIndex2Ref.current = currentBatchIndex2;
  }, [currentBatchIndex2]);
  
  useEffect(() => {
    isAutoProcessingRef.current = isAutoProcessing;
  }, [isAutoProcessing]);
  
  useEffect(() => {
    isStoppedRef.current = isStopped;
  }, [isStopped]);

  // Split batches into two sets
  const splitBatches = () => {
    const allBatches = Array.from({ length: totalBatches }, (_, i) => i);
    const set1: number[] = [];
    const set2: number[] = [];
    
    allBatches.forEach((batch, index) => {
      if (index % 2 === 0) {
        set1.push(batch);
      } else {
        set2.push(batch);
      }
    });
    
    setBatchSet1(set1);
    setBatchSet2(set2);
    setCurrentBatchIndex1(0);
    setCurrentBatchIndex2(0);
    
    console.log(`Split batches - Set 1: ${set1.join(', ')}, Set 2: ${set2.join(', ')}`);
  };

  // First useObject instance - processes batchSet1
  const { 
    object: object1, 
    submit: submit1, 
    isLoading: isProcessing1 
  } = useObject({
    api: '/api/ai/format-trades',
    schema: z.array(tradeSchema),
    onError(error) {
      console.error('Error processing batch set 1:', error);
      setError(`Failed to process batch set 1: ${error.message}`);
    },
    onFinish() {
      console.log('useObject 1 streaming completed');
      const currentBatch = batchSet1Ref.current[currentBatchIndex1Ref.current];
      if (currentBatch !== undefined) {
        console.log(`Batch ${currentBatch} completed by instance 1`);
        setCompletedBatches(prev => {
          const newSet = new Set([...prev, currentBatch]);
          console.log(`Completed batches now: ${Array.from(newSet).join(', ')}`);
          return newSet;
        });
        
        // Move to next batch in set 1
        setCurrentBatchIndex1(prev => {
          const newIndex = prev + 1;
          console.log(`Set 1 index moved from ${prev} to ${newIndex}`);
          return newIndex;
        });
        
        // Check if all batches are completed
        if (completedBatchesRef.current.size + 1 === totalBatches) {
          console.log('All batches completed, stopping auto-processing');
          setIsAutoProcessing(false);
        } else if (isAutoProcessingRef.current && !isStoppedRef.current) {
          // Process next batch in set 1 if available and not stopped
          setTimeout(() => {
            processNextBatchInSet1();
          }, 500);
        }
      }
    }
  });

  // Second useObject instance - processes batchSet2
  const { 
    object: object2, 
    submit: submit2, 
    isLoading: isProcessing2 
  } = useObject({
    api: '/api/ai/format-trades',
    schema: z.array(tradeSchema),
    onError(error) {
      console.error('Error processing batch set 2:', error);
      setError(`Failed to process batch set 2: ${error.message}`);
    },
    onFinish() {
      console.log('useObject 2 streaming completed');
      const currentBatch = batchSet2Ref.current[currentBatchIndex2Ref.current];
      if (currentBatch !== undefined) {
        console.log(`Batch ${currentBatch} completed by instance 2`);
        setCompletedBatches(prev => {
          const newSet = new Set([...prev, currentBatch]);
          console.log(`Completed batches now: ${Array.from(newSet).join(', ')}`);
          return newSet;
        });
        
        // Move to next batch in set 2
        setCurrentBatchIndex2(prev => {
          const newIndex = prev + 1;
          console.log(`Set 2 index moved from ${prev} to ${newIndex}`);
          return newIndex;
        });
        
        // Check if all batches are completed
        if (completedBatchesRef.current.size + 1 === totalBatches) {
          console.log('All batches completed, stopping auto-processing');
          setIsAutoProcessing(false);
        } else if (isAutoProcessingRef.current && !isStoppedRef.current) {
          // Process next batch in set 2 if available and not stopped
          setTimeout(() => {
            processNextBatchInSet2();
          }, 500);
        }
      }
    }
  });

  const isProcessing = isProcessing1 || isProcessing2;

  // Process next batch in set 1
  const processNextBatchInSet1 = () => {
    const currentIndex = currentBatchIndex1Ref.current;
    const batchSet = batchSet1Ref.current;
    
    console.log(`processNextBatchInSet1 - currentIndex: ${currentIndex}, batchSet: ${batchSet.join(', ')}, length: ${batchSet.length}`);
    
    if (currentIndex < batchSet.length) {
      const nextBatch = batchSet[currentIndex];
      console.log(`Processing batch ${nextBatch} in set 1 (index ${currentIndex})`);
      const batchData = getBatchData(nextBatch);
      console.log('=== BATCH DATA DEBUG ===');
      console.log('Original headers:', headers);
      console.log('Mappings:', mappings);
      console.log('Transformed headers:', transformedHeaders);
      console.log('Transformed rows:', batchData);
      submit1({
        headers: transformedHeaders,
        rows: batchData
      });
    } else {
      console.log('No more batches in set 1 - reached end of set');
    }
  };

  // Process next batch in set 2
  const processNextBatchInSet2 = () => {
    const currentIndex = currentBatchIndex2Ref.current;
    const batchSet = batchSet2Ref.current;
    
    console.log(`processNextBatchInSet2 - currentIndex: ${currentIndex}, batchSet: ${batchSet.join(', ')}, length: ${batchSet.length}`);
    
    if (currentIndex < batchSet.length) {
      const nextBatch = batchSet[currentIndex];
      console.log(`Processing batch ${nextBatch} in set 2 (index ${currentIndex})`);
      const batchData = getBatchData(nextBatch);
      console.log('=== BATCH DATA DEBUG (Set 2) ===');
      console.log('Original headers:', headers);
      console.log('Mappings:', mappings);
      console.log('Transformed headers:', transformedHeaders);
      console.log('Transformed rows:', batchData);
      submit2({
        headers: transformedHeaders,
        rows: batchData
      });
    } else {
      console.log('No more batches in set 2 - reached end of set');
    }
  };

  const startProcessing = () => {
    setIsAutoProcessing(true);
    setIsStopped(false);
    splitBatches();
    // Start both instances with their first batches after a small delay to ensure state is updated
    setTimeout(() => {
      processNextBatchInSet1();
      processNextBatchInSet2();
    }, 100);
  };

  const stopProcessing = () => {
    console.log('Stop processing clicked - stopping auto-processing');
    setIsAutoProcessing(false);
    setIsStopped(true);
    
    // Don't mark currently processing batches as completed - let them finish naturally
    // The onFinish callbacks will handle completion when they finish streaming
    console.log('Stopped - current batches will finish streaming but no new ones will start');
  };

  const resetProcessing = () => {
    setIsAutoProcessing(false);
    setIsStopped(false);
    setCurrentBatch(0);
    setProcessedTrades([]);
    setCompletedBatches(new Set());
    setBatchSet1([]);
    setBatchSet2([]);
    setCurrentBatchIndex1(0);
    setCurrentBatchIndex2(0);
    processedTradesRef.current = [];
  };

  const getBatchData = (batchIndex: number) => {
    const startIndex = batchIndex * batchSize;
    const endIndex = Math.min(startIndex + batchSize, validTrades.length);
    const batchRows = validTrades.slice(startIndex, endIndex);
    return transformRowData(batchRows, headers, mappings);
  };

  const batchToProcess = useMemo(() => {
    const startIndex = currentBatch * batchSize;
    const endIndex = Math.min(startIndex + batchSize, validTrades.length);
    return validTrades.slice(startIndex, endIndex);
  }, [currentBatch, validTrades, batchSize]);


  // Handle streaming results from first useObject
  useEffect(() => {
    if (object1) {
      const newTrades = object1.filter((trade): trade is NonNullable<typeof trade> => trade !== undefined) as Trade[];
      const uniqueTrades = newTrades.filter(newTrade =>
        !processedTradesRef.current.some(existingTrade =>
          existingTrade.entryDate === newTrade.entryDate &&
          existingTrade.instrument === newTrade.instrument &&
          existingTrade.quantity === newTrade.quantity &&
          existingTrade.side === newTrade.side &&
          existingTrade.entryPrice === newTrade.entryPrice &&
          existingTrade.closePrice === newTrade.closePrice &&
          existingTrade.pnl === newTrade.pnl &&
          existingTrade.commission === newTrade.commission &&
          existingTrade.timeInPosition === newTrade.timeInPosition
        )
      );
      setProcessedTrades([...processedTradesRef.current, ...uniqueTrades]);
      
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [object1])

  // Handle streaming results from second useObject
  useEffect(() => {
    if (object2) {
      const newTrades = object2.filter((trade): trade is NonNullable<typeof trade> => trade !== undefined) as Trade[];
      const uniqueTrades = newTrades.filter(newTrade =>
        !processedTradesRef.current.some(existingTrade =>
          existingTrade.entryDate === newTrade.entryDate &&
          existingTrade.instrument === newTrade.instrument &&
          existingTrade.quantity === newTrade.quantity &&
          existingTrade.side === newTrade.side &&
          existingTrade.entryPrice === newTrade.entryPrice &&
          existingTrade.closePrice === newTrade.closePrice &&
          existingTrade.pnl === newTrade.pnl &&
          existingTrade.commission === newTrade.commission &&
          existingTrade.timeInPosition === newTrade.timeInPosition
        )
      );
      setProcessedTrades([...processedTradesRef.current, ...uniqueTrades]);
      
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [object2])

  const columns = useMemo<ColumnDef<Partial<Trade>>[]>(() => [
    {
      accessorKey: "entryDate",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.entryDate')}</div>
      ),
      cell: ({ row }) => {
        const entryDate = row.original.entryDate ? new Date(row.original.entryDate) : null;
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'entryDate')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {entryDate && isValid(entryDate) ? format(entryDate, "yyyy-MM-dd HH:mm") : "Invalid Date"}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 180,
    },
    {
      accessorKey: "instrument",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.instrument')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'instrument')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {row.original.instrument}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
    {
      accessorKey: "side",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.direction')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'side')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="capitalize">{row.original.side}</span>
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 100,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.quantity')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'quantity')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {row.original.quantity}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 100,
    },
    {
      accessorKey: "entryPrice",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.entryPrice')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'entryPrice')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                ${row.original.entryPrice}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
    {
      accessorKey: "closePrice",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.exitPrice')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'closePrice')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                ${row.original.closePrice}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.pnl')}</div>
      ),
      cell: ({ row }) => {
        const pnl = row.original.pnl ?? 0;
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'pnl')];
        const originalPnl = originalData ? parseFloat(originalData.replace(/[,$]/g, '')) : null;
        const isMismatch = originalPnl !== null && Math.abs(pnl - originalPnl) > 0.01;
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1">
                  <span className={pnl >= 0 ? "text-green-600" : "text-red-600"}>
                    ${pnl.toFixed(2)}
                  </span>
                  {isMismatch && (
                    <span className="text-orange-500 text-xs" title="PnL value doesn't match original data">
                      ⚠️
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <div className="space-y-1">
                    <p>Original: {originalData}</p>
                    {isMismatch && (
                      <p className="text-orange-500 text-sm">
                        ⚠️ Mismatch detected! Expected: ${originalPnl?.toFixed(2)}, Got: ${pnl.toFixed(2)}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
    {
      accessorKey: "commission",
      header: ({ column }) => (
        <div className="font-medium">{t('calendar.modal.commission')}</div>
      ),
      cell: ({ row }) => {
        const commission = row.original.commission ?? 0;
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'commission')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                ${commission.toFixed(2)}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
    {
      accessorKey: "timeInPosition",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.positionTime')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'timeInPosition')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {parsePositionTime(row.original.timeInPosition || 0)}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
  ], [t, validTrades, headers, mappings]);

  const table = useReactTable({
    data: processedTrades,
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      size: 400,
      minSize: 100,
    },
  });

  const scrollToBottom = () => {
    if (tableContainerRef.current) {
      const scrollContainer = tableContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  // Calculate totals for footer
  const totals = useMemo(() => {
    const totalPnl = processedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalCommission = processedTrades.reduce((sum, trade) => sum + (trade.commission || 0), 0);
    const netPnl = totalPnl - totalCommission;
    
    return {
      totalPnl,
      totalCommission,
      netPnl
    };
  }, [processedTrades]);



  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          {processedTrades.filter(trade => trade.entryDate).length} of {validTrades.length} trades formatted
        </p>
            <p className="text-xs text-muted-foreground">
              Batches: {completedBatches.size}/{totalBatches} completed
              {processingBatches.size > 0 && `, ${processingBatches.size} processing`}
            </p>
          </div>
          {isAutoProcessing && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">{t('import.processing.autoProcessing')}</span>
            </div>
          )}
          {!isAutoProcessing && completedBatches.size === totalBatches && totalBatches > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600 font-medium">{t('import.processing.allBatchesCompleted')}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isAutoProcessing && completedBatches.size === 0 && (
            <Button
              onClick={startProcessing}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? t('import.processing.starting') : t('import.processing.startProcessing')}
            </Button>
          )}
          
          {isAutoProcessing && (
            <Button
              onClick={stopProcessing}
              variant="destructive"
            >
              {t('import.processing.stopProcessing')}
            </Button>
          )}
          
          {!isAutoProcessing && completedBatches.size > 0 && (
        <Button
              onClick={startProcessing}
              disabled={isProcessing}
          variant="outline"
        >
              {isProcessing ? t('import.processing.resuming') : t('import.processing.resumeProcessing')}
        </Button>
          )}
          
          <Button
            onClick={resetProcessing}
            disabled={isProcessing}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
        >
          {t('import.processing.reset')}
          </Button>
        </div>
      </div>
      
      {/* Progress Bar */}
      {totalBatches > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('import.processing.processingProgress')}</span>
            <span>{Math.round((completedBatches.size / totalBatches) * 100)}%</span>
          </div>
          <Progress 
            value={(completedBatches.size / totalBatches) * 100} 
            className="h-2"
          />
        </div>
      )}
      
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background shadow-xs">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap px-4 py-3 text-left text-sm"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
          </Table>
          <ScrollArea className="flex-1" ref={tableContainerRef}>
            <Table>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className={cn(
                          "border-b transition-colors hover:bg-muted",
                          row.getIsExpanded()
                            ? "bg-muted"
                            : row.getCanExpand()
                              ? ""
                              : "bg-muted/50"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="whitespace-nowrap px-4 py-2.5 text-sm"
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                ) : isProcessing || (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
                {isProcessing && (
                  <TableRow>
                    {columns.map((column, index) => (
                      <TableCell
                        key={`loading-${index}`}
                        className="whitespace-nowrap px-4 py-2.5 text-sm"
                        style={{ width: column.size }}
                      >
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {/* Table Footer with Totals */}
          {processedTrades.length > 0 && (
            <div className="border-t bg-muted/30">
              <Table>
                <TableBody>
                  <TableRow className="font-medium">
                    <TableCell className="px-4 py-3 text-sm font-semibold">
                      {t('trade-table.footer.totalPnl')}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <span className={totals.totalPnl >= 0 ? "text-green-600" : "text-red-600"}>
                        ${totals.totalPnl.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-semibold">
                      {t('trade-table.footer.totalCommission')}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      ${totals.totalCommission.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-semibold">
                      {t('trade-table.footer.netPnl')}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <span className={totals.netPnl >= 0 ? "text-green-600" : "text-red-600"}>
                        ${totals.netPnl.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}