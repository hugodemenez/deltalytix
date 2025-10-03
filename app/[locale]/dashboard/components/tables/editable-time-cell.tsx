'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from '@/components/ui/label'
import { Clock, Plus, Minus, Check, X } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { cn } from '@/lib/utils'
import { useI18n } from '@/locales/client'
import { useUserStore } from '@/store/user-store'

interface EditableTimeCellProps {
  value: string
  tradeIds: string[]
  fieldType: 'entryDate' | 'closeDate'
  onUpdate: (tradeIds: string[], updates: any) => Promise<void>
  className?: string
}

export function EditableTimeCell({ 
  value, 
  tradeIds, 
  fieldType, 
  onUpdate,
  className 
}: EditableTimeCellProps) {
  const t = useI18n()
  const timezone = useUserStore(state => state.timezone)
  const [isEditing, setIsEditing] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [hourOffset, setHourOffset] = useState(0)
  const [tempValue, setTempValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const formattedTime = formatInTimeZone(new Date(value), timezone, 'HH:mm:ss')
  const formattedDate = formatInTimeZone(new Date(value), timezone, 'yyyy-MM-dd')

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setTempValue(formattedTime)
    setIsEditing(true)
    setHourOffset(0)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTempValue('')
    setHourOffset(0)
    setIsPopoverOpen(false)
  }

  const handleSave = async () => {
    if (isSaving) return

    setIsSaving(true)
    
    try {
      let newDateTime: Date

      if (tempValue && tempValue !== formattedTime) {
        // Parse the manual time input
        const [hours, minutes, seconds] = tempValue.split(':').map(Number)
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
          throw new Error(t('trade-table.editableTimeCell.invalidTimeFormat'))
        }

        const originalDate = new Date(value)
        newDateTime = new Date(originalDate)
        newDateTime.setHours(hours, minutes, seconds || 0)
      } else if (hourOffset !== 0) {
        // Apply hour offset
        newDateTime = new Date(value)
        newDateTime.setHours(newDateTime.getHours() + hourOffset)
      } else {
        // No changes
        handleCancel()
        return
      }

      await onUpdate(tradeIds, { [fieldType]: newDateTime.toISOString() })
      setIsEditing(false)
      setIsPopoverOpen(false)
    } catch (error) {
      console.error('Error updating time:', error)
    } finally {
      setIsSaving(false)
      setHourOffset(0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-[120px]">
        <Input
          ref={inputRef}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="HH:mm:ss"
          className="h-7 text-xs font-mono border-blue-500 focus-visible:ring-1"
          disabled={isSaving}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 hover:bg-green-100"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 hover:bg-red-100"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </div>
    )
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "group cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors border border-transparent hover:border-accent-foreground/20",
            className
          )}
          onClick={() => setIsPopoverOpen(true)}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono">{formattedTime}</span>
            <Clock className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{t('trade-table.editTime')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('trade-table.editTimeDescription')}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t('trade-table.editableTimeCell.currentTime')}</Label>
              <div className="text-sm font-mono bg-muted/50 rounded px-2 py-1">
                {formattedDate} {formattedTime}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-2 block">{t('trade-table.editableTimeCell.timezoneAdjustment')}</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHourOffset(prev => prev - 1)}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="text-sm font-mono bg-muted/50 rounded px-3 py-1 min-w-[60px] text-center">
                  {hourOffset === 0 ? '±0h' : `${hourOffset > 0 ? '+' : ''}${hourOffset}h`}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHourOffset(prev => prev + 1)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {hourOffset !== 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {t('trade-table.editableTimeCell.newTime')}: {formatInTimeZone(new Date(new Date(value).getTime() + hourOffset * 60 * 60 * 1000), timezone, 'HH:mm:ss')}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs mb-2 block">{t('trade-table.editableTimeCell.manualEdit')}</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsPopoverOpen(false)
                  handleStartEdit()
                }}
                className="w-full text-xs"
              >
                {t('trade-table.editableTimeCell.editTimeManually')}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={hourOffset === 0 || isSaving}
              className="flex-1"
            >
              {isSaving ? t('trade-table.editableTimeCell.saving') : t('trade-table.editableTimeCell.applyChanges')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPopoverOpen(false)}
              className="flex-1"
            >
              {t('trade-table.editableTimeCell.cancel')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}