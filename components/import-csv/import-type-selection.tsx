import React from 'react'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export type ImportType = 'rithmic' | 'tradezella' | 'tradovate' | 'rithmic-orders'

interface ImportTypeSelectionProps {
  selectedType: ImportType
  setSelectedType: React.Dispatch<React.SetStateAction<ImportType>>
}

export default function ImportTypeSelection({ selectedType, setSelectedType }: ImportTypeSelectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Select Import Type</h2>
      <RadioGroup value={selectedType} onValueChange={(value) => setSelectedType(value as ImportType)}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="rithmic" id="rithmic" />
          <Label htmlFor="rithmic">Rithmic Performance</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="tradezella" id="tradezella" />
          <Label htmlFor="tradezella">Tradezella</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="tradovate" id="tradovate" />
          <Label htmlFor="tradovate">Tradovate</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="rithmic-orders" id="rithmic-orders" />
          <Label htmlFor="rithmic-orders">Rithmic Orders</Label>
        </div>
      </RadioGroup>
    </div>
  )
}