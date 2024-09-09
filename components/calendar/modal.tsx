import React from "react"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, parsePositionTime } from "@/lib/utils"
import { Trade } from "@prisma/client"
import { CalendarEntry } from "@/components/calendar/calendar-pnl"

interface CalendarModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  dayData: CalendarEntry | undefined;
  aiComment: string;
  aiEmotion: string;
  isLoading: boolean;
  handleGenerateComment: (dayData: CalendarEntry, dateString: string) => Promise<void>;
}

export function CalendarModal({
  isOpen,
  onOpenChange,
  selectedDate,
  dayData,
  aiComment,
  aiEmotion,
  isLoading,
  handleGenerateComment
}: CalendarModalProps) {
  if (!selectedDate) return null;

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{format(selectedDate, 'MMMM d, yyyy')}</DialogTitle>
          <DialogDescription>
            Trade details and AI-generated comment for this day.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col overflow-hidden">
          <ScrollArea className="flex-grow">
            <div className="space-y-4 pr-4">
              {dayData && dayData.trades.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-background z-10">Instrument</TableHead>
                      <TableHead className="sticky top-0 bg-background z-10">Side</TableHead>
                      <TableHead className="sticky top-0 bg-background z-10">PnL</TableHead>
                      <TableHead className="sticky top-0 bg-background z-10">Commission</TableHead>
                      <TableHead className="sticky top-0 bg-background z-10">Time in Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayData.trades.map((trade: Trade) => (
                      <TableRow key={trade.id}>
                        <TableCell>{trade.instrument}</TableCell>
                        <TableCell>{trade.side}</TableCell>
                        <TableCell className={cn(
                          trade.pnl >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        )}>
                          ${trade.pnl.toFixed(2)}
                        </TableCell>
                        <TableCell>${(trade.commission).toFixed(2)}</TableCell>
                        <TableCell>{parsePositionTime(trade.timeInPosition)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p>No trades for this day.</p>
              )}
            </div>
          </ScrollArea>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">AI-Generated Comment</h3>
            {aiComment ? (
              <>
                <p>{aiComment}</p>
                <p className="text-sm text-muted-foreground mt-1">Emotion: {aiEmotion}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No comment generated yet.</p>
            )}
          </div>
          <Button 
            onClick={() => dayData && handleGenerateComment(dayData, dateString)}
            disabled={isLoading || !dayData}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating and Saving...
              </>
            ) : (
              'Generate and Save AI Comment'
            )}
          </Button>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => window.open(`/trades/${dateString}`, '_blank')}>
            View Full Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}