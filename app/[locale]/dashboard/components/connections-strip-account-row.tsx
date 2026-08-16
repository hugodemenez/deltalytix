'use client'

import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { Check, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { CommandItem } from '@/components/ui/command'
import { Switch } from '@/components/ui/switch'
import type { ConnectionsPageAccount } from '@/app/[locale]/dashboard/connections/types'
import { isMaskedAccount } from './connections-strip-items'

function stopRowActivation(event: SyntheticEvent) {
  event.stopPropagation()
}

export function ConnectionsStripAccountRow({
  account,
  selected,
  hiddenGroupId,
  canDelete,
  masking,
  deleting,
  onSelect,
  onMask,
  onRename,
  onRequestDelete,
}: {
  account: ConnectionsPageAccount
  selected: boolean
  hiddenGroupId: string | null
  canDelete: boolean
  masking: boolean
  deleting: boolean
  onSelect: (accountNumber: string) => void
  onMask: (account: ConnectionsPageAccount, masked: boolean) => void
  onRename: (
    account: ConnectionsPageAccount,
    nextNumber: string
  ) => Promise<boolean>
  onRequestDelete: (account: ConnectionsPageAccount) => void
}) {
  const t = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const submitLockRef = useRef(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(account.number)
  const [renaming, setRenaming] = useState(false)
  const masked = isMaskedAccount(account, hiddenGroupId)
  const metaLabel = account.propfirm?.trim() || null

  useEffect(() => {
    if (!isRenaming) setRenameValue(account.number)
  }, [account.number, isRenaming])

  useEffect(() => {
    if (!isRenaming) return
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [isRenaming])

  const cancelRename = () => {
    setIsRenaming(false)
    setRenameValue(account.number)
  }

  const submitRename = async () => {
    if (submitLockRef.current) return
    const nextNumber = renameValue.trim()
    if (!nextNumber || nextNumber === account.number) {
      cancelRename()
      return
    }
    submitLockRef.current = true
    setRenaming(true)
    const ok = await onRename(account, nextNumber)
    setRenaming(false)
    submitLockRef.current = false
    if (ok) setIsRenaming(false)
    else inputRef.current?.focus()
  }

  return (
    <CommandItem
      value={account.number}
      onSelect={() => {
        if (isRenaming) return
        onSelect(account.number)
      }}
      className="items-center gap-2 rounded-[3px] px-3 py-2"
    >
      <span className="min-w-0 flex-1">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={isRenaming ? renameValue : account.number}
          readOnly={!isRenaming}
          tabIndex={isRenaming ? 0 : -1}
          aria-label={t('connections.strip.rename')}
          aria-hidden={!isRenaming}
          disabled={renaming}
          onChange={(event) => {
            if (isRenaming) setRenameValue(event.target.value)
          }}
          onClick={(event) => {
            if (isRenaming) stopRowActivation(event)
          }}
          onPointerDown={(event) => {
            if (isRenaming) stopRowActivation(event)
          }}
          onKeyDown={(event) => {
            if (!isRenaming) return
            event.stopPropagation()
            if (event.key === 'Enter') {
              event.preventDefault()
              void submitRename()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              cancelRename()
            }
          }}
          onBlur={() => {
            if (isRenaming && !renaming) void submitRename()
          }}
          className={cn(
            'box-border h-7 w-full min-w-0 truncate rounded-[3px] border bg-transparent px-1.5 text-base font-medium leading-7 outline-none sm:text-sm',
            'text-[#171917] dark:text-foreground',
            isRenaming
              ? 'border-[#E5E5E5] bg-white focus-visible:ring-2 focus-visible:ring-[#181A18] dark:border-border dark:bg-background dark:focus-visible:ring-white'
              : masked
                ? 'border-transparent text-[#686D67] dark:text-muted-foreground'
                : 'border-transparent'
          )}
        />
        {metaLabel ? (
          <span className="mt-0.5 block truncate px-1.5 text-xs text-[#686D67] dark:text-muted-foreground">
            {metaLabel}
          </span>
        ) : null}
      </span>

      <div
        className="flex shrink-0 items-center gap-0.5"
        onPointerDown={stopRowActivation}
        onMouseDown={stopRowActivation}
        onClick={stopRowActivation}
      >
        <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[3px] px-1.5 text-xs text-[#686D67] dark:text-muted-foreground">
          <span>{t('connections.strip.mask')}</span>
          <Switch
            checked={masked}
            disabled={masking}
            onCheckedChange={(checked) => onMask(account, checked)}
            className="data-[state=checked]:bg-[#3E7550]"
          />
        </label>
        <button
          type="button"
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-[3px] text-[#686D67] transition-[background-color,color,transform] duration-150',
            'hover:bg-[#F5F5F5] hover:text-[#171917] active:scale-[0.96]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#181A18]',
            'dark:text-muted-foreground dark:hover:bg-muted/50 dark:hover:text-foreground dark:focus-visible:ring-white'
          )}
          aria-label={
            isRenaming
              ? t('connections.strip.saveName')
              : t('connections.strip.rename')
          }
          disabled={renaming}
          onMouseDown={(event) => {
            if (isRenaming) event.preventDefault()
          }}
          onClick={() => {
            if (isRenaming) {
              void submitRename()
              return
            }
            setIsRenaming(true)
            setRenameValue(account.number)
          }}
        >
          {renaming ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : isRenaming ? (
            <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          ) : (
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          )}
        </button>
        {canDelete ? (
          <button
            type="button"
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-[3px] text-[#686D67] transition-[background-color,color,transform] duration-150',
              'hover:bg-[#F5F5F5] hover:text-red-600 active:scale-[0.96]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#181A18]',
              'dark:text-muted-foreground dark:hover:bg-muted/50 dark:hover:text-red-400 dark:focus-visible:ring-white'
            )}
            aria-label={t('connections.strip.deleteAccount', {
              account: account.number,
            })}
            disabled={deleting}
            onClick={() => onRequestDelete(account)}
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            )}
          </button>
        ) : null}
        {selected ? (
          <Check
            className="h-4 w-4 shrink-0 text-[#3E7550]"
            strokeWidth={2}
            aria-hidden
          />
        ) : (
          <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
        )}
      </div>
    </CommandItem>
  )
}
