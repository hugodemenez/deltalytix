"use client"

import { useState, useMemo } from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Settings, Check, X, Trash2, EyeOff } from "lucide-react"
import { useI18n } from "@/locales/client"
import { useUserData } from "@/components/context/user-data"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ensureAccountAndAssignGroup } from "@/app/[locale]/(dashboard)/actions/accounts"
import { getGroups } from "@/app/[locale]/(dashboard)/dashboard/data/actions"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"

const HIDDEN_GROUP_NAME = "Hidden Accounts"

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

export function AccountGroupBoard() {
  const t = useI18n()
  const {
    user,
    groups = [],
    trades = [],
    setGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    isLoading,
    refreshGroups,
  } = useUserData()
  
  const [newGroupName, setNewGroupName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Extract all account numbers from trades
  const tradeAccountNumbers = useMemo(() => {
    return [...new Set(trades.map(t => t.accountNumber))]
  }, [trades])

  // Calculate accounts that are in groups
  const groupedAccountNumbers = useMemo(() => {
    return new Set(groups.flatMap(g => g.accounts).map(a => a.number))
  }, [groups])

  // Calculate ungrouped accounts (accounts that exist in trades but not in any group)
  const ungroupedAccounts = useMemo(() => {
    return tradeAccountNumbers
      .filter(number => !groupedAccountNumbers.has(number))
      .map(number => ({
        id: number,
        number,
        groupId: null
      }))
  }, [tradeAccountNumbers, groupedAccountNumbers])

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user?.id) return
    try {
      setIsCreating(true)
      await createGroup(newGroupName.trim())
      setNewGroupName("")
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
  }

  const handleUpdateGroup = async (groupId: string, newName: string) => {
    try {
      await updateGroup(groupId, newName)
      setEditingGroupId(null)
      setEditingGroupName("")
      toast.success(t("common.success"), {
        description: t("filters.groupUpdated", { name: newName })
      })
    } catch (error) {
      console.error("Error updating group:", error)
      toast.error(t("common.error"), {
        description: t("filters.errorUpdatingGroup", { name: newName })
      })
    }
  }

  const handleMoveAccount = async (accountNumber: string, groupId: string | null) => {
    try {
      // If moving to hidden group, ensure it exists
      if (groupId === "hidden" && user?.id) {
        const hiddenGroup = groups.find((g: Group) => g.name === HIDDEN_GROUP_NAME)
        if (!hiddenGroup) {
          // Create hidden group if it doesn't exist
          await createGroup(HIDDEN_GROUP_NAME)
          await refreshGroups()
          // Get the new hidden group ID
          const updatedGroups = await getGroups()
          const newHiddenGroup = updatedGroups.find((g: Group) => g.name === HIDDEN_GROUP_NAME)
          if (newHiddenGroup) {
            groupId = newHiddenGroup.id
          }
        } else {
          groupId = hiddenGroup.id
        }
      }

      const result = await ensureAccountAndAssignGroup(accountNumber, groupId)
      
      if (result.success) {
        toast.success(t("common.success"), {
          description: t("filters.accountMoved", { account: accountNumber })
        })
        refreshGroups() // Refresh the groups to update the UI
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error moving account:", error)
      toast.error(t("common.error"), {
        description: t("filters.errorMovingAccount", { account: accountNumber })
      })
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
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
  }

  const anonymizeAccount = (account: string) => {
    // This is a placeholder - use your actual anonymization function
    return account
  }

  // Return early if loading
  if (isLoading) {
    return <div className="p-4">{t("filters.loading")}</div>
  }

  // Return early if no user
  if (!user) {
    return null
  }

  const isHiddenGroup = (group: Group) => group.name === HIDDEN_GROUP_NAME

  // Helper function to get display name for a group
  const getGroupDisplayName = (group: Group) => {
    return isHiddenGroup(group) ? t("filters.hiddenAccounts") : group.name
  }

  // Helper function to get visible groups (excluding hidden group)
  const getVisibleGroups = (groups: Group[]) => {
    return groups.filter(g => !isHiddenGroup(g))
  }

  // Helper function to render the "Move to Hidden" option
  const renderMoveToHiddenOption = () => (
    <SelectItem value="hidden" className="cursor-pointer">
      <div className="flex items-center gap-2 text-destructive">
        <EyeOff className="h-4 w-4" />
        {t("filters.moveToHidden")}
      </div>
    </SelectItem>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-medium">{t("filters.accountGroups")}</h3>
        
        {/* Create Group */}
        <div className="flex items-center gap-2">
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder={t("filters.newGroup")}
            className="w-[200px]"
            disabled={isCreating}
          />
          <Button onClick={handleCreateGroup} disabled={!newGroupName.trim() || isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            {t("filters.createGroup")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Ungrouped Accounts */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium">{t("filters.noGroup")} ({ungroupedAccounts.length})</h4>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {ungroupedAccounts.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center p-2">
                  {t("filters.noAccounts")}
                </div>
              ) : (
                ungroupedAccounts.map(account => (
                  <div key={account.id} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md">
                    <span className="text-sm">{anonymizeAccount(account.number)}</span>
                    <Select
                      onValueChange={async (value) => {
                        await handleMoveAccount(account.number, value || null)
                      }}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder={t("filters.moveTo")} />
                      </SelectTrigger>
                      <SelectContent>
                        {renderMoveToHiddenOption()}
                        {getVisibleGroups(groups).map(group => (
                          <SelectItem key={group.id} value={group.id} className="cursor-pointer">
                            {getGroupDisplayName(group)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))
              )}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </Card>

        {/* Existing Groups */}
        {groups.map(group => (
          <Card key={group.id} className={cn("p-4", isHiddenGroup(group) && "border-destructive")}>
            <div className="flex items-center justify-between mb-4">
              {editingGroupId === group.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    className="h-8 w-[180px]"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleUpdateGroup(group.id, editingGroupName)}
                    disabled={!editingGroupName.trim() || editingGroupName === group.name}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingGroupId(null)
                      setEditingGroupName("")
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    {isHiddenGroup(group) && <EyeOff className="h-4 w-4 text-destructive" />}
                    {getGroupDisplayName(group)} ({group.accounts.length})
                  </h4>
                  <div className="flex items-center gap-1">
                    {!isHiddenGroup(group) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditingGroupId(group.id)
                          setEditingGroupName(group.name)
                        }}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("filters.deleteGroupTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("filters.deleteGroupDescription", { name: getGroupDisplayName(group) })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteGroup(group.id, group.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t("common.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {group.accounts.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center p-2">
                    {t("filters.noAccounts")}
                  </div>
                ) : (
                  group.accounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md">
                      <span className="text-sm">{anonymizeAccount(account.number)}</span>
                      <Select
                        defaultValue={group.id}
                        onValueChange={async (value) => {
                          // If value is "none", we want to remove the account from any group
                          const groupId = value === "none" ? null : value
                          await handleMoveAccount(account.number, groupId)
                        }}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue placeholder={t("filters.moveTo")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="cursor-pointer">{t("filters.noGroup")}</SelectItem>
                          {!isHiddenGroup(group) && renderMoveToHiddenOption()}
                          {getVisibleGroups(groups)
                            .filter(g => g.id !== group.id)
                            .map(g => (
                              <SelectItem key={g.id} value={g.id} className="cursor-pointer">
                                {getGroupDisplayName(g)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </Card>
        ))}
      </div>
    </div>
  )
}

