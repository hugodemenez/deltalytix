"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FolderCog, FolderPlus, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useModalStateStore } from "@/store/modal-state-store"
import {
  AccountSearchCommand,
  type AccountSearchItem,
} from "./account-search-command"
import { AccountsSortMenu } from "./accounts-sort-menu"

interface AccountsToolbarProps {
  searchItems: AccountSearchItem[]
  onSelectAccount: (accountId: string) => void
  className?: string
}

export function AccountsToolbar({
  searchItems,
  onSelectAccount,
  className,
}: AccountsToolbarProps) {
  const t = useI18n()
  const { saveGroup } = useData()
  const setAccountGroupBoardOpen = useModalStateStore(
    (state) => state.setAccountGroupBoardOpen,
  )

  const toolbarRef = useRef<HTMLDivElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return

    const updateToolbarMetrics = () => {
      const rect = toolbar.getBoundingClientRect()
      document.documentElement.style.setProperty(
        "--accounts-toolbar-height",
        `${rect.height + 16}px`,
      )
    }

    updateToolbarMetrics()

    const resizeObserver = new ResizeObserver(updateToolbarMetrics)
    resizeObserver.observe(toolbar)
    window.addEventListener("resize", updateToolbarMetrics)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateToolbarMetrics)
      document.documentElement.style.removeProperty("--accounts-toolbar-height")
    }
  }, [])

  const handleCreateGroupOpenChange = useCallback((open: boolean) => {
    setCreateGroupOpen(open)
    if (!open) {
      setGroupName("")
      setIsCreating(false)
    }
  }, [])

  const handleCreateGroup = useCallback(async () => {
    const name = groupName.trim()
    if (!name) return

    setIsCreating(true)
    try {
      const created = await saveGroup(name)
      if (created) {
        toast.success(t("accounts.toolbar.createGroupSuccess", { name }))
        handleCreateGroupOpenChange(false)
      } else {
        toast.error(t("accounts.toolbar.createGroupError"))
      }
    } catch {
      toast.error(t("accounts.toolbar.createGroupError"))
    } finally {
      setIsCreating(false)
    }
  }, [groupName, saveGroup, t, handleCreateGroupOpenChange])

  return (
    <>
      <div
        ref={toolbarRef}
        className={cn(
          "fixed inset-x-0 mx-auto z-10 bottom-4 max-w-[calc(100vw-1rem)] px-2 sm:px-0 w-full sm:w-fit",
          className,
        )}
      >
        <div className="flex items-center justify-center bg-background/95 border shadow-lg rounded-3xl px-2.5 py-2 gap-2">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full p-0 transition-[transform] duration-150 active:scale-95"
            aria-label={t("accounts.toolbar.searchAccounts")}
            title={t("accounts.toolbar.searchAccounts")}
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          <AccountsSortMenu variant="toolbar" />

          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full p-0 transition-[transform] duration-150 active:scale-95"
            aria-label={t("accounts.toolbar.createGroup")}
            title={t("accounts.toolbar.createGroup")}
            onClick={() => setCreateGroupOpen(true)}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full p-0 transition-[transform] duration-150 active:scale-95"
            aria-label={t("accounts.toolbar.editGroups")}
            title={t("accounts.toolbar.editGroups")}
            onClick={() => setAccountGroupBoardOpen(true)}
          >
            <FolderCog className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AccountSearchCommand
        open={searchOpen}
        onOpenChange={setSearchOpen}
        items={searchItems}
        onSelect={onSelectAccount}
      />

      <Dialog open={createGroupOpen} onOpenChange={handleCreateGroupOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("accounts.toolbar.createGroup")}</DialogTitle>
            <DialogDescription>
              {t("accounts.toolbar.createGroupDescription")}
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder={t("accounts.toolbar.groupNamePlaceholder")}
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !isCreating) {
                void handleCreateGroup()
              }
            }}
            disabled={isCreating}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleCreateGroupOpenChange(false)}
              disabled={isCreating}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void handleCreateGroup()} disabled={isCreating || !groupName.trim()}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("accounts.toolbar.createGroup")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
