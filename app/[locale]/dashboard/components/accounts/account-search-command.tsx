"use client"

import { useEffect, useMemo, useRef } from "react"
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
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
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
  const inputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  const handleSelect = (accountId: string) => {
    onSelect(accountId)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="max-h-[85dvh] flex flex-col"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DrawerHeader className="shrink-0 text-left">
          <DrawerTitle>{t("accounts.toolbar.searchAccounts")}</DrawerTitle>
        </DrawerHeader>

        <Command className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-t bg-background **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 **:[[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 **:[[cmdk-input]]:h-12 **:[[cmdk-item]]:px-2 **:[[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput
            ref={inputRef}
            placeholder={t("accounts.toolbar.searchPlaceholder")}
          />
          <CommandList className="max-h-[min(60dvh,28rem)]">
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
        </Command>
      </DrawerContent>
    </Drawer>
  )
}
