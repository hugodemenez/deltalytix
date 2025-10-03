"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, EyeOff } from "lucide-react"
import { useI18n } from "@/locales/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTradesStore } from "@/store/trades-store"
import { useUserStore } from "@/store/user-store"
import { useData } from "@/context/data-provider"
import { Account, Group } from "@/context/data-provider"
import { AccountGroup, type AccountGroup as AccountGroupType } from "./account-group"
import { AccountCoin, type Account as AccountCoinType } from "./account-coin"


export const HIDDEN_GROUP_NAME = "Hidden Accounts"

interface UngroupedAccount {
  number: string
  id: string
}

export function AccountGroupBoard() {
  const t = useI18n()
  const user = useUserStore(state => state.user)
  const groups = useUserStore(state => state.groups)
  const trades = useTradesStore(state => state.trades)
  const { saveGroup, renameGroup, deleteGroup, moveAccountToGroup, saveAccount } = useData()
  const [newGroupName, setNewGroupName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)
  const [draggedAccount, setDraggedAccount] = useState<AccountCoinType | null>(null)
  const [draggedFromGroup, setDraggedFromGroup] = useState<string | null>(null)
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)
  const existingAccounts = useUserStore(state => state.accounts)

  const tradeAccountNumbers = useMemo(() => {
    const accountSet = new Set<string>()
    trades.forEach(trade => {
      if (trade.accountNumber) {
        accountSet.add(trade.accountNumber)
      }
    })
    return Array.from(accountSet)
  }, [trades])

  const ungroupedAccounts = useMemo(() => {
    // Get existing accounts that are not in any group
    const existingUngroupedAccounts = existingAccounts.filter(account => 
      !account.groupId && tradeAccountNumbers.includes(account.number)
    )

    // Get account numbers from trades that don't have account records yet
    const accountNumbersWithoutRecords = tradeAccountNumbers.filter(number => 
      !existingAccounts.some(acc => acc.number === number)
    )

    // Create placeholder AccountCoin objects for accounts without records
    const placeholderAccounts: AccountCoinType[] = accountNumbersWithoutRecords.map(number => ({
      id: `placeholder-${number}`,
      number,
      initials: number.substring(0, 2).toUpperCase(),
      color: `bg-blue-500`, // Default color
    }))

    // Convert existing accounts to AccountCoin format
    const existingAccountCoins: AccountCoinType[] = existingUngroupedAccounts.map(account => ({
      id: account.id,
      number: account.number,
      initials: account.number.substring(0, 2).toUpperCase(),
      color: `bg-blue-500`, // Default color, could be enhanced
      groupId: account.groupId,
    }))

    // Combine existing accounts with placeholder accounts
    return [...existingAccountCoins, ...placeholderAccounts]
  }, [existingAccounts, tradeAccountNumbers])

  const handleCreateGroup = useCallback(async () => {
    if (!newGroupName.trim() || !user?.id) return
    try {
      setIsCreating(true)
      await saveGroup(newGroupName.trim())
      setNewGroupName("")
      setShowNewGroupInput(false)
      toast.success(t("common.success"), {
        description: t("filters.groupCreated", { name: newGroupName })
      })
    } catch (error) {
      console.error("Error creating group:", error)
      toast.error(t("common.error"), {
        description: t("filters.errorCreatingGroup", { name: newGroupName })
      })
    } finally {
      setIsCreating(false)
    }
  }, [newGroupName, user?.id, saveGroup, t])

  const handleDragStart = useCallback((e: React.DragEvent, account: AccountCoinType, fromGroupId?: string) => {
    setDraggedAccount(account)
    setDraggedFromGroup(fromGroupId || null)
    e.dataTransfer.effectAllowed = "move"
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedAccount(null)
    setDraggedFromGroup(null)
    setDragOverGroup(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    setDragOverGroup(groupId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverGroup(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault()

    if (!draggedAccount) return

    try {
      // If moving to hidden group, ensure it exists
      if (targetGroupId === "hidden" && user?.id) {
        const hiddenGroup = groups.find((g: Group) => g.name === HIDDEN_GROUP_NAME)
        if (!hiddenGroup) {
          // Create hidden group if it doesn't exist
          const newHiddenGroup = await saveGroup(HIDDEN_GROUP_NAME)
          if (newHiddenGroup) {
            targetGroupId = newHiddenGroup.id
          }
        } else {
          targetGroupId = hiddenGroup.id
        }
      }

      // If this is a placeholder account (doesn't exist in database yet), create it first
      if (draggedAccount.id.startsWith('placeholder-')) {
        if (!user?.id) return
        
        // Create a minimal account object with default values and groupId if specified
        const accountData = {
          number: draggedAccount.number,
          propfirm: '',
          startingBalance: 0,
          profitTarget: 0,
          drawdownThreshold: 0,
          consistencyPercentage: 30,
          groupId: targetGroupId || null,
        } as Account
        
        await saveAccount(accountData)
        toast.success(t("common.success"), {
          description: t("filters.accountMoved", { account: draggedAccount.number })
        })
        return
      }

      await moveAccountToGroup(draggedAccount.id, targetGroupId)
      toast.success(t("common.success"), {
        description: t("filters.accountMoved", { account: draggedAccount.number })
      })
    } catch (error) {
      console.error("Error moving account:", error)
      toast.error(t("common.error"), {
        description: t("filters.errorMovingAccount", { account: draggedAccount.number })
      })
    } finally {
      setDragOverGroup(null)
    }
  }, [draggedAccount, groups, user?.id, saveGroup, moveAccountToGroup, saveAccount, t])

  const handleDropToUnassigned = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()

    if (!draggedAccount || !draggedFromGroup) return

    try {
      await moveAccountToGroup(draggedAccount.id, null)
      toast.success(t("common.success"), {
        description: t("filters.accountMoved", { account: draggedAccount.number })
      })
    } catch (error) {
      console.error("Error moving account:", error)
      toast.error(t("common.error"), {
        description: t("filters.errorMovingAccount", { account: draggedAccount.number })
      })
    } finally {
      setDragOverGroup(null)
    }
  }, [draggedAccount, draggedFromGroup, moveAccountToGroup, t])

  const handleDragOverUnassigned = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    // Only allow drop if dragging from a group
    if (draggedFromGroup) {
      setDragOverGroup("unassigned")
    }
  }, [draggedFromGroup])

  const handleDragLeaveUnassigned = useCallback(() => {
    if (dragOverGroup === "unassigned") {
      setDragOverGroup(null)
    }
  }, [dragOverGroup])

  const handleRenameGroup = useCallback(async (groupId: string, newName: string) => {
    try {
      await renameGroup(groupId, newName)
      toast.success(t("common.success"), {
        description: t("filters.groupUpdated", { name: newName })
      })
    } catch (error) {
      console.error("Error updating group:", error)
      toast.error(t("common.error"), {
        description: t("filters.errorUpdatingGroup", { name: newName })
      })
    }
  }, [renameGroup, t])

  const handleDeleteGroup = useCallback(async (groupId: string, groupName: string) => {
    try {
      setIsDeleting(true)
      await deleteGroup(groupId)
      toast.success(t("common.success"), {
        description: t("filters.groupDeleted", { name: groupName })
      })
    } catch (error) {
      console.error("Error deleting group:", error)
      toast.error(t("common.error"), {
        description: t("filters.errorDeletingGroup", { name: groupName })
      })
    } finally {
      setIsDeleting(false)
    }
  }, [deleteGroup, t])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateGroup()
    } else if (e.key === "Escape") {
      setNewGroupName("")
      setShowNewGroupInput(false)
    }
  }, [handleCreateGroup])


  // Convert groups to AccountGroupType format
  const accountGroups = useMemo(() => {
    return groups.map(group => ({
      id: group.id,
      name: group.name,
      accounts: group.accounts.map(account => ({
        id: account.id,
        number: account.number,
        initials: account.number.substring(0, 2).toUpperCase(),
        color: `bg-blue-500`, // Default color, could be enhanced
        groupId: account.groupId,
      })),
    }))
  }, [groups])

  // Return early if no user
  if (!user) {
    return null
  }

  const isHiddenGroup = (group: Group) => group.name === HIDDEN_GROUP_NAME

  return (
    <div className="space-y-6">

      {/* Unassigned Accounts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("filters.noGroup")}</h3>
          <span className="text-sm text-muted-foreground">
            {ungroupedAccounts.length} {ungroupedAccounts.length !== 1 ? t("filters.accounts") : t("filters.account")}
          </span>
        </div>

        <div
          onDrop={handleDropToUnassigned}
          onDragOver={handleDragOverUnassigned}
          onDragLeave={handleDragLeaveUnassigned}
          className={cn(
            "min-h-[80px] p-4 border-2 border-dashed border-border rounded-lg transition-all duration-200",
            dragOverGroup === "unassigned" && "border-primary bg-primary/5 shadow-lg",
            ungroupedAccounts.length === 0 && "flex items-center justify-center"
          )}
        >
          {ungroupedAccounts.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center">
              {t("filters.noAccounts")}
            </div>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {ungroupedAccounts.map((account, index) => (
                <div
                  key={account.id}
                  className="flex-shrink-0 transition-transform duration-300 ease-out"
                  style={{
                    marginLeft: index === 0 ? "0" : "-8px",
                  }}
                >
                  <AccountCoin
                    account={account}
                    onDragStart={(e, account) => handleDragStart(e, account)}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("filters.accountGroups")}</h3>

          {showNewGroupInput ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder={t("filters.newGroup")}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-40"
                autoFocus
              />
              <Button size="sm" onClick={handleCreateGroup} disabled={!newGroupName.trim() || isCreating}>
                {t("common.create")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNewGroupInput(false)
                  setNewGroupName("")
                }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setShowNewGroupInput(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("filters.createGroup")}
            </Button>
          )}
        </div>

        {accountGroups.length === 0 ? (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">{t("filters.noGroupsCreated")}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accountGroups.map((group) => (
              <AccountGroup
                key={group.id}
                group={group}
                onDrop={handleDrop}
                onDragOver={(e) => handleDragOver(e, group.id)}
                onDragLeave={handleDragLeave}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onRename={handleRenameGroup}
                onDelete={(groupId) => {
                  const groupToDelete = groups.find(g => g.id === groupId)
                  if (groupToDelete) {
                    handleDeleteGroup(groupId, groupToDelete.name)
                  }
                }}
                isDragOver={dragOverGroup === group.id}
                isHiddenGroup={isHiddenGroup(groups.find(g => g.id === group.id)!)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

