'use client'

import type { SyntheticEvent } from 'react'
import { Check, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { CommandItem } from '@/components/ui/command'
import { useUserStore } from '@/store/user-store'
import type { ConnectionsPageAccount } from '@/app/[locale]/dashboard/connections/types'
import {
  formatStripBalance,
  isMaskedAccount,
  journaledAccountBalance,
} from './connections-strip-items'

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
  onRequestDelete: (account: ConnectionsPageAccount) => void
}) {
  const t = useI18n()
  const masked = isMaskedAccount(account, hiddenGroupId)
  const storeAccount = useUserStore((state) =>
    state.accounts.find(
      (item) => item.id === account.id || item.number === account.number
    )
  )
  const balance = journaledAccountBalance(storeAccount)
  const formattedBalance =
    balance == null ? null : formatStripBalance(balance)

  return (
    <CommandItem
      value={`${account.number} ${account.propfirm ?? ''}`}
      onSelect={() => onSelect(account.number)}
      className="items-center gap-2 rounded-[3px] px-3 py-2"
    >
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
      <span
        className={cn(
          'min-w-0 flex-1',
          masked && 'text-[#686D67] opacity-60 dark:text-muted-foreground'
        )}
      >
        <span
          className={cn(
            'block truncate text-base font-medium leading-6 sm:text-sm',
            masked
              ? 'text-[#686D67] dark:text-muted-foreground'
              : 'text-[#171917] dark:text-foreground'
          )}
        >
          {account.number}
        </span>
        <span
          className="mt-0.5 block truncate text-xs leading-4 text-[#686D67] dark:text-muted-foreground tabular-nums"
          aria-label={
            formattedBalance
              ? t('connections.strip.balance', { amount: formattedBalance })
              : undefined
          }
        >
          {formattedBalance ?? '\u00a0'}
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
      </div>
    </CommandItem>
  )
}
