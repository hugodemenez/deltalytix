"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Check, Loader2, Pencil, Trash2, X, Search } from "lucide-react"
import { useI18n } from "@/locales/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTradesStore } from "@/store/trades-store"
import { useUserStore } from "@/store/user-store"
import { useData, Account, Group } from "@/context/data-provider"
import { removeAccountsFromTradesAction } from "@/server/accounts"

export const HIDDEN_GROUP_NAME = "Hidden Accounts"

type BoardAccount = {
  id: string
  number: string
  groupId: string | null
  groupName?: string | null
  balanceLabel?: string
  isPlaceholder?: boolean
}

type BoardGroup = {
  id: string
  name: string
  accounts: BoardAccount[]
  color: string
  isVirtual?: boolean
}

const paletteFromSeed = (seed: string) => {
  const hash = seed.split("").reduce((acc, char) => {
    acc = ((acc << 5) - acc) + char.charCodeAt(0)
    return acc & acc
  }, 0)
  const hue = Math.abs(hash) % 360
  const base = `hsl(${hue}, 70%, 52%)`
  return { base }
}

export function AccountGroupBoard() {
  const t = useI18n()
  const user = useUserStore(state => state.user)
  const groups = useUserStore(state => state.groups)
  const trades = useTradesStore(state => state.trades)
  const setTradesStore = useTradesStore(state => state.setTrades)
  const existingAccounts = useUserStore(state => state.accounts)
  const setAccounts = useUserStore(state => state.setAccounts)
  const {
    saveGroup,
    renameGroup,
    moveAccountsToGroup,
    moveAccountToGroup,
    saveAccount,
    deleteAccount,
    deleteGroup,
    refreshTradesOnly,
  } = useData()

  const [isCreating, setIsCreating] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [movingTarget, setMovingTarget] = useState<string>("")
  const [draggedAccount, setDraggedAccount] = useState<BoardAccount | null>(null)
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const [newGroupName, setNewGroupName] = useState("")
  const [accountToDelete, setAccountToDelete] = useState<BoardAccount | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<BoardGroup | null>(null)
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  const tradeAccountNumbers = useMemo(() => {
    const accountSet = new Set<string>()
    trades.forEach(trade => {
      if (trade.accountNumber) {
        accountSet.add(trade.accountNumber)
      }
    })
    return Array.from(accountSet)
  }, [trades])

  const getBalanceLabel = useCallback((account: Account) => {
    const typedAccount = account as Account & { metrics?: { currentBalance?: number }; balanceToDate?: number }
    const value =
      typedAccount.metrics?.currentBalance ??
      typedAccount.balanceToDate ??
      typedAccount.startingBalance

    return typeof value === "number"
      ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : undefined
  }, [])

  const hiddenGroup = useMemo(() => groups.find(g => g.name === HIDDEN_GROUP_NAME), [groups])

  const allAccounts: BoardAccount[] = useMemo(() => {
    const byGroup = groups.flatMap(group =>
      group.accounts.map(account => ({
        id: account.id,
        number: account.number,
        groupId: group.id,
        groupName: group.name,
        balanceLabel: getBalanceLabel(account as Account),
      })),
    )

    const ungroupedExisting = existingAccounts
      .filter(account => !account.groupId)
      .map(account => ({
        id: account.id,
        number: account.number,
        groupId: null,
        groupName: null,
        balanceLabel: getBalanceLabel(account as Account),
      }))

    const placeholderAccounts = tradeAccountNumbers
      .filter(number => !existingAccounts.some(acc => acc.number === number))
      .map(number => ({
        id: `placeholder-${number}`,
        number,
        groupId: null,
        groupName: null,
        isPlaceholder: true,
      }))

    const merged = [...byGroup, ...ungroupedExisting, ...placeholderAccounts]
    const unique = new Map<string, BoardAccount>()
    merged.forEach(account => unique.set(account.id, account))
    return Array.from(unique.values())
  }, [existingAccounts, getBalanceLabel, groups, tradeAccountNumbers])

  const matchingAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return allAccounts
    return allAccounts.filter(account =>
      [account.number, account.groupName].some(field => field?.toLowerCase().includes(query)),
    )
  }, [allAccounts, searchQuery])

  const selectedAccounts = useMemo(
    () => selectedAccountIds.map(id => allAccounts.find(account => account.id === id)).filter(Boolean) as BoardAccount[],
    [allAccounts, selectedAccountIds],
  )

  const ensureHiddenGroup = useCallback(async () => {
    if (hiddenGroup) return hiddenGroup.id
    const created = await saveGroup(HIDDEN_GROUP_NAME)
    return created?.id
  }, [hiddenGroup, saveGroup])

  const resolveTargetGroupId = useCallback(async (target: string) => {
    if (!target || target === "none") return null
    if (target === "hidden") {
      return await ensureHiddenGroup()
    }
    return target
  }, [ensureHiddenGroup])

  const moveSingleAccount = useCallback(
    async (account: BoardAccount, target: string | null) => {
      const targetGroupId = await resolveTargetGroupId(target ?? "")
      if (account.isPlaceholder) {
        if (!user?.id) return
        const accountData = {
          number: account.number,
          propfirm: "",
          startingBalance: 0,
          profitTarget: 0,
          drawdownThreshold: 0,
          consistencyPercentage: 30,
          groupId: targetGroupId,
        } as Account
        await saveAccount(accountData)
        return
      }
      await moveAccountToGroup(account.id, targetGroupId ?? null)
    },
    [moveAccountToGroup, resolveTargetGroupId, saveAccount, user?.id],
  )

  const handleMoveSelected = useCallback(async (targetValue?: string) => {
    const target = targetValue ?? movingTarget
    if (selectedAccountIds.length === 0) {
      toast.message(t("filters.selectAccountsFirst"))
      return
    }
    const resolvedTargetGroupId = await resolveTargetGroupId(target)
    if (target && resolvedTargetGroupId === undefined) {
      toast.error(t("common.error"), {
        description: t("filters.errorMovingAccount", { account: "" }),
      })
      return
    }
    try {
      setIsMoving(true)
      const targetIdResolved = resolvedTargetGroupId ?? null

      const placeholders = selectedAccounts.filter(acc => acc.isPlaceholder)
      const existingAccounts = selectedAccounts.filter(acc => !acc.isPlaceholder)

      // First create placeholder accounts directly with target group
      await Promise.all(
        placeholders.map(async acc => {
          await saveAccount({
            number: acc.number,
            propfirm: "",
            startingBalance: 0,
            profitTarget: 0,
            drawdownThreshold: 0,
            consistencyPercentage: 30,
            groupId: targetIdResolved,
          } as Account)
        }),
      )

      // Then move existing accounts in bulk
      if (existingAccounts.length > 0) {
        await moveAccountsToGroup(existingAccounts.map(acc => acc.id), targetIdResolved)
      }

      const movedCount = selectedAccounts.length
      if (movedCount > 0) {
        toast.success(t("common.success"), {
          description: t("filters.accountsMovedSuccess", { count: movedCount }),
        })
        setMovingTarget("")
      }
    } catch (error) {
      console.error("Error moving accounts:", error)
      toast.error(t("common.error"), {
        description: t("filters.accountsMovedError"),
      })
    } finally {
      setIsMoving(false)
    }
  }, [
    moveAccountsToGroup,
    resolveTargetGroupId,
    saveAccount,
    selectedAccounts,
    selectedAccountIds.length,
    t,
    movingTarget,
  ])

  const handleDragStart = useCallback((account: BoardAccount) => {
    setDraggedAccount(account)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedAccount(null)
    setDragOverGroup(null)
  }, [])

  const handleDropToGroup = useCallback(
    async (groupId: string | null) => {
      if (!draggedAccount) return
      try {
        await moveSingleAccount(draggedAccount, groupId)
        toast.success(t("common.success"), {
          description: t("filters.accountMoved", { account: draggedAccount.number }),
        })
      } catch (error) {
        console.error("Error moving account:", error)
        toast.error(t("common.error"), {
          description: t("filters.errorMovingAccount", { account: draggedAccount.number }),
        })
      } finally {
        setDraggedAccount(null)
        setDragOverGroup(null)
      }
    },
    [draggedAccount, moveSingleAccount, t],
  )

  const toggleAccountSelection = useCallback((accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId],
    )
  }, [])

  const selectAllMatching = useCallback(() => {
    setSelectedAccountIds(matchingAccounts.map(account => account.id))
  }, [matchingAccounts])

  const clearSelection = useCallback(() => setSelectedAccountIds([]), [])

  const handleDeleteAccount = useCallback(async (account: BoardAccount) => {
    if (account.isPlaceholder) return
    setDeletingAccountId(account.id)
    const fullAccount = existingAccounts.find(acc => acc.id === account.id)
    if (!fullAccount) {
      toast.error(t("common.error"), {
        description: t("filters.errorDeletingAccount", { account: account.number }),
      })
      setDeletingAccountId(null)
      return
    }

    try {
      await removeAccountsFromTradesAction([account.number])
      setTradesStore(trades.filter((trade) => trade.accountNumber !== account.number))
      if (setAccounts) {
        setAccounts(existingAccounts.filter((acc) => acc.id !== account.id))
      }
      await refreshTradesOnly({ force: false })
      setSelectedAccountIds(prev => prev.filter(id => id !== account.id))
      toast.success(t("common.success"), {
        description: t("filters.accountDeleted", { account: account.number }),
      })
    } catch (error) {
      console.error("Error deleting account:", error)
      toast.error(t("common.error"), {
        description: t("filters.errorDeletingAccount", { account: account.number }),
      })
    }
    setDeletingAccountId(null)
  }, [existingAccounts, refreshTradesOnly, setAccounts, setTradesStore, t, trades])

  const confirmDeleteAccount = useCallback(async () => {
    if (!accountToDelete) return
    await handleDeleteAccount(accountToDelete)
    setIsDeleteDialogOpen(false)
    setAccountToDelete(null)
  }, [accountToDelete, handleDeleteAccount])

  const handleCreateGroup = useCallback(
    async (name?: string) => {
      const groupName = (name ?? "").trim()
      if (!groupName || !user?.id) return
      try {
        setIsCreating(true)
        const createdGroup = await saveGroup(groupName)
        setSearchQuery("")
        toast.success(t("common.success"), {
          description: t("filters.groupCreated", { name: groupName }),
        })
        return createdGroup
      } catch (error) {
        console.error("Error creating group:", error)
        toast.error(t("common.error"), {
          description: t("filters.errorCreatingGroup", { name: groupName }),
        })
      } finally {
        setIsCreating(false)
      }
    },
    [saveGroup, t, user?.id],
  )

  const confirmDeleteGroup = useCallback(async () => {
    if (!groupToDelete || groupToDelete.isVirtual) return
    setDeletingGroupId(groupToDelete.id)
    try {
      await deleteGroup(groupToDelete.id)
      toast.success(t("common.success"), {
        description: t("filters.groupDeleted", { name: groupToDelete.name }),
      })
      setSelectedAccountIds(prev =>
        prev.filter(accountId => !groupToDelete.accounts.some(acc => acc.id === accountId)),
      )
    } catch (error) {
      console.error("Error deleting group:", error)
      toast.error(t("common.error"), {
        description: t("filters.errorDeletingGroup", { name: groupToDelete.name }),
      })
    } finally {
      setDeletingGroupId(null)
      setIsDeleteGroupDialogOpen(false)
      setGroupToDelete(null)
    }
  }, [deleteGroup, groupToDelete, t])

  const handleCreateGroupAndMove = useCallback(async () => {
    const name = newGroupName.trim()
    if (!name) return
    try {
      const created = await handleCreateGroup(name)
      if (!created?.id) return
      setNewGroupName("")
      setMovingTarget(created.id)
      await handleMoveSelected(created.id)
    } catch (error) {
      console.error("Error creating and moving to group:", error)
    }
  }, [handleCreateGroup, handleMoveSelected, newGroupName])

  const handleRenameSubmit = useCallback(async () => {
    if (!renamingGroupId || !renameValue.trim()) {
      setRenamingGroupId(null)
      setRenameValue("")
      return
    }
    const currentName = groups.find(g => g.id === renamingGroupId)?.name?.trim() || ""
    const nextName = renameValue.trim()
    if (currentName === nextName) {
      setRenamingGroupId(null)
      setRenameValue("")
      return
    }
    try {
      await renameGroup(renamingGroupId, nextName)
      toast.success(t("common.success"), {
        description: t("filters.groupUpdated", { name: nextName }),
      })
    } catch (error) {
      console.error("Error updating group:", error)
      toast.error(t("common.error"), {
        description: t("filters.errorUpdatingGroup", { name: renameValue.trim() }),
      })
    } finally {
      setRenamingGroupId(null)
      setRenameValue("")
    }
  }, [renameGroup, renamingGroupId, renameValue, t])

  useEffect(() => {
    if (renamingGroupId) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [renamingGroupId])

  const trimmedSearchQuery = searchQuery.trim()
  const canCreateGroup =
    trimmedSearchQuery.length > 0 &&
    !groups.some(group => group.name.toLowerCase() === trimmedSearchQuery.toLowerCase())

  const groupsForBoard: BoardGroup[] = useMemo(() => {
    const visibleGroups = groups
      .filter(g => g.name !== HIDDEN_GROUP_NAME)
      .map(g => ({
        id: g.id,
        name: g.name,
        accounts: allAccounts.filter(a => a.groupId === g.id),
        color: paletteFromSeed(g.id).base,
      }))

    const hidden: BoardGroup = {
      id: hiddenGroup?.id || "hidden",
      name: t("filters.hiddenAccounts"),
      accounts: allAccounts.filter(a => a.groupId === hiddenGroup?.id),
      color: paletteFromSeed("hidden").base,
      isVirtual: !hiddenGroup,
    }

    const ungrouped: BoardGroup = {
      id: "none",
      name: t("filters.noGroup"),
      accounts: allAccounts.filter(a => !a.groupId),
      color: paletteFromSeed("none").base,
      isVirtual: true,
    }

    return [ungrouped, hidden, ...visibleGroups]
  }, [allAccounts, hiddenGroup, groups, t])

  if (!user) return null

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t("filters.searchAccount")}
              className={cn("pl-9", canCreateGroup && "pr-40")}
              aria-label={t("filters.searchAccount")}
              autoComplete="off"
              aria-describedby={canCreateGroup ? "create-group-inline-hint" : undefined}
              onKeyDown={e => {
                if (e.key === "Enter" && canCreateGroup && !isCreating) {
                  e.preventDefault()
                  void handleCreateGroup(trimmedSearchQuery)
                }
              }}
            />
            {canCreateGroup && (
              <span
                id="create-group-inline-hint"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 truncate text-xs text-muted-foreground"
              >
                {t("filters.createGroupFromSearch", { name: trimmedSearchQuery })}
              </span>
            )}
          </div>
        </div>

        <div className="px-3 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("filters.selected")}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={movingTarget}
                onValueChange={value => {
                  setMovingTarget(value)
                  void handleMoveSelected(value)
                }}
                disabled={isMoving}
              >
                <SelectTrigger className="h-9 w-[170px]">
                  <SelectValue placeholder={t("filters.moveTo")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("filters.noGroup")}</SelectItem>
                  <SelectItem value="hidden">{t("filters.moveToHidden")}</SelectItem>
                  {groups
                    .filter(g => g.name !== HIDDEN_GROUP_NAME)
                    .map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  <Separator className="my-1" />
                  <div className="px-3 py-2 space-y-2">
                    <Input
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      placeholder={t("filters.createNewGroupPlaceholder")}
                      aria-label={t("filters.createNewGroupPlaceholder")}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          void handleCreateGroupAndMove()
                        }
                      }}
                    />
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => void handleCreateGroupAndMove()}
                      disabled={isCreating}
                    >
                      {isCreating ? t("common.loading") : t("filters.createAndMove")}
                    </Button>
                  </div>
                </SelectContent>
              </Select>
              <Button variant="ghost" onClick={clearSelection} disabled={selectedAccountIds.length === 0} className="h-9">
                {t("filters.clearSelection")}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 min-h-[40px]">
            <div className="flex gap-2 items-center pb-1">
              {selectedAccounts.length === 0 ? (
                <Badge variant="secondary" className="gap-2 whitespace-nowrap h-8">
                  <span className="text-xs text-muted-foreground">{t("filters.noAccounts")}</span>
                </Badge>
              ) : (
                selectedAccounts.map(account => (
                  <Badge
                    key={account.id}
                    variant="secondary"
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleAccountSelection(account.id)}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        toggleAccountSelection(account.id)
                      }
                    }}
                    className="gap-2 whitespace-nowrap h-8 cursor-pointer transition-colors border-transparent hover:bg-primary/10 hover:text-primary hover:border-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent focus-visible:border-transparent active:border-transparent active:ring-0 active:ring-transparent"
                    aria-label={t("common.delete")}
                  >
                    <span className="truncate max-w-[180px]">{account.number}</span>
                    <X className="h-3 w-3" />
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        <Separator />

        <Command shouldFilter={false} className="w-full">
          <CommandList className="max-h-[640px] overflow-y-auto px-2 pb-3 pt-1">
            <CommandEmpty>{t("filters.noResults")}</CommandEmpty>

            {groupsForBoard.map(group => {
              const accounts = group.accounts.filter(acc =>
                matchingAccounts.some(match => match.id === acc.id),
              )
              const isHiddenGroupCard =
                group.id === (hiddenGroup?.id ?? "hidden") || group.name === t("filters.hiddenAccounts")

              if (searchQuery.trim() && accounts.length === 0 && !isHiddenGroupCard) {
                return null
              }

              const isRenaming = renamingGroupId === group.id
              const canRename = !group.isVirtual && group.name !== t("filters.hiddenAccounts")
              const canDelete = !group.isVirtual && group.name !== t("filters.hiddenAccounts")

              return (
                <div
                  key={group.id}
                  className={cn(
                    "relative mb-3 overflow-hidden rounded-lg border bg-background",
                    dragOverGroup === group.id && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
                  )}
                  onDragOver={e => {
                    e.preventDefault()
                    setDragOverGroup(group.id)
                  }}
                  onDrop={e => {
                    e.preventDefault()
                    handleDropToGroup(group.id === "none" ? null : group.id)
                  }}
                  onDragLeave={() => setDragOverGroup(null)}
                >
                  <div
                    className="absolute left-0 top-0 h-full w-1"
                    style={{ backgroundColor: group.color }}
                    aria-hidden
                  />

                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="relative w-fit">
                          <Input
                            ref={renameInputRef}
                            value={(isRenaming ? renameValue : group.name) || group.name}
                            readOnly={!isRenaming}
                            onChange={e => isRenaming && setRenameValue(e.target.value)}
                            className={cn(
                              "h-8 w-fit px-3 text-sm font-semibold leading-8",
                              !isRenaming && "border-transparent bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
                            )}
                            aria-label={t("common.rename")}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleRenameSubmit()
                              if (e.key === "Escape") {
                                setRenamingGroupId(null)
                                setRenameValue("")
                              }
                            }}
                            onBlur={isRenaming ? handleRenameSubmit : undefined}
                          />
                        </div>
                        {canRename && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              if (isRenaming) {
                                handleRenameSubmit()
                                return
                              }
                              setRenamingGroupId(group.id)
                              setRenameValue(group.name)
                              requestAnimationFrame(() => renameInputRef.current?.focus())
                            }}
                            aria-label={isRenaming ? t("common.save") : t("common.rename")}
                          >
                            {isRenaming ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive focus-visible:ring-1 focus-visible:ring-destructive/50"
                            onClick={() => {
                              setGroupToDelete(group)
                              setIsDeleteGroupDialogOpen(true)
                            }}
                            aria-label={t("filters.deleteGroupTitle")}
                            disabled={deletingGroupId === group.id}
                          >
                            {deletingGroupId === group.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <Trash2 className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                        )}
                      </div>
                      <Badge variant="outline">{group.accounts.length}</Badge>
                    </div>
                  </div>

                  <CommandGroup className="px-2 pb-2">
                    {accounts.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground">
                        {t("filters.noAccounts")}
                      </div>
                    ) : (
                      accounts.map(account => (
                        <CommandItem
                          key={account.id}
                          value={`${account.number} ${group.name ?? ""}`}
                          className="flex items-center gap-3 rounded-md border bg-card/60 px-3 py-2"
                          draggable
                          onDragStart={() => handleDragStart(account)}
                          onDragEnd={handleDragEnd}
                          onSelect={() => toggleAccountSelection(account.id)}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-sm border",
                              selectedAccountIds.includes(account.id) && "bg-primary text-primary-foreground",
                            )}
                            aria-label={t("filters.selectAccount")}
                          >
                            {selectedAccountIds.includes(account.id) && <Check className="h-3 w-3" aria-hidden />}
                          </span>

                          <div className="flex-1 min-w-0">
                            <span className="truncate text-sm font-medium">{account.number}</span>
                            <div className="text-xs text-muted-foreground">
                              {account.balanceLabel
                                ? t("filters.balanceLabel", { balance: account.balanceLabel })
                                : t("filters.noGroup")}
                            </div>
                          </div>
                          {!account.isPlaceholder && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive focus-visible:ring-1 focus-visible:ring-destructive/50"
                              aria-label={t("filters.deleteAccount", { account: account.number })}
                              onClick={event => {
                                event.preventDefault()
                                event.stopPropagation()
                                setAccountToDelete(account)
                                setIsDeleteDialogOpen(true)
                              }}
                              onMouseDown={event => event.stopPropagation()}
                              onDragStart={event => event.stopPropagation()}
                              disabled={deletingAccountId === account.id}
                            >
                              {deletingAccountId === account.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden />
                              )}
                            </Button>
                          )}
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                </div>
              )
            })}
          </CommandList>
        </Command>
      </div>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={open => {
          setIsDeleteDialogOpen(open)
          if (!open) setAccountToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("filters.deleteAccountTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("filters.deleteAccountDescription", { account: accountToDelete?.number ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAccountToDelete(null)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDeleteAccount()}
            >
              {t("filters.confirmDeleteAccount")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={isDeleteGroupDialogOpen}
        onOpenChange={open => {
          setIsDeleteGroupDialogOpen(open)
          if (!open) setGroupToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("filters.deleteGroupTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("filters.deleteGroupDescription", { name: groupToDelete?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGroupToDelete(null)}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDeleteGroup()}
              disabled={!!deletingGroupId}
            >
              {deletingGroupId ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

