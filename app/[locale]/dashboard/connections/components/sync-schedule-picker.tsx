'use client'

import { useCallback, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import {
  SYNC_INTERVAL_OPTIONS,
  type SyncScheduleMode,
} from '@/lib/connection-sync-schedule'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  updateConnectionSyncScheduleAction,
  type ConnectionSyncScheduleInput,
} from '../actions'

const primaryButtonClassName =
  'inline-flex items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-4 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]'

const secondaryButtonClassName =
  'inline-flex items-center justify-center rounded-sm border border-black/20 px-3 text-sm font-medium transition-[opacity,transform,background-color] duration-150 hover:bg-black/5 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/5'

const TIME_PRESETS = ['morning', 'midday', 'after-close', 'midnight'] as const

type TimePreset = (typeof TIME_PRESETS)[number]

/**
 * Resolved with literal keys. Calling `t(PRESET_LABEL_KEYS[preset])` asks
 * TypeScript to widen the argument over every translation key at once, which
 * overflows the union size limit (TS2590) at the size the key set has reached.
 * The Record return type still forces a label for every preset.
 */
function presetLabels(
  t: ReturnType<typeof useI18n>,
): Record<TimePreset, string> {
  return {
    morning: t('connections.syncSchedule.presets.morning'),
    midday: t('connections.syncSchedule.presets.midday'),
    'after-close': t('connections.syncSchedule.presets.afterClose'),
    midnight: t('connections.syncSchedule.presets.midnight'),
  }
}

/** Cadence label: "Every 5 min", "Every hour", "Every 4 hours". */
function formatSyncIntervalLabel(
  minutes: number,
  t: ReturnType<typeof useI18n>
): string {
  if (minutes < 60) {
    return t('connections.syncSchedule.everyMinutes', { count: minutes })
  }
  if (minutes === 60) return t('connections.syncSchedule.everyHour')
  return t('connections.syncSchedule.everyHours', { count: minutes / 60 })
}

/** `dailySyncTime` as the "HH:mm" a native time input expects, in local time. */
function toLocalTimeInputValue(
  dailySyncTime: Date | string | null | undefined
): string {
  if (!dailySyncTime) return ''
  const d =
    typeof dailySyncTime === 'string' ? new Date(dailySyncTime) : dailySyncTime
  if (Number.isNaN(d.getTime())) return ''
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/** Local "HH:mm" as the instant the server stores — same clock time, real date. */
function localTimeToUtcIso(value: string): string | null {
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  const localDate = new Date()
  localDate.setHours(hours, minutes, 0, 0)
  return localDate.toISOString()
}

function presetToLocalTime(preset: TimePreset): string {
  let hours = 0
  let minutes = 0
  switch (preset) {
    case 'morning':
      hours = 8
      break
    case 'midday':
      hours = 12
      break
    case 'after-close': {
      // 22:00 UTC is the reference close; show it in the user's own clock.
      const utcClose = new Date()
      utcClose.setUTCHours(22, 0, 0, 0)
      hours = utcClose.getHours()
      minutes = utcClose.getMinutes()
      break
    }
    case 'midnight':
      hours = 0
      break
  }
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`
}

/** Locale-aware "10:00 PM" / "22:00" for the active daily time. */
function formatDailyTime(
  dailySyncTime: Date | null,
  locale: string
): string | null {
  if (!dailySyncTime || Number.isNaN(dailySyncTime.getTime())) return null
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(dailySyncTime)
}

/**
 * Schedule picker for one connection: pick a recurring cadence outright, or open
 * the once-a-day branch to choose a time.
 *
 * Selecting applies immediately — there is no separate save step, so a menu is
 * enough and the desktop path never has to open a dialog. Mobile swaps the menu
 * for a drawer with the same options, the daily branch becoming an accordion
 * because a nested submenu has no good touch equivalent.
 */
export function SyncSchedulePicker({
  connectionId,
  scheduleMode,
  intervalMinutes,
  dailySyncTime,
  label,
  locale,
  onChanged,
}: {
  connectionId: string
  scheduleMode: SyncScheduleMode
  intervalMinutes: number | null
  dailySyncTime: Date | null
  /** Trigger text — the row's countdown, or an invitation to schedule. */
  label: string
  locale: string
  onChanged: () => void
}) {
  const t = useI18n()
  const presetLabel = presetLabels(t)
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [time, setTime] = useState(() => toLocalTimeInputValue(dailySyncTime))

  const activeDailyTime = formatDailyTime(dailySyncTime, locale)

  const handleOpenChange = useCallback(
    (next: boolean) => {
      // Re-seed the input from the saved value on every open, so a typed-then-
      // abandoned time does not linger.
      if (next) setTime(toLocalTimeInputValue(dailySyncTime))
      setOpen(next)
    },
    [dailySyncTime]
  )

  const apply = useCallback(
    async (schedule: ConnectionSyncScheduleInput) => {
      setSaving(true)
      try {
        const result = await updateConnectionSyncScheduleAction(
          connectionId,
          schedule
        )
        if ('error' in result) {
          toast.error(t('connections.syncSchedule.updateFailed'))
          return
        }
        toast.success(
          schedule.mode === 'off'
            ? t('connections.syncSchedule.turnedOff')
            : t('connections.syncSchedule.updated')
        )
        setOpen(false)
        onChanged()
      } catch (error) {
        console.error(error)
        toast.error(t('connections.syncSchedule.updateFailed'))
      } finally {
        setSaving(false)
      }
    },
    [connectionId, onChanged, t]
  )

  const applyInterval = useCallback(
    (minutes: number) => {
      void apply({ mode: 'interval', intervalMinutes: minutes })
    },
    [apply]
  )

  const applyDailyTime = useCallback(
    (localTime: string) => {
      const utcTimeString = localTimeToUtcIso(localTime)
      if (!utcTimeString) return
      void apply({ mode: 'daily', utcTimeString })
    },
    [apply]
  )

  const trigger = (
    <button
      type="button"
      disabled={saving}
      className="inline-flex items-center gap-1 underline decoration-black/20 underline-offset-2 transition-colors duration-150 hover:text-black disabled:opacity-60 dark:decoration-white/20 dark:hover:text-white"
    >
      {saving ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
      ) : null}
      {label}
      {/* The countdown alone does not say what opening this does. Appending
          rather than an aria-label keeps the visible text as the name's start. */}
      <span className="sr-only">, {t('connections.syncSchedule.title')}</span>
    </button>
  )

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        {/* asChild would make the trigger a nested button inside the meta line;
            wrapping keeps the plain-text link semantics of the row. */}
        <span onClick={() => handleOpenChange(true)}>{trigger}</span>
        <DrawerContent className="rounded-t-sm border-black/10 dark:border-white/10">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-normal tracking-tight">
              {t('connections.syncSchedule.title')}
            </DrawerTitle>
            <DrawerDescription className="text-black/55 dark:text-white/55">
              {t('connections.syncSchedule.description')}
            </DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[55vh] overflow-y-auto px-4">
            {/* Two columns: one cadence per row would push the daily branch and
                the footer below the fold on a phone. */}
            <ul className="grid grid-cols-2 gap-2">
              {SYNC_INTERVAL_OPTIONS.map((minutes) => {
                const selected =
                  scheduleMode === 'interval' && intervalMinutes === minutes
                return (
                  <li key={minutes}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      disabled={saving}
                      className={cn(
                        'flex h-12 w-full items-center justify-between gap-2 rounded-sm border px-3 text-left text-sm font-medium disabled:opacity-60',
                        selected
                          ? 'border-black/60 bg-black/[0.06] dark:border-white/60 dark:bg-white/10'
                          : 'border-black/20 dark:border-white/20'
                      )}
                      onClick={() => applyInterval(minutes)}
                    >
                      {formatSyncIntervalLabel(minutes, t)}
                      {selected ? (
                        <Check className="h-4 w-4 shrink-0" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
            <Accordion
              type="single"
              collapsible
              className="mt-2"
              defaultValue={scheduleMode === 'daily' ? 'daily' : undefined}
            >
              <AccordionItem
                value="daily"
                className="border-b-0 border-t border-black/10 dark:border-white/10"
              >
                <AccordionTrigger className="h-12 py-0 text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    {t('connections.syncSchedule.daily')}
                    {scheduleMode === 'daily' && activeDailyTime ? (
                      <span className="text-black/45 dark:text-white/45">
                        {activeDailyTime}
                      </span>
                    ) : null}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      aria-label={t('connections.syncSchedule.timeLabel')}
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="h-11 flex-1 rounded-sm border-black/10 bg-transparent shadow-none focus-visible:border-black/30 focus-visible:ring-0 dark:border-white/10"
                    />
                    <button
                      type="button"
                      disabled={saving || !time}
                      className={cn(primaryButtonClassName, 'h-11')}
                      onClick={() => applyDailyTime(time)}
                    >
                      {t('connections.syncSchedule.setTime')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TIME_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={saving}
                        className={cn(secondaryButtonClassName, 'h-9')}
                        onClick={() => applyDailyTime(presetToLocalTime(preset))}
                      >
                        {presetLabel[preset]}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-black/45 dark:text-white/45">
                    {t('connections.syncSchedule.timezoneNote', { timezone })}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <DrawerFooter>
            <button
              type="button"
              disabled={saving || scheduleMode === 'off'}
              className={cn(
                secondaryButtonClassName,
                'h-11 text-black/55 dark:text-white/55'
              )}
              onClick={() => void apply({ mode: 'off' })}
            >
              {t('connections.syncSchedule.turnOff')}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 rounded-sm border-black/10 dark:border-white/10"
      >
        <DropdownMenuLabel className="text-xs font-normal text-black/45 dark:text-white/45">
          {t('connections.syncSchedule.frequencyLabel')}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={
            scheduleMode === 'interval' && intervalMinutes
              ? String(intervalMinutes)
              : ''
          }
          onValueChange={(value) => applyInterval(Number(value))}
        >
          {SYNC_INTERVAL_OPTIONS.map((minutes) => (
            <DropdownMenuRadioItem
              key={minutes}
              value={String(minutes)}
              className="rounded-sm"
            >
              {formatSyncIntervalLabel(minutes, t)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="rounded-sm pl-8">
            {/* Aligns with the radio items above, whose indicator owns that gutter. */}
            {scheduleMode === 'daily' ? (
              <Check className="absolute left-2 h-4 w-4" aria-hidden />
            ) : null}
            {t('connections.syncSchedule.daily')}
            {scheduleMode === 'daily' && activeDailyTime ? (
              <span className="ml-1 text-black/45 dark:text-white/45">
                {activeDailyTime}
              </span>
            ) : null}
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-56 rounded-sm border-black/10 dark:border-white/10">
              {TIME_PRESETS.map((preset) => (
                <DropdownMenuItem
                  key={preset}
                  className="rounded-sm"
                  onSelect={() => applyDailyTime(presetToLocalTime(preset))}
                >
                  {presetLabel[preset]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
              {/* Typing lives outside the menu's keyboard model: without this the
                  menu would read digits as typeahead and arrows as navigation. */}
              <div
                className="space-y-2 p-1"
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') applyDailyTime(time)
                }}
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    aria-label={t('connections.syncSchedule.timeLabel')}
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-8 flex-1 rounded-sm border-black/10 bg-transparent px-2 text-sm shadow-none focus-visible:border-black/30 focus-visible:ring-0 dark:border-white/10"
                  />
                  <button
                    type="button"
                    disabled={saving || !time}
                    className={cn(secondaryButtonClassName, 'h-8 shrink-0 px-2')}
                    onClick={() => applyDailyTime(time)}
                  >
                    {t('connections.syncSchedule.setTime')}
                  </button>
                </div>
                <p className="text-xs text-black/45 dark:text-white/45">
                  {t('connections.syncSchedule.timezoneNote', { timezone })}
                </p>
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
        <DropdownMenuItem
          className="rounded-sm"
          disabled={scheduleMode === 'off'}
          onSelect={() => void apply({ mode: 'off' })}
        >
          {t('connections.syncSchedule.turnOff')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
