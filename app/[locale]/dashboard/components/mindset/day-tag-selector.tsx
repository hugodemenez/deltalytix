'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Check } from 'lucide-react'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { tradeMatchesDateKey } from '@/lib/trades/trade-matches-date'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Trade } from '@/prisma/generated/prisma/browser'
import { useUserStore } from '@/store/user-store'
import { createTagAction } from '@/server/tags'
import { format } from 'date-fns'
import { formatCount, widgetType } from '../widgets'

interface DayTagSelectorProps {
  trades: Trade[]
  date: Date
  onApplyTagToAll: (tag: string) => Promise<void>
}

/** A tag's own color is identity, so it stays a 8px dot, never a filled pill. */
function TagDot({ color }: { color?: string | null }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full border"
      style={color ? { backgroundColor: color } : undefined}
    />
  )
}

export function DayTagSelector({ trades, date, onApplyTagToAll }: DayTagSelectorProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const tags = useUserStore(state => state.tags)
  const setTags = useUserStore(state => state.setTags)
  const [isApplying, setIsApplying] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  // Get trades for the selected date
  const tradesForDay = useMemo(() => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return trades.filter((trade) => tradeMatchesDateKey(trade, dateKey))
  }, [trades, date])

  // Calculate tag statistics
  const tagStats = useMemo(() => {
    const stats = new Map<string, { count: number, totalTrades: number }>()

    tradesForDay.forEach(trade => {
      trade.tags.forEach(tag => {
        const current = stats.get(tag) || { count: 0, totalTrades: tradesForDay.length }
        stats.set(tag, { count: current.count + 1, totalTrades: tradesForDay.length })
      })
    })

    return Array.from(stats.entries()).map(([tag, data]) => ({
      tag,
      count: data.count,
      totalTrades: data.totalTrades,
      isComplete: data.count === data.totalTrades
    }))
  }, [tradesForDay])

  const handleApplyToAll = async (tag: string) => {
    setIsApplying(tag)
    try {
      await onApplyTagToAll(tag)
    } finally {
      setIsApplying(null)
    }
  }

  const handleCreateAndApply = async (tagName: string) => {
    const trimmedTag = tagName.trim()
    if (!trimmedTag) return

    setIsApplying(trimmedTag)
    try {
      // Create the tag if it doesn't exist
      const existingTag = tags.find(t => t.name.toLowerCase() === trimmedTag.toLowerCase())
      if (!existingTag) {
        const newTag = await createTagAction({
          name: trimmedTag,
          description: '',
          color: '#CBD5E1'
        })
        setTags([...tags, newTag.tag])
      }

      // Apply to all trades
      await onApplyTagToAll(trimmedTag)

      setInputValue('')
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to create and apply tag:', error)
    } finally {
      setIsApplying(null)
    }
  }

  // Get tag metadata (color, description)
  const getTagMetadata = (tagName: string) => {
    return tags.find(t => t.name.toLowerCase() === tagName.toLowerCase())
  }

  const addTagPopover = (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-fit px-2"
          disabled={isApplying !== null}
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
          {t('mindset.tags.addNew')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" side="right" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('mindset.tags.search')}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue && isApplying === null) {
                e.preventDefault()
                handleCreateAndApply(inputValue)
              }
            }}
          />
          <CommandList className="max-h-[200px] overflow-y-auto">
            {inputValue.trim() && (
              <CommandItem
                value={inputValue.trim()}
                onSelect={(value) => {
                  if (isApplying === null) {
                    handleCreateAndApply(value)
                  }
                }}
              >
                {t('mindset.tags.createAndApply', { tag: inputValue.trim() })}
              </CommandItem>
            )}
            {tags.length > 0 && (
              <CommandGroup heading={t('mindset.tags.existing')}>
                {tags
                  .filter(tag => {
                    // Filter out tags that are already on all trades
                    const tagStat = tagStats.find(ts => ts.tag.toLowerCase() === tag.name.toLowerCase())
                    return !tagStat || !tagStat.isComplete
                  })
                  .filter(tag => {
                    const input = inputValue.trim().toLowerCase()
                    return !input || tag.name.toLowerCase().includes(input)
                  })
                  .map(tag => (
                    <CommandItem
                      key={tag.name}
                      value={tag.name}
                      onSelect={() => {
                        if (isApplying === null) {
                          handleCreateAndApply(tag.name)
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <TagDot color={tag.color} />
                        <span>{tag.name}</span>
                        {tag.description && (
                          <span className={widgetType.caption}>
                            {tag.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            <CommandEmpty>{t('mindset.tags.noTags')}</CommandEmpty>
          </CommandList>
        </Command>
        {isApplying !== null && (
          <div className="absolute right-2 top-2">
            <div className="size-4 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin" />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )

  if (tradesForDay.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h4 className={widgetType.section}>{t('mindset.tags.title')}</h4>
        <p className={widgetType.label}>{t('mindset.tags.noTrades')}</p>

        {/* Add new tag button - still available even with no trades */}
        {addTagPopover}
      </div>
    )
  }

  /*
   * Tags are ordinary metadata: a quiet outlined control with the tag's own
   * color as a dot, plus the coverage count in words, rather than a filled
   * pill whose background carries the meaning.
   */
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className={widgetType.section}>{t('mindset.tags.title')}</h4>
        <span className={widgetType.caption}>
          {formatCount(tradesForDay.length, locale)}{' '}
          {tradesForDay.length === 1 ? t('mindset.tags.trade') : t('mindset.tags.trades')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {tagStats.map(({ tag, count, totalTrades, isComplete }) => {
          const metadata = getTagMetadata(tag)
          return (
            <TooltipProvider key={tag}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2"
                    aria-pressed={isComplete}
                    aria-label={`${tag}, ${formatCount(count, locale)}/${formatCount(totalTrades, locale)}, ${isComplete ? t('mindset.tags.allTradesTagged') : t('mindset.tags.clickToApplyToAll')}`}
                    onClick={() => !isComplete && handleApplyToAll(tag)}
                  >
                    <TagDot color={metadata?.color} />
                    <span className="text-xs">{tag}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatCount(count, locale)}/{formatCount(totalTrades, locale)}
                    </span>
                    {isComplete && <Check className="h-3 w-3" aria-hidden />}
                    {isApplying === tag && (
                      <span
                        aria-hidden
                        className="size-3 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isComplete
                      ? t('mindset.tags.allTradesTagged')
                      : t('mindset.tags.clickToApplyToAll')
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}

        {/* Add new tag button */}
        {addTagPopover}
      </div>

      {tagStats.length === 0 && (
        <p className={widgetType.label}>{t('mindset.tags.noTagsOnTrades')}</p>
      )}

      <p className={widgetType.caption}>{t('mindset.tags.description')}</p>
    </div>
  )
}
