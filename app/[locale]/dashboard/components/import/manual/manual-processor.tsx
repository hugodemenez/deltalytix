'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from 'sonner'
import { Trade } from '@/prisma/generated/prisma/browser'
import { useI18n } from '@/locales/client'
import { useTradesStore } from '@/store/trades-store'
import { generateTradeHash } from '@/lib/utils'
import { PlatformProcessorProps } from '../config/platforms'
import { Plus, Trash2, Edit2 } from 'lucide-react'

interface TradeFormData {
  instrument: string
  side: 'long' | 'short'
  quantity: number
  entryPrice: number
  closePrice: number | null
  entryDate: string
  closeDate: string | null
  pnl: number
  timeInPosition: number | null
  commission: number | null
}

const initialFormData: TradeFormData = {
  instrument: '',
  side: 'long',
  quantity: 0,
  entryPrice: 0,
  closePrice: null,
  entryDate: '',
  closeDate: null,
  pnl: 0,
  timeInPosition: null,
  commission: null,
}

export default function ManualProcessor({ processedTrades, setProcessedTrades, accountNumbers }: PlatformProcessorProps) {
  const existingTrades = useTradesStore((state => state.trades))
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<TradeFormData>(initialFormData)
  const t = useI18n()

  const existingCommissions = useMemo(() => {
    const commissions: { [key: string]: number } = {}
    if (!accountNumbers) {
      return commissions;
    }
    existingTrades
      .filter(trade => accountNumbers.includes(trade.accountNumber))
      .forEach(trade => {
        if (trade.instrument && trade.commission && trade.quantity) {
          commissions[trade.instrument] = trade.commission / trade.quantity
        }
      })
    return commissions
  }, [existingTrades, accountNumbers])

  const handleAddRow = () => {
    setFormData(initialFormData)
    setEditingIndex(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (index: number) => {
    const trade = processedTrades[index]
    setFormData({
      instrument: trade.instrument || '',
      side: (trade.side as 'long' | 'short') || 'long',
      quantity: trade.quantity || 0,
      entryPrice: trade.entryPrice ? parseFloat(trade.entryPrice) : 0,
      closePrice: trade.closePrice ? parseFloat(trade.closePrice) : null,
      entryDate: trade.entryDate ? new Date(trade.entryDate).toISOString().slice(0, 16) : '',
      closeDate: trade.closeDate ? new Date(trade.closeDate).toISOString().slice(0, 16) : null,
      pnl: trade.pnl || 0,
      timeInPosition: trade.timeInPosition || null,
      commission: trade.commission || null,
    })
    setEditingIndex(index)
    setIsDialogOpen(true)
  }

  const handleDelete = (index: number) => {
    const updatedTrades = processedTrades.filter((_, i) => i !== index)
    setProcessedTrades(updatedTrades)
    toast.success(t('import.manual.deleteSuccess'))
  }

  const handleSave = () => {
    // Validation
    if (!formData.instrument || !formData.entryDate) {
      toast.error(t('import.manual.validationError'))
      return
    }

    if (formData.quantity <= 0) {
      toast.error(t('import.manual.invalidQuantity'))
      return
    }

    // Calculate commission if not provided
    let commission = formData.commission
    if (!commission && existingCommissions[formData.instrument]) {
      commission = existingCommissions[formData.instrument] * formData.quantity
    }

    // Calculate time in position if not provided
    let timeInPosition = formData.timeInPosition
    if (!timeInPosition && formData.entryDate && formData.closeDate) {
      const entry = new Date(formData.entryDate)
      const close = new Date(formData.closeDate)
      timeInPosition = Math.floor((close.getTime() - entry.getTime()) / 1000)
    }

    const trade: Partial<Trade> = {
      instrument: formData.instrument,
      side: formData.side,
      quantity: formData.quantity,
      entryPrice: formData.entryPrice.toString(),
      closePrice: formData.closePrice ? formData.closePrice.toString() : undefined,
      entryDate: new Date(formData.entryDate).toISOString().replace('Z', '+00:00'),
      closeDate: formData.closeDate ? new Date(formData.closeDate).toISOString().replace('Z', '+00:00') : undefined,
      pnl: formData.pnl,
      timeInPosition: timeInPosition || undefined,
      commission: commission || undefined,
      tags: ['manual'],
    }

    trade.id = generateTradeHash(trade as Trade).toString()

    if (editingIndex !== null) {
      // Update existing trade
      const updatedTrades = [...processedTrades]
      updatedTrades[editingIndex] = trade
      setProcessedTrades(updatedTrades)
      toast.success(t('import.manual.updateSuccess'))
    } else {
      // Add new trade
      setProcessedTrades([...processedTrades, trade])
      toast.success(t('import.manual.addSuccess'))
    }

    setIsDialogOpen(false)
    setFormData(initialFormData)
    setEditingIndex(null)
  }

  const totalPnL = useMemo(() => processedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0), [processedTrades])
  const totalCommission = useMemo(() => processedTrades.reduce((sum, trade) => sum + (trade.commission || 0), 0), [processedTrades])
  const uniqueInstruments = useMemo(() => Array.from(new Set(processedTrades.map(trade => trade.instrument))), [processedTrades])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-semibold">{t('import.manual.title')}</h3>
            <Button onClick={handleAddRow} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('import.manual.addTrade')}
            </Button>
          </div>

          {processedTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-2">
              <p className="text-muted-foreground mb-4">{t('import.manual.noTrades')}</p>
              <Button onClick={handleAddRow} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('import.manual.addFirstTrade')}
              </Button>
            </div>
          ) : (
            <>
              <div className="px-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('import.manual.instrument')}</TableHead>
                      <TableHead>{t('import.manual.side')}</TableHead>
                      <TableHead>{t('import.manual.quantity')}</TableHead>
                      <TableHead>{t('import.manual.entryPrice')}</TableHead>
                      <TableHead>{t('import.manual.closePrice')}</TableHead>
                      <TableHead>{t('import.manual.entryDate')}</TableHead>
                      <TableHead>{t('import.manual.closeDate')}</TableHead>
                      <TableHead>{t('import.manual.pnl')}</TableHead>
                      <TableHead>{t('import.manual.timeInPosition')}</TableHead>
                      <TableHead>{t('import.manual.commission')}</TableHead>
                      <TableHead>{t('import.manual.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedTrades.map((trade, index) => (
                      <TableRow key={trade.id || index}>
                        <TableCell>{trade.instrument}</TableCell>
                        <TableCell>{trade.side}</TableCell>
                        <TableCell>{trade.quantity}</TableCell>
                        <TableCell>{trade.entryPrice}</TableCell>
                        <TableCell>{trade.closePrice || '-'}</TableCell>
                        <TableCell>{trade.entryDate ? new Date(trade.entryDate).toLocaleString() : '-'}</TableCell>
                        <TableCell>{trade.closeDate ? new Date(trade.closeDate).toLocaleString() : '-'}</TableCell>
                        <TableCell className={trade.pnl && trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {trade.pnl?.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {trade.timeInPosition
                            ? `${Math.floor((trade.timeInPosition || 0) / 60)}m ${Math.floor((trade.timeInPosition || 0) % 60)}s`
                            : '-'}
                        </TableCell>
                        <TableCell>{trade.commission?.toFixed(2) || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(index)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between px-2 py-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('import.manual.totalPnL')}</h3>
                  <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalPnL.toFixed(2)}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('import.manual.totalCommission')}</h3>
                  <p className="text-xl font-bold text-blue-600">
                    {totalCommission.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="px-2">
                <h3 className="text-lg font-semibold mb-2">{t('import.manual.instrumentsTraded')}</h3>
                <div className="flex flex-wrap gap-2">
                  {uniqueInstruments.map((instrument) => (
                    <Button
                      key={instrument}
                      variant="outline"
                    >
                      {instrument}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? t('import.manual.editTrade') : t('import.manual.addTrade')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instrument">{t('import.manual.instrument')} *</Label>
              <Input
                id="instrument"
                value={formData.instrument}
                onChange={(e) => setFormData({ ...formData, instrument: e.target.value.toUpperCase() })}
                placeholder="ES"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="side">{t('import.manual.side')} *</Label>
              <Select
                value={formData.side}
                onValueChange={(value: 'long' | 'short') => setFormData({ ...formData, side: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">{t('import.manual.long')}</SelectItem>
                  <SelectItem value="short">{t('import.manual.short')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">{t('import.manual.quantity')} *</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entryPrice">{t('import.manual.entryPrice')} *</Label>
              <Input
                id="entryPrice"
                type="number"
                step="0.01"
                value={formData.entryPrice || ''}
                onChange={(e) => setFormData({ ...formData, entryPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closePrice">{t('import.manual.closePrice')}</Label>
              <Input
                id="closePrice"
                type="number"
                step="0.01"
                value={formData.closePrice || ''}
                onChange={(e) => setFormData({ ...formData, closePrice: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pnl">{t('import.manual.pnl')}</Label>
              <Input
                id="pnl"
                type="number"
                step="0.01"
                value={formData.pnl || ''}
                onChange={(e) => setFormData({ ...formData, pnl: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entryDate">{t('import.manual.entryDate')} *</Label>
              <Input
                id="entryDate"
                type="datetime-local"
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closeDate">{t('import.manual.closeDate')}</Label>
              <Input
                id="closeDate"
                type="datetime-local"
                value={formData.closeDate || ''}
                onChange={(e) => setFormData({ ...formData, closeDate: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeInPosition">{t('import.manual.timeInPosition')} (seconds)</Label>
              <Input
                id="timeInPosition"
                type="number"
                step="1"
                value={formData.timeInPosition || ''}
                onChange={(e) => setFormData({ ...formData, timeInPosition: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission">{t('import.manual.commission')}</Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                value={formData.commission || ''}
                onChange={(e) => setFormData({ ...formData, commission: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave}>
              {editingIndex !== null ? t('common.update') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

