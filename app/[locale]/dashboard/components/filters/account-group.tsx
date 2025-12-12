"use client"

import type React from "react"
import { useState } from "react"
import { AccountCoin, type Account } from "./account-coin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Edit2, Trash2, EyeOff } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"

export interface AccountGroup {
  id: string
  name: string
  accounts: Account[]
  color?: string
}

interface AccountGroupProps {
  group: AccountGroup
  onDrop?: (e: React.DragEvent, groupId: string) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDragStart?: (e: React.DragEvent, account: Account, fromGroupId: string) => void
  onDragEnd?: () => void
  onRename?: (groupId: string, newName: string) => void
  onDelete?: (groupId: string) => void
  isDragOver?: boolean
  className?: string
  isHiddenGroup?: boolean
}

export function AccountGroup({
  group,
  onDrop,
  onDragOver,
  onDragLeave,
  onDragStart,
  onDragEnd,
  onRename,
  onDelete,
  isDragOver = false,
  className,
  isHiddenGroup = false,
}: AccountGroupProps) {
  const t = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(group.name)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDrop?.(e, group.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver?.(e)
  }

  const handleRename = () => {
    if (editName.trim() && editName !== group.name) {
      onRename?.(group.id, editName.trim())
    }
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename()
    } else if (e.key === "Escape") {
      setEditName(group.name)
      setIsEditing(false)
    }
  }

  return (
    <Card
      className={cn(
        "transition-all duration-300 ease-out",
        isDragOver && "ring-2 ring-primary shadow-lg scale-[1.02]",
        isHiddenGroup && "border-destructive",
        className,
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyPress}
              className="text-lg font-semibold h-8 px-2"
              autoFocus
            />
          ) : (
            <CardTitle className="text-lg flex items-center gap-2">
              {isHiddenGroup && <EyeOff className="h-4 w-4 text-destructive" />}
              {isHiddenGroup ? t("filters.hiddenAccounts") : group.name}
            </CardTitle>
          )}

          {!isHiddenGroup && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  {t("common.rename")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete?.(group.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {group.accounts.length} {group.accounts.length !== 1 ? t("filters.accounts") : t("filters.account")}
        </p>
      </CardHeader>

      <CardContent>
        {group.accounts.length === 0 ? (
          <div className="flex items-center justify-center h-16 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground text-sm">{t("filters.dropAccountsHere")}</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {group.accounts.map((account) => (
              <div
                key={account.id}
                className="shrink-0 transition-transform duration-200 ease-out"
              >
                <AccountCoin
                  account={account}
                  onDragStart={(e, account) => onDragStart?.(e, account, group.id)}
                  onDragEnd={onDragEnd}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
