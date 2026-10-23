'use client'

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import Link from 'next/link'
import { Check, Copy, Info, LayoutGrid, Plus, X } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { ApiScope } from '@/lib/api/scopes'
import type { OAuthAppFieldError } from '@/lib/api/oauth-app-input'
import {
  canRemoveRedirectUri,
  fieldErrorMessage,
  type OAuthAppErrorLocaleKey,
  scopeGroups,
  uriRowErrorMessage,
} from './connections-format'

/**
 * Translator for server validation keys. Each key is a literal `t()` call, so
 * the i18n types stay simple (passing the key union to `t` is too complex for
 * TypeScript).
 */
export function oauthAppErrorTranslator(
  t: ReturnType<typeof useI18n>,
): (key: OAuthAppErrorLocaleKey) => string {
  const copy: Record<OAuthAppErrorLocaleKey, string> = {
    'validation.nameRequired': t('validation.nameRequired'),
    'validation.nameTooLong': t('validation.nameTooLong'),
    'validation.descriptionTooLong': t('validation.descriptionTooLong'),
    'validation.redirectUriRequired': t('validation.redirectUriRequired'),
    'validation.redirectUrisTooMany': t('validation.redirectUrisTooMany'),
    'validation.redirectUriScheme': t('validation.redirectUriScheme'),
    'validation.redirectUriInvalid': t('validation.redirectUriInvalid'),
    'validation.redirectUriFragment': t('validation.redirectUriFragment'),
    'validation.redirectUriUserinfo': t('validation.redirectUriUserinfo'),
    'validation.scopesRequired': t('validation.scopesRequired'),
    'validation.scopeUnknown': t('validation.scopeUnknown'),
    'validation.nothingToUpdate': t('validation.nothingToUpdate'),
  }
  return (key) => copy[key]
}

export const primaryButtonClass =
  'h-9 rounded-[4px] bg-[#171717] px-4 text-sm font-medium text-white shadow-none hover:bg-[#171717]/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90'
export const outlineButtonClass =
  'h-9 rounded-[4px] border-[#E5E5E5] bg-white px-4 text-sm font-medium text-[#171717] shadow-none hover:bg-[#FAFAFA] dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted'
export const dangerButtonClass =
  'h-9 rounded-[4px] bg-[#DC2626] px-4 text-sm font-medium text-white shadow-none hover:bg-[#B91C1C]'
export const smOutlineButtonClass =
  'h-8 rounded-[4px] border-[#E5E5E5] bg-white px-3 text-[13px] font-medium text-[#171717] shadow-none hover:bg-[#FAFAFA] dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted'
export const smPrimaryButtonClass =
  'h-8 rounded-[4px] bg-[#171717] px-3 text-[13px] font-medium text-white shadow-none hover:bg-[#171717]/90 dark:bg-foreground dark:text-background'

const fieldClass =
  'h-9 rounded-[4px] border-[#E5E5E5] bg-white px-3 text-base text-[#171717] shadow-none placeholder:text-[#A3A3A3] focus-visible:border-[#A3A3A3] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_3px_rgba(23,23,23,0.06)] sm:text-sm dark:border-border dark:bg-background dark:text-foreground'
const fieldErrorClass =
  'border-[#DC2626] focus-visible:border-[#DC2626] focus-visible:shadow-none'

export function scopeLabel(
  t: ReturnType<typeof useI18n>,
  scope: string,
): string {
  switch (scope) {
    case 'profile:read':
      return t('dashboard.settings.connections.scope.profileRead')
    case 'trades:read':
      return t('dashboard.settings.connections.scope.tradesRead')
    case 'accounts:read':
      return t('dashboard.settings.connections.scope.accountsRead')
    case 'connections:read':
      return t('dashboard.settings.connections.scope.connectionsRead')
    case 'metrics:read':
      return t('dashboard.settings.connections.scope.metricsRead')
    case 'trades:write':
      return t('dashboard.settings.connections.scope.tradesWrite')
    case 'connections:write':
      return t('dashboard.settings.connections.scope.connectionsWrite')
    case 'imports:write':
      return t('dashboard.settings.connections.scope.importsWrite')
    default:
      return scope
  }
}

export function TextLink({
  children,
  onClick,
  href,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
  className?: string
}) {
  const classNames = cn(
    'text-[13px] text-[#686D67] underline decoration-[#D4D4D4] underline-offset-[3px] hover:text-[#171717] dark:text-muted-foreground dark:hover:text-foreground',
    className,
  )
  if (href) {
    return (
      <Link href={href} className={classNames}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={classNames}>
      {children}
    </button>
  )
}

export function ScopeChips({
  scopes,
  className,
}: {
  scopes: string[]
  className?: string
}) {
  if (scopes.length === 0) return null
  return (
    <div className={cn('mt-1.5 flex flex-wrap gap-1', className)}>
      {scopes.map((scope) => (
        <span
          key={scope}
          className="rounded-[4px] border border-[#E5E5E5] bg-[#FAFAFA] px-1.5 py-px font-mono text-[11px] leading-4 text-[#404040] dark:border-border dark:bg-muted dark:text-foreground"
        >
          {scope}
        </span>
      ))}
    </div>
  )
}

export function MetaSep() {
  return <span className="mx-1.5 text-[#C4C4C4]">·</span>
}

export function ScopePicker({
  selected,
  onToggle,
  original,
  stacked = false,
}: {
  selected: readonly string[]
  onToggle: (scope: ApiScope) => void
  original?: readonly string[]
  stacked?: boolean
}) {
  const t = useI18n()
  const groups = scopeGroups(selected)
  const originalSet = new Set(original ?? [])

  const renderGroup = (
    label: string,
    aside: string,
    rows: { id: ApiScope; checked: boolean }[],
  ) => (
    <div className="mt-4">
      <p className="mb-1.5 flex items-baseline justify-between text-xs font-medium leading-4 text-[#686D67] dark:text-muted-foreground">
        <span>{label}</span>
        <span className="font-normal">{aside}</span>
      </p>
      <div className="overflow-hidden rounded-[4px] border border-[#E5E5E5] dark:border-border">
        {rows.map((row) => {
          const isNew = Boolean(original) && row.checked && !originalSet.has(row.id)
          return (
            <label
              key={row.id}
              className={cn(
                'flex cursor-pointer gap-2.5 border-[#E5E5E5] px-3 py-2 first:border-t-0 border-t dark:border-border',
                stacked ? 'items-start' : 'items-center',
                isNew && 'bg-[#FAFAFA] dark:bg-muted/40',
              )}
            >
              <Checkbox
                checked={row.checked}
                onCheckedChange={() => onToggle(row.id)}
                className="mt-0.5 size-4 rounded-[4px] border-[#D4D4D4] data-[state=checked]:border-[#171717] data-[state=checked]:bg-[#171717] data-[state=checked]:text-white dark:data-[state=checked]:border-foreground dark:data-[state=checked]:bg-foreground [&_svg]:size-3"
              />
              <span className={cn('min-w-0', stacked ? 'flex flex-col gap-px' : 'contents')}>
                <span
                  className={cn(
                    'font-mono text-xs leading-4 text-[#171717] dark:text-foreground',
                    !stacked && 'min-w-[136px]',
                  )}
                >
                  {row.id}
                </span>
                <span className="text-[13px] leading-[18px] text-[#686D67] dark:text-muted-foreground">
                  {scopeLabel(t, row.id)}
                </span>
              </span>
              {isNew ? (
                <span className="ml-auto rounded-[4px] border border-[#E5E5E5] bg-white px-1.5 text-[11px] leading-4 text-[#404040] dark:border-border dark:bg-background dark:text-foreground">
                  {t('dashboard.settings.connections.new')}
                </span>
              ) : null}
            </label>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      {renderGroup(
        t('dashboard.settings.connections.read'),
        t('dashboard.settings.connections.readCount', {
          count: String(groups.readChecked),
          total: String(groups.readTotal),
        }),
        groups.read,
      )}
      {renderGroup(
        t('dashboard.settings.connections.write'),
        t('dashboard.settings.connections.writeHint'),
        groups.write,
      )}
    </>
  )
}

export function toggleScope(selected: string[], scope: ApiScope): string[] {
  return selected.includes(scope)
    ? selected.filter((item) => item !== scope)
    : [...selected, scope]
}

export function RedirectUriEditor({
  uris,
  onChange,
  errors,
  hint,
}: {
  uris: string[]
  onChange: (uris: string[]) => void
  errors: readonly OAuthAppFieldError[]
  hint: string
}) {
  const t = useI18n()
  const formError = fieldErrorMessage(errors, 'redirectUris')
  const canRemove = canRemoveRedirectUri(uris.length)

  return (
    <div className="mt-4">
      <Label className="mb-1.5 block text-[13px] font-medium text-[#171717] dark:text-foreground">
        {t('dashboard.settings.connections.redirects.label')}
      </Label>
      <div className="space-y-2">
        {uris.map((uri, index) => {
          const rowError = uriRowErrorMessage(errors, index)
          return (
            <div key={index}>
              <div className="flex items-center gap-2">
                <Input
                  value={uri}
                  onChange={(event) => {
                    const next = [...uris]
                    next[index] = event.target.value
                    onChange(next)
                  }}
                  spellCheck={false}
                  aria-invalid={rowError ? true : undefined}
                  className={cn(
                    fieldClass,
                    'min-w-0 flex-1 font-mono sm:text-[13px]',
                    rowError && fieldErrorClass,
                  )}
                />
                <button
                  type="button"
                  aria-label={t('dashboard.settings.connections.removeUri')}
                  disabled={!canRemove}
                  onClick={() => onChange(uris.filter((_, item) => item !== index))}
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-[#E5E5E5] bg-white text-[#686D67] hover:text-[#171717] disabled:bg-[#FAFAFA] disabled:opacity-40 dark:border-border dark:bg-background dark:text-muted-foreground',
                  )}
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {rowError ? (
                <p className="mt-1.5 text-xs leading-4 text-[#DC2626]">{rowError}</p>
              ) : null}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#686D67] hover:text-[#171717] dark:text-muted-foreground dark:hover:text-foreground"
        onClick={() => onChange([...uris, ''])}
      >
        <Plus className="size-3.5" />
        {t('dashboard.settings.connections.addUri')}
      </button>
      {formError ? (
        <p className="mt-1.5 text-xs leading-4 text-[#DC2626]">{formError}</p>
      ) : (
        <p className="mt-1.5 text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs leading-4 text-[#DC2626]">{message}</p>
}

export function NameField({
  value,
  onChange,
  error,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
  autoFocus?: boolean
}) {
  const t = useI18n()
  return (
    <div className="mt-4">
      <Label
        htmlFor="connection-app-name"
        className="mb-1.5 block text-[13px] font-medium text-[#171717] dark:text-foreground"
      >
        {t('dashboard.settings.connections.name')}
      </Label>
      <Input
        id="connection-app-name"
        value={value}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(fieldClass, error && fieldErrorClass)}
      />
      <FieldError message={error} />
    </div>
  )
}

export function DescriptionField({
  value,
  onChange,
  error,
  hint,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
}) {
  const t = useI18n()
  return (
    <div className="mt-4">
      <Label
        htmlFor="connection-app-description"
        className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-[#171717] dark:text-foreground"
      >
        {t('dashboard.settings.connections.description')}
        <span className="font-normal text-[#686D67] dark:text-muted-foreground">
          {t('dashboard.settings.connections.optional')}
        </span>
      </Label>
      <Textarea
        id="connection-app-description"
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          fieldClass,
          'h-[72px] min-h-[72px] resize-none py-2 text-base sm:text-sm',
          error && fieldErrorClass,
        )}
      />
      <FieldError message={error} />
      {!error && hint ? (
        <p className="mt-1.5 text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type CopyState = 'idle' | 'copied' | 'failed'

const COPY_FEEDBACK_MS = 2000

function selectElementText(element: HTMLElement | null) {
  if (!element || typeof window === 'undefined') return
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(element)
  selection.removeAllRanges()
  selection.addRange(range)
}

/**
 * Copy `value`, falling back to `execCommand('copy')` on the selected text.
 * iOS Safari can lack `navigator.clipboard` or reject `writeText`, so both
 * paths are awaited and caught. Leaves the text selected when both fail so
 * the user can copy it by hand.
 */
export async function copyText(value: string, element: HTMLElement | null): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Fall through to the selection fallback.
  }
  selectElementText(element)
  try {
    return typeof document !== 'undefined' && document.execCommand('copy')
  } catch {
    return false
  }
}

export function CopyValue({
  label,
  value,
  once,
  compact = false,
}: {
  label?: string
  value: string
  once?: string
  compact?: boolean
}) {
  const t = useI18n()
  const valueRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function handleCopy() {
    const ok = await copyText(value, valueRef.current)
    if (!ok) selectElementText(valueRef.current)
    setState(ok ? 'copied' : 'failed')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setState('idle'), COPY_FEEDBACK_MS)
  }

  const buttonLabel =
    state === 'copied'
      ? t('dashboard.settings.connections.copied')
      : state === 'failed'
        ? t('dashboard.settings.connections.copyFailed')
        : t('dashboard.settings.connections.copy')

  return (
    <div className="mt-4">
      {label ? (
        <p className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-[#171717] dark:text-foreground">
          <span>{label}</span>
          {once ? (
            <span className="text-xs font-normal text-[#686D67] dark:text-muted-foreground">
              {once}
            </span>
          ) : null}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <div
          ref={valueRef}
          className={cn(
            'flex h-10 min-w-0 flex-1 select-all items-center overflow-hidden whitespace-nowrap rounded-[4px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 font-mono text-[#171717] dark:border-border dark:bg-muted dark:text-foreground',
            compact ? 'text-xs' : 'text-[13px]',
          )}
        >
          {value}
        </div>
        <Button
          type="button"
          variant="outline"
          data-state={state}
          className={cn(
            outlineButtonClass,
            'h-10 shrink-0',
            state === 'failed' && 'border-[#DC2626] text-[#DC2626] hover:text-[#DC2626]',
          )}
          onClick={() => {
            void handleCopy()
          }}
        >
          {state === 'copied' ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {buttonLabel}
        </Button>
        <span className="sr-only" aria-live="polite" role="status">
          {state === 'copied'
            ? t('dashboard.settings.connections.copied')
            : state === 'failed'
              ? t('dashboard.settings.connections.copyFailed')
              : ''}
        </span>
      </div>
    </div>
  )
}

export function StepBars({ step, label }: { step: 1 | 2 | 3 | 4; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((bar) => (
          <i
            key={bar}
            className={cn(
              'block h-[3px] w-5 rounded-sm',
              bar <= step ? 'bg-[#171717] dark:bg-foreground' : 'bg-[#E5E5E5] dark:bg-border',
            )}
          />
        ))}
      </div>
      <span className="text-xs leading-4 text-[#686D67] dark:text-muted-foreground">{label}</span>
    </div>
  )
}

export function CredentialsReadyMark({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="flex size-5 items-center justify-center rounded-full bg-[#EFF5EC] text-[#2F5A2A]">
        <Check className="size-2.5" strokeWidth={3.5} />
      </span>
      <span className="text-xs text-[#686D67] dark:text-muted-foreground">{label}</span>
    </div>
  )
}

export function InfoCallout({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex gap-2 rounded-[4px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2.5 text-xs leading-4 text-[#404040] dark:border-border dark:bg-muted/40 dark:text-foreground">
      <Info className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export function OwnedAppIcon() {
  return (
    <span className="mt-px flex size-7 shrink-0 items-center justify-center rounded-[4px] border border-[#E5E5E5] bg-[#F5F5F5] text-[#404040] dark:border-border dark:bg-muted dark:text-foreground">
      <LayoutGrid className="size-3.5" />
    </span>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
  title,
  description,
  leading,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  leading?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const isMobile = useIsMobile()
  const titleClass = 'text-left text-[18px] font-semibold leading-[18px] tracking-[-0.01em]'
  const descriptionClass = 'mt-2 text-left text-sm leading-5 text-[#686D67] dark:text-muted-foreground'

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[4px] border-[#E5E5E5] px-4 pb-6 pt-4 dark:border-border"
        >
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#E5E5E5] dark:bg-border" />
          {leading}
          <SheetHeader className="space-y-0 text-left">
            <SheetTitle className={titleClass}>{title}</SheetTitle>
            {description ? (
              <SheetDescription className={descriptionClass}>{description}</SheetDescription>
            ) : (
              <SheetDescription className="sr-only">{title}</SheetDescription>
            )}
          </SheetHeader>
          {children}
          {footer ? (
            <div className="mt-6 flex flex-col-reverse gap-2 [&_button]:w-full">{footer}</div>
          ) : null}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'grid-cols-[minmax(0,1fr)] gap-0 rounded-[4px] border-[#E5E5E5] p-6 shadow-lg dark:border-border',
          wide ? 'sm:max-w-[520px]' : 'sm:max-w-[448px]',
        )}
      >
        {leading}
        <DialogHeader className="space-y-0 text-left">
          <DialogTitle className={titleClass}>{title}</DialogTitle>
          {description ? (
            <DialogDescription className={descriptionClass}>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {typeof title === 'string' ? title : 'Dialog'}
            </DialogDescription>
          )}
        </DialogHeader>
        {children}
        {footer ? <div className="mt-6 flex items-center justify-end gap-2">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  )
}

export function SplitFooter({
  start,
  children,
}: {
  start?: ReactNode
  children: ReactNode
}) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <div className="mt-6 flex flex-col-reverse gap-2">
        {start ? <div>{start}</div> : <span />}
        <div className="flex gap-2 [&_button]:flex-1">{children}</div>
      </div>
    )
  }
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <div>{start}</div>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

/** Group header row inside a Connections / Developers card. */
export function GroupHead({
  title,
  description,
  action,
}: {
  title: string
  description: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 bg-[#FCFCFC] px-4 py-3.5 dark:bg-muted/20">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#171717] dark:text-foreground">{title}</p>
        <div className="mt-0.5 max-w-[440px] text-xs leading-4 text-[#686D67] dark:text-muted-foreground">
          {description}
        </div>
      </div>
      {action}
    </div>
  )
}

export function RowAction({
  children,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className="shrink-0 text-sm text-[#686D67] hover:text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground"
      {...props}
    >
      {children}
    </button>
  )
}
