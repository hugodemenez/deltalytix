'use client'

import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { Check, Eye, EyeOff, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { CommandItem } from '@/components/ui/command'
import type { ConnectionsPageAccount } from '@/app/[locale]/dashboard/connections/types'
import { accountDisplayName, isMaskedAccount } from './connections-strip-items'

function stopRowActivation(event: SyntheticEvent) {
  event.stopPropagation()
}

const iconButtonClass = cn(
  'inline-flex size-8 items-center justify-center rounded-[3px] transition-[background-color,color,transform] duration-150',
  'active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#181A18]',
  'dark:focus-visible:ring-white'
)

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
    nextName: string
  ) => Promise<boolean>
  onRequestDelete: (account: ConnectionsPageAccount) => void
}) {
  const t = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const submitLockRef = useRef(false)
  const displayName = accountDisplayName(account)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(displayName ?? '')
  const [renaming, setRenaming] = useState(false)
  const masked = isMaskedAccount(account, hiddenGroupId)
  const title = displayName ?? account.number

  useEffect(() => {
    if (!isRenaming) setRenameValue(displayName ?? '')
  }, [displayName, isRenaming])

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
    setRenameValue(displayName ?? '')
  }

  const submitRename = async () => {
    if (submitLockRef.current) return
    const nextName = renameValue.trim()
    if (nextName === (displayName ?? '')) {
      cancelRename()
      return
    }
    submitLockRef.current = true
    setRenaming(true)
    const ok = await onRename(account, nextName)
    setRenaming(false)
    submitLockRef.current = false
    if (ok) setIsRenaming(false)
    else inputRef.current?.focus()
  }

  return (
    <CommandItem
      value={`${displayName ?? ''} ${account.number}`}
      onSelect={() => {
        if (isRenaming) return
        onSelect(account.number)
      }}
      className="items-center gap-2 rounded-[3px] px-3 py-2"
    >
      <span
        className={cn(
          'min-w-0 flex-1',
          masked && 'text-[#686D67] opacity-60 dark:text-muted-foreground'
        )}
      >
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={isRenaming ? renameValue : title}
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
            isRenaming
              ? 'border-[#E5E5E5] bg-white text-[#171917] focus-visible:ring-2 focus-visible:ring-[#181A18] dark:border-border dark:bg-background dark:text-foreground dark:focus-visible:ring-white'
              : 'border-transparent',
            !isRenaming &&
              (masked
                ? 'text-[#686D67] dark:text-muted-foreground'
                : 'text-[#171917] dark:text-foreground')
          )}
        />
        <span
          className={cn(
            'mt-0.5 block h-4 truncate px-1.5 text-xs leading-4',
            masked
              ? 'text-[#686D67] dark:text-muted-foreground'
              : 'text-[#686D67] dark:text-muted-foreground'
          )}
        >
          {displayName || isRenaming ? account.number : '\u00a0'}
        </span>
      </span>

      <div
        className="flex shrink-0 items-center gap-0.5"
        onPointerDown={stopRowActivation}
        onMouseDown={stopRowActivation}
        onClick={stopRowActivation}
      >
        <button
          type="button"
          className={cn(
            iconButtonClass,
            masked
              ? 'text-[#3E7550] hover:bg-[#EFF5EC] hover:text-[#3E7550] dark:text-[#9BC4A8] dark:hover:bg-[#243028] dark:hover:text-[#9BC4A8]'
              : 'text-[#686D67] hover:bg-[#F5F5F5] hover:text-[#171917] dark:text-muted-foreground dark:hover:bg-muted/50 dark:hover:text-foreground'
          )}
          aria-label={
            masked ? t('connections.strip.unmask') : t('connections.strip.mask')
          }
          aria-pressed={masked}
          disabled={masking}
          onClick={() => onMask(account, !masked)}
        >
          <span className="relative inline-flex size-3.5">
            <Eye
              className={cn(
                'absolute inset-0 size-3.5 motion-safe:transition-[opacity,transform,filter] motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.2,0,0,1)]',
                masked
                  ? 'scale-[0.25] opacity-0 blur-[4px]'
                  : 'scale-100 opacity-100 blur-0'
              )}
              strokeWidth={2}
              aria-hidden
            />
            <EyeOff
              className={cn(
                'absolute inset-0 size-3.5 motion-safe:transition-[opacity,transform,filter] motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.2,0,0,1)]',
                masked
                  ? 'scale-100 opacity-100 blur-0'
                  : 'scale-[0.25] opacity-0 blur-[4px]'
              )}
              strokeWidth={2}
              aria-hidden
            />
          </span>
        </button>
        <div className={cn('flex items-center gap-0.5', masked && 'opacity-60')}>
        <button
          type="button"
          className={cn(
            iconButtonClass,
            'text-[#686D67] hover:bg-[#F5F5F5] dark:text-muted-foreground dark:hover:bg-muted/50',
            masked
              ? 'hover:text-[#686D67] dark:hover:text-muted-foreground'
              : 'hover:text-[#171917] dark:hover:text-foreground'
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
            setRenameValue(displayName ?? '')
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
              iconButtonClass,
              'text-[#686D67] dark:text-muted-foreground',
              masked
                ? 'hover:bg-[#F5F5F5] hover:text-[#686D67] dark:hover:bg-muted/50 dark:hover:text-muted-foreground'
                : 'hover:bg-[#F5F5F5] hover:text-red-600 dark:hover:bg-muted/50 dark:hover:text-red-400'
            )}
            aria-label={t('connections.strip.deleteAccount', {
              account: displayName ?? account.number,
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
            className={cn(
              'h-4 w-4 shrink-0',
              masked
                ? 'text-[#686D67] dark:text-muted-foreground'
                : 'text-[#171917] dark:text-foreground'
            )}
            strokeWidth={2}
            aria-hidden
          />
        ) : (
          <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
        )}
        </div>
      </div>
    </CommandItem>
  )
}
