"use client"

import { useMemo } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useI18n } from "@/locales/client"

export interface AccountSearchItem {
  id: string
  label: string
  groupName: string | null
}

interface AccountSearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: AccountSearchItem[]
  onSelect: (accountId: string) => void
}

const UNGROUPED_KEY = "__ungrouped__"

export function AccountSearchCommand({
  open,
  onOpenChange,
  items,
  onSelect,
}: AccountSearchCommandProps) {
  const t = useI18n()

  const groupedItems = useMemo(() => {
    const groups = new Map<string, AccountSearchItem[]>()

    for (const item of items) {
      const key = item.groupName ?? UNGROUPED_KEY
      const group = groups.get(key)
      if (group) {
        group.push(item)
      } else {
        groups.set(key, [item])
      }
    }

    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (a === UNGROUPED_KEY) return 1
      if (b === UNGROUPED_KEY) return -1
      return a.localeCompare(b)
    })

    return sortedKeys.map((key) => ({
      key,
      heading: key === UNGROUPED_KEY ? t("propFirm.ungrouped") : key,
      items: groups.get(key) ?? [],
    }))
  }, [items, t])

  const handleSelect = (accountId: string) => {
    onSelect(accountId)
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("accounts.toolbar.searchPlaceholder")} />
      <CommandList>
        <CommandEmpty>{t("accounts.toolbar.noResults")}</CommandEmpty>
        {groupedItems.map((group) => (
          <CommandGroup key={group.key} heading={group.heading}>
            {group.items.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.label} ${item.id}`}
                onSelect={() => handleSelect(item.id)}
              >
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
