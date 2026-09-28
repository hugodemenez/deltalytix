'use client'

import { useMemo, useState } from 'react'
import { Minus, Tag as TagIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useI18n } from '@/locales/client'
import { useData } from '@/context/data-provider'
import { useUserStore } from '@/store/user-store'
import { Trade } from '@/prisma/generated/prisma/browser'
import {
  intersectionTagLists,
  uniqueTradeIds,
  unionTagLists,
  type TradeTagOperation,
} from '@/lib/trades/tag-merge'
import { TradeTagPicker } from './trade-tag-picker'
import { cn } from '@/lib/utils'

const toolbarButtonClassName =
  'col-span-2 h-8 w-full max-w-full text-xs font-normal whitespace-nowrap sm:col-span-1 sm:h-10 sm:text-sm xl:w-auto'

interface BulkTagActionsProps {
  selectedTradeIds: string[]
  trades: Pick<Trade, 'id' | 'tags'>[]
}

export function BulkTagActions({
  selectedTradeIds,
  trades,
}: BulkTagActionsProps) {
  const t = useI18n()
  const { updateTradeTags } = useData()
  const tags = useUserStore((state) => state.tags)
  const [addOpen, setAddOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const selectedIds = useMemo(
    () => uniqueTradeIds(selectedTradeIds),
    [selectedTradeIds],
  )

  const selectedTagLists = useMemo(() => {
    const selected = new Set(selectedIds)
    return trades
      .filter((trade) => selected.has(trade.id))
      .map((trade) => trade.tags)
  }, [selectedIds, trades])

  const tagsOnEverySelected = useMemo(
    () => intersectionTagLists(selectedTagLists),
    [selectedTagLists],
  )

  const tagsOnAnySelected = useMemo(
    () => unionTagLists(selectedTagLists),
    [selectedTagLists],
  )

  const removableTags = useMemo(
    () => tags.filter((tag) => tagsOnAnySelected.includes(tag.name)),
    [tags, tagsOnAnySelected],
  )

  const uncataloguedRemovableTags = useMemo(
    () =>
      tagsOnAnySelected.filter(
        (name) => !tags.some((tag) => tag.name === name),
      ),
    [tags, tagsOnAnySelected],
  )

  const removePickerTags = useMemo(
    () => [
      ...removableTags,
      ...uncataloguedRemovableTags.map((name) => ({
        id: name,
        name,
        description: null,
        color: '#CBD5E1',
        userId: '',
        createdAt: new Date(0),
        updatedAt: new Date(0),
      })),
    ],
    [removableTags, uncataloguedRemovableTags],
  )

  if (selectedIds.length === 0) return null

  const applyTag = async (tag: string, operation: TradeTagOperation) => {
    if (isUpdating) return
    setIsUpdating(true)
    try {
      const result = await updateTradeTags(selectedIds, tag, operation)
      const count = result?.updatedCount ?? selectedIds.length
      toast.success(
        operation === 'add'
          ? t('trade-table.bulkAddTagSuccess', { count })
          : t('trade-table.bulkRemoveTagSuccess', { count }),
      )
      setAddOpen(false)
      setRemoveOpen(false)
    } catch (error) {
      console.error('Failed to bulk update tags:', error)
      toast.error(t('trade-table.bulkTagError'))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={toolbarButtonClassName}
            disabled={isUpdating}
          >
            <TagIcon className="mr-2 h-4 w-4" />
            {t('trade-table.bulkAddTag')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="relative p-0" align="end">
          <TradeTagPicker
            tags={tags}
            hiddenTagNames={tagsOnEverySelected}
            allowCreate
            isUpdating={isUpdating}
            onSelectTag={(tag) => applyTag(tag, 'add')}
          />
        </PopoverContent>
      </Popover>
      <Popover open={removeOpen} onOpenChange={setRemoveOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(toolbarButtonClassName)}
            disabled={isUpdating}
          >
            <Minus className="mr-2 h-4 w-4" />
            {t('trade-table.bulkRemoveTag')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="relative p-0" align="end">
          <TradeTagPicker
            tags={removePickerTags}
            allowCreate={false}
            isUpdating={isUpdating}
            emptyLabel={t('trade-table.bulkNoTagsToRemove')}
            onSelectTag={(tag) => applyTag(tag, 'remove')}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
