"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Settings } from "lucide-react"

interface AccountSelectionPopoverProps {
  accountNumbers: string[]
  selectedAccounts: string[]
  onToggleAccount: (accountNumber: string) => void
  t: any
}

export const AccountSelectionPopover = React.memo(({ 
  accountNumbers,
  selectedAccounts,
  onToggleAccount,
  t
}: AccountSelectionPopoverProps) => {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  
  const maxAccounts = 10 // Hardcoded for performance
  
  // Filter accounts based on search term
  const filteredAccounts = React.useMemo(() => {
    if (!searchTerm.trim()) return accountNumbers
    return accountNumbers.filter(account => 
      account.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [accountNumbers, searchTerm])
  
  // Calculate actual selected count (only accounts that exist in accountNumbers)
  const actualSelectedCount = React.useMemo(() => {
    return selectedAccounts.filter(account => accountNumbers.includes(account)).length
  }, [selectedAccounts, accountNumbers])
  
  // Clear search
  const clearSearch = () => {
    setSearchTerm('')
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-3 w-3 mr-1" />
          {t('equity.legend.selectAccounts')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 h-80 p-4" align="start">
        <div className="space-y-3 h-full flex flex-col">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">
                  {t('equity.legend.selected')} {actualSelectedCount} {t('equity.legend.of')} {accountNumbers.length}
                </Label>
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t('equity.legend.clearSearch')}
                  </Button>
                )}
              </div>
              
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('equity.legend.search')}
                  className="h-8 pl-7 pr-3 text-xs"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {filteredAccounts.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    {searchTerm ? 'No accounts found' : 'No accounts available'}
                  </div>
                ) : (
                  filteredAccounts.map((accountNumber) => (
                    <div key={accountNumber} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`account-${accountNumber}`}
                        checked={selectedAccounts?.includes(accountNumber) || false}
                        onCheckedChange={() => onToggleAccount(accountNumber)}
                        className="h-4 w-4"
                      />
                      <Label
                        htmlFor={`account-${accountNumber}`}
                        className="text-xs font-normal cursor-pointer flex-1 hover:text-foreground"
                      >
                        {accountNumber}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})

AccountSelectionPopover.displayName = "AccountSelectionPopover"
