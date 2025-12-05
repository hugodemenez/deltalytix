"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CommandItem } from "@/components/ui/command"
import { Settings, Trash2 } from "lucide-react"
import { useI18n } from "@/locales/client"
import { useData } from "@/context/data-provider"
import { useTradesStore } from "../../../../../store/trades-store"
import { useUserStore } from "../../../../../store/user-store"
import { useModalStateStore } from "../../../../../store/modal-state-store"
import { toast } from "sonner"

interface Account {
  id: string
  number: string
  groupId: string | null
}

interface TradeAccount {
  number: string
}

interface AccountSectionProps {
  searchValue: string
}

export function AccountSection({ searchValue }: AccountSectionProps) {
  const { accountNumbers = [], setAccountNumbers, deleteGroup } = useData()
  const groups = useUserStore(state => state.groups)
  const trades = useTradesStore(state => state.trades)
  const t = useI18n()
  const { setAccountGroupBoardOpen } = useModalStateStore()
  const [showAccountNumbers, setShowAccountNumbers] = useState(true)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  // Get unique account numbers from trades
  const tradeAccounts = Array.from(new Set(trades.map(trade => trade.accountNumber)))
    .map(number => ({ number }))

  // Get accounts that exist in the Account table
  const existingAccounts = tradeAccounts.filter(tradeAccount => 
    groups.some(group => 
      group.accounts.some(account => account.number === tradeAccount.number)
    )
  )

  // Get accounts that only exist in trades (not in Account table)
  const tradeOnlyAccounts = tradeAccounts
    .filter(tradeAccount => !existingAccounts.some(existing => existing.number === tradeAccount.number))
    .map(account => ({ 
      id: account.number,
      number: account.number,
      groupId: null
    }))

  // Filter groups and trade-only accounts based on search term
  const filteredGroups = searchValue
    ? groups
        .filter(group => group.name !== "Hidden Accounts")
        .map(group => ({
          ...group,
          accounts: group.accounts.filter(account => 
            account.number.toLowerCase().includes(searchValue.toLowerCase())
          )
        }))
        .filter(group => group.accounts.length > 0)
    : groups.filter(group => group.name !== "Hidden Accounts")

  const filteredTradeOnlyAccounts = searchValue
    ? tradeOnlyAccounts.filter(account => 
        account.number.toLowerCase().includes(searchValue.toLowerCase())
      )
    : tradeOnlyAccounts

  const handleSelectGroup = (groupId: string, groupAccounts: Account[]) => {
    const selectableItems = groupAccounts.filter(item => !isItemDisabled(item))
    const allSelected = selectableItems.every(item => accountNumbers.includes(item.number))
    
    if (allSelected) {
      setAccountNumbers(prev => 
        prev.filter(account => !selectableItems.some(item => item.number === account))
      )
    } else {
      setAccountNumbers(prev => [
        ...prev,
        ...selectableItems
          .map(item => item.number)
          .filter(account => !prev.includes(account))
      ])
    }
  }

  const handleSelectAll = () => {
    const allAccounts = [
      ...groups
        .filter(group => group.name !== "Hidden Accounts")
        .flatMap(group => group.accounts),
      ...tradeOnlyAccounts
    ]
    const availableAccounts = allAccounts.filter(item => !isItemDisabled(item))
    
    const allAvailableSelected = availableAccounts.every(account => 
      accountNumbers.includes(account.number)
    )
    
    setAccountNumbers(prev => 
      allAvailableSelected ? [] : availableAccounts.map(i => i.number)
    )
  }

  const isItemDisabled = (item: Account | TradeAccount) => false

  const isItemSelected = (item: Account | TradeAccount): boolean => {
    return accountNumbers.includes(item.number)
  }

  const isGroupSelected = (groupAccounts: Account[]) => {
    const selectableItems = groupAccounts.filter(item => !isItemDisabled(item))
    return selectableItems.length > 0 && selectableItems.every(item => isItemSelected(item))
  }

  const isGroupIndeterminate = (groupAccounts: Account[]) => {
    const selectableItems = groupAccounts.filter(item => !isItemDisabled(item))
    const selectedCount = selectableItems.filter(item => isItemSelected(item)).length
    return selectedCount > 0 && selectedCount < selectableItems.length
  }

  const anonymizeAccount = (account: string) => {
    if (!showAccountNumbers) {
      return account.slice(0, 3) + '*'.repeat(Math.max(0, account.length - 7)) + account.slice(-4)
    }
    return account
  }

  const handleSelect = (value: string) => {
    setAccountNumbers(prev => 
      prev.includes(value) 
        ? prev.filter(account => account !== value)
        : [...prev, value]
    )
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const confirmed = window.confirm(t('filters.deleteGroupDescription', { name: groupName }))
    if (!confirmed) return

    try {
      setDeletingGroupId(groupId)
      await deleteGroup(groupId)
      toast.success(t('common.success'), {
        description: t('filters.groupDeleted', { name: groupName })
      })
    } catch (error) {
      console.error("Error deleting group:", error)
      toast.error(t('common.error'), {
        description: t('filters.errorDeletingGroup', { name: groupName })
      })
    } finally {
      setDeletingGroupId(null)
    }
  }

  return (
    <>
      <CommandItem
        onSelect={() => setAccountGroupBoardOpen(true)}
        className="flex items-center gap-2 px-2"
      >
        <Settings className="h-4 w-4" />
        <span className="text-sm">{t('filters.manageAccounts')}</span>
      </CommandItem>

      <CommandItem
        onSelect={handleSelectAll}
        className="flex items-center gap-2 px-2 bg-muted/50"
      >
        <Checkbox
          checked={[
            ...groups
              .filter(group => group.name !== "Hidden Accounts")
              .flatMap(g => g.accounts),
            ...tradeOnlyAccounts
          ].every(item => isItemSelected(item))}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">{t('filters.selectAllAccounts')}</span>
      </CommandItem>

      {/* Show trade-only accounts first */}
      {filteredTradeOnlyAccounts.length > 0 && (
        <>
          <CommandItem
            onSelect={() => handleSelectGroup('trade-only', filteredTradeOnlyAccounts)}
            className="flex items-center gap-2 px-2 bg-muted/50"
          >
            <Checkbox
              checked={isGroupSelected(filteredTradeOnlyAccounts)}
              className="h-4 w-4"
              data-state={isGroupIndeterminate(filteredTradeOnlyAccounts) ? 'indeterminate' : undefined}
            />
            <span className="text-sm font-medium">{t('filters.tradeOnlyAccounts')}</span>
          </CommandItem>
          {filteredTradeOnlyAccounts.map(account => (
            <CommandItem
              key={account.number}
              onSelect={() => handleSelect(account.number)}
              disabled={isItemDisabled(account)}
              className="flex items-center gap-2 pl-6"
            >
              <Checkbox
                checked={isItemSelected(account)}
                className="h-4 w-4 shrink-0"
                disabled={isItemDisabled(account)}
              />
              <span className="text-sm break-all pr-2">
                {anonymizeAccount(account.number)}
              </span>
            </CommandItem>
          ))}
        </>
      )}

      {/* Show grouped accounts */}
      {filteredGroups.map((group) => (
        <div key={group.id}>
          <CommandItem
            onSelect={() => handleSelectGroup(group.id, group.accounts)}
            className="flex items-center justify-between gap-2 px-2 bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isGroupSelected(group.accounts)}
                className="h-4 w-4"
                data-state={isGroupIndeterminate(group.accounts) ? 'indeterminate' : undefined}
              />
              <span className="text-sm font-medium">{group.name}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              disabled={deletingGroupId === group.id}
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteGroup(group.id, group.name)
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">{t('filters.deleteGroupTitle')}</span>
            </Button>
          </CommandItem>
          {group.accounts.map(account => (
            <CommandItem
              key={account.id}
              onSelect={() => handleSelect(account.number)}
              disabled={isItemDisabled(account)}
              className="flex items-center gap-2 pl-6"
            >
              <Checkbox
                checked={isItemSelected(account)}
                className="h-4 w-4 shrink-0"
                disabled={isItemDisabled(account)}
              />
              <span className="text-sm break-all pr-2">
                {anonymizeAccount(account.number)}
              </span>
            </CommandItem>
          ))}
        </div>
      ))}
    </>
  )
}
