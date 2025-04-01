import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUserData } from "@/components/context/user-data"
import { useI18n } from "@/locales/client"
import { FilterItem } from "@/types/filter"
import { useState, useEffect } from "react"
import { ChevronDown, Settings } from "lucide-react"
import { AccountGroupBoard } from "./account-group-board"
import { getGroups, createGroup, updateGroup, moveAccountToGroup } from "@/app/[locale]/(dashboard)/dashboard/data/actions"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getAccounts } from "../../actions/accounts"

interface AccountFilterProps {
  showAccountNumbers: boolean
  className?: string
}

interface Account {
  id: string
  number: string
  groupId: string | null
}

interface Group {
  id: string
  name: string
  accounts: Account[]
}

interface TradeAccount {
  number: string
}

export function AccountFilter({ showAccountNumbers, className }: AccountFilterProps) {
  const { trades = [], accountNumbers = [], setAccountNumbers, user, groups, setGroups } = useUserData()
  const [filterOpen, setFilterOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const t = useI18n()

  

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
      id: account.number,       // Use number as id for trade-only accounts
      number: account.number,
      groupId: null     // No group for trade-only accounts
    }))

  // Filter groups and trade-only accounts based on search term
  const filteredGroups = searchTerm
    ? groups.map(group => ({
        ...group,
        accounts: group.accounts.filter(account => 
          account.number.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(group => group.accounts.length > 0)
    : groups

  const filteredTradeOnlyAccounts = searchTerm
    ? tradeOnlyAccounts.filter(account => 
        account.number.toLowerCase().includes(searchTerm.toLowerCase())
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
      ...groups.flatMap(group => group.accounts),
      ...tradeOnlyAccounts
    ]
    const availableAccounts = allAccounts.filter(item => !isItemDisabled(item))
    
    setAccountNumbers(prev => 
      prev.length === availableAccounts.length ? [] : availableAccounts.map(i => i.number)
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

  const handleRenameGroup = async (groupId: string, newName: string) => {
    try {
      await updateGroup(groupId, newName)
      setGroups(prev => prev.map(group => 
        group.id === groupId ? { ...group, name: newName } : group
      ))
      toast.success(t('filters.groupRenamed', { name: newName }))
    } catch (error) {
      console.error('Error renaming group:', error)
      toast.error(t('filters.errorRenamingGroup', { name: newName }))
    }
  }

  const handleCreateGroup = async (name: string) => {
    if (!user?.id) return
    try {
      const newGroup = await createGroup(user.id, name)
      setGroups(prev => [...prev, { ...newGroup, accounts: [] }])
      toast.success(t('filters.groupCreated', { name }))
    } catch (error) {
      console.error('Error creating group:', error)
      toast.error(t('filters.errorCreatingGroup', { name }))
    }
  }

  const handleMoveAccount = async (accountId: string, targetGroupId: string | null) => {
    try {
      await moveAccountToGroup(accountId, targetGroupId)
      setGroups(prev => {
        const newGroups = [...prev]
        // Remove account from current group
        newGroups.forEach(group => {
          group.accounts = group.accounts.filter(acc => acc.id !== accountId)
        })
        // Add account to target group
        if (targetGroupId) {
          const targetGroup = newGroups.find(g => g.id === targetGroupId)
          if (targetGroup) {
            const account = prev.flatMap(g => g.accounts).find(acc => acc.id === accountId)
            if (account) {
              targetGroup.accounts.push({ ...account, groupId: targetGroupId })
            }
          }
        }
        return newGroups
      })
      toast.success(t('filters.accountMoved', { account: anonymizeAccount(accountId) }))
    } catch (error) {
      console.error('Error moving account:', error)
      toast.error(t('filters.errorMovingAccount', { account: anonymizeAccount(accountId) }))
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`flex-1 ${className || ''}`}>
              <span className="flex-1 text-left">{t('filters.accounts')}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[300px]" align="start">
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder={t('filters.search')} 
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandEmpty>{t('filters.noResults')}</CommandEmpty>
              <CommandList>
                <ScrollArea className="h-[300px]">
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setFilterOpen(false)
                        setModalOpen(true)
                      }}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span className="text-sm">{t('filters.manageAccounts')}</span>
                    </CommandItem>
                    <CommandSeparator />

                    <CommandItem
                      onSelect={handleSelectAll}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        checked={[
                          ...groups.flatMap(g => g.accounts),
                          ...tradeOnlyAccounts
                        ].every(item => isItemSelected(item))}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{t('filters.selectAllAccounts')}</span>
                    </CommandItem>

                    {/* Show trade-only accounts first */}
                    {filteredTradeOnlyAccounts.length > 0 && (
                      <CommandGroup className="px-2">
                        <CommandItem
                          onSelect={() => handleSelectGroup('trade-only', filteredTradeOnlyAccounts)}
                          className="flex items-center gap-2 bg-muted/50"
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
                              className="h-4 w-4 flex-shrink-0"
                              disabled={isItemDisabled(account)}
                            />
                            <span className="text-sm break-all pr-2">
                              {anonymizeAccount(account.number)}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {/* Show grouped accounts */}
                    {filteredGroups.map((group) => (
                      <CommandGroup key={group.id} className="px-2">
                        <CommandItem
                          onSelect={() => handleSelectGroup(group.id, group.accounts)}
                          className="flex items-center gap-2 bg-muted/50"
                        >
                          <Checkbox
                            checked={isGroupSelected(group.accounts)}
                            className="h-4 w-4"
                            data-state={isGroupIndeterminate(group.accounts) ? 'indeterminate' : undefined}
                          />
                          <span className="text-sm font-medium">{group.name}</span>
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
                              className="h-4 w-4 flex-shrink-0"
                              disabled={isItemDisabled(account)}
                            />
                            <span className="text-sm break-all pr-2">
                              {anonymizeAccount(account.number)}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandGroup>
                </ScrollArea>
              </CommandList>
            </Command>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Replace the custom modal with Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[1200px] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('filters.manageAccounts')}</DialogTitle>
          </DialogHeader>
          <AccountGroupBoard/>
        </DialogContent>
      </Dialog>
    </>
  )
} 