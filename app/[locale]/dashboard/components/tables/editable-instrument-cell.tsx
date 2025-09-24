'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Edit3, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/locales/client'

interface EditableInstrumentCellProps {
  value: string
  tradeIds: string[]
  onUpdate: (tradeIds: string[], updates: any) => Promise<void>
  className?: string
}

export function EditableInstrumentCell({ 
  value, 
  tradeIds, 
  onUpdate,
  className 
}: EditableInstrumentCellProps) {
  const t = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setTempValue(value)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTempValue('')
  }

  const handleSave = async () => {
    if (isSaving) return

    const trimmedValue = tempValue.trim()
    
    if (trimmedValue === value) {
      handleCancel()
      return
    }

    if (trimmedValue === '') {
      // Don't allow empty instrument names
      return
    }

    setIsSaving(true)
    
    try {
      await onUpdate(tradeIds, { instrument: trimmedValue })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating instrument:', error)
    } finally {
      setIsSaving(false)
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
          onBlur={handleSave}
          placeholder="Instrument"
          className="h-7 text-xs font-medium border-blue-500 focus-visible:ring-1"
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
    <div
      className={cn(
        "group cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors border border-transparent hover:border-accent-foreground/20 flex items-center gap-2",
        className
      )}
      onClick={handleStartEdit}
    >
      <span className="text-sm font-medium">{value}</span>
      <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </div>
  )
}