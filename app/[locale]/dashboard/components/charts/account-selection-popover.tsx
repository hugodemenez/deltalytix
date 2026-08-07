"use client"

import * as React from "react"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"

interface AccountSelectionPopoverProps {
  accountNumbers: string[]
  selectedAccounts: string[]
  onToggleAccount: (accountNumber: string) => void
  t: (key: string) => string
}

export const AccountSelectionPopover = React.memo(({
  accountNumbers,
  selectedAccounts,
  onToggleAccount,
  t
}: AccountSelectionPopoverProps) => {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const isMobile = useIsMobile()

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

  // Reset the search each time the surface closes so it reopens clean
  React.useEffect(() => {
    if (!open) setSearchTerm('')
  }, [open])

  const summary = `${t('equity.legend.selected')} ${actualSelectedCount} ${t('equity.legend.of')} ${accountNumbers.length}`

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
    >
      <Settings className="h-3 w-3 mr-1" />
      {t('equity.legend.selectAccounts')}
    </Button>
  )

  // `shouldFilter={false}`: the list is already filtered above, and cmdk's own
  // scoring would reorder accounts away from their numeric order.
  const accountList = (listClassName: string) => (
    <Command shouldFilter={false}>
      <CommandInput
        value={searchTerm}
        onValueChange={setSearchTerm}
        placeholder={t('equity.legend.search')}
      />
      <CommandList className={listClassName}>
        <CommandEmpty>
          {accountNumbers.length === 0
            ? t('equity.legend.noAccounts')
            : t('equity.legend.noAccountsFound')}
        </CommandEmpty>
        <CommandGroup>
          {filteredAccounts.map((accountNumber) => (
            <CommandItem
              key={accountNumber}
              value={accountNumber}
              onSelect={() => onToggleAccount(accountNumber)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedAccounts?.includes(accountNumber) || false}
                // The item's onSelect already toggles; the checkbox is a visual
                // state indicator so it must not fire a second toggle.
                tabIndex={-1}
                className="h-4 w-4 pointer-events-none"
              />
              <span className="flex-1 truncate">{accountNumber}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[85svh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base">
              {t('equity.legend.selectAccounts')}
            </DrawerTitle>
            <DrawerDescription>{summary}</DrawerDescription>
          </DrawerHeader>
          {/* pb-safe: keep the last row clear of the home indicator */}
          {accountList("max-h-[50svh] pb-[max(0.5rem,env(safe-area-inset-bottom))]")}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
        align="start"
      >
        <div className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
          {summary}
        </div>
        {accountList(
          "max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-6rem))]"
        )}
      </PopoverContent>
    </Popover>
  )
})

AccountSelectionPopover.displayName = "AccountSelectionPopover"
