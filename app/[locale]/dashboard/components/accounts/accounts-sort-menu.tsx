"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListOrdered,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { WidgetSize } from "../../types/dashboard"
import { useAccountsSortingStore } from "@/store/accounts-sorting-store"
import type { SortingState } from "@tanstack/react-table"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type SortOption = {
  id: string
  label: string
}

interface AccountsSortMenuProps {
  variant?: "header" | "toolbar"
  size?: WidgetSize
  className?: string
}

function SortRuleItem({
  sort,
  label,
  reorderLabel,
  toggleLabel,
  removeLabel,
  onToggleDirection,
  onRemove,
}: {
  sort: SortingState[number]
  label: string
  reorderLabel: string
  toggleLabel: string
  removeLabel: string
  onToggleDirection: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sort.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm",
        isDragging && "opacity-70 shadow-sm"
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={reorderLabel}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 truncate">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggleDirection}
        className="h-7 w-7"
        aria-label={toggleLabel}
      >
        {sort.desc ? (
          <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        aria-label={removeLabel}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function AccountsSortMenu({
  variant = "header",
  size = "large",
  className,
}: AccountsSortMenuProps) {
  const t = useI18n()
  const { sorting, setSorting, clearSorting } = useAccountsSortingStore()
  const [sortingMenuOpen, setSortingMenuOpen] = useState(false)
  const [pendingSortId, setPendingSortId] = useState("")

  const sortOptions = useMemo<SortOption[]>(
    () => [
      { id: "group", label: t("accounts.table.group") },
      { id: "account", label: t("accounts.table.account") },
      { id: "propfirm", label: t("accounts.table.propfirm") },
      { id: "startDate", label: t("accounts.table.startDate") },
      { id: "funded", label: t("accounts.table.funded") },
      { id: "balance", label: t("accounts.table.balance") },
      { id: "totalFee", label: t("accounts.table.totalFee") },
      { id: "targetProgress", label: t("accounts.table.targetProgress") },
      { id: "drawdown", label: t("accounts.table.drawdownRemaining") },
      { id: "consistency", label: t("propFirm.card.consistency") },
      { id: "maxDailyProfit", label: t("propFirm.card.highestDailyProfit") },
      { id: "tradingDays", label: t("propFirm.card.tradingDays") },
    ],
    [t]
  )

  const availableSortOptions = useMemo(
    () => sortOptions.filter((option) => !sorting.some((rule) => rule.id === option.id)),
    [sortOptions, sorting]
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sortingLabel =
    sorting.length > 0
      ? t("table.sortingRules", { count: sorting.length })
      : t("table.sorting")

  return (
    <Popover open={sortingMenuOpen} onOpenChange={setSortingMenuOpen}>
      <PopoverTrigger asChild>
        {variant === "toolbar" ? (
          <Button
            variant="ghost"
            className={cn(
              "h-10 w-10 rounded-full p-0 transition-transform active:scale-95 relative",
              className
            )}
            aria-label={t("table.sorting")}
            title={t("table.sorting")}
          >
            <ListOrdered className="h-4 w-4" />
            {sorting.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground">
                {sorting.length}
              </span>
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5",
              size === "small" ? "h-7 px-2 text-xs" : "h-8 px-2 sm:px-3",
              className
            )}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            <span className={cn((size === "small") && "sr-only", "hidden min-[420px]:inline")}>
              {sortingLabel}
            </span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side={variant === "toolbar" ? "top" : undefined}
        className="w-[calc(100vw-2rem)] max-w-80 p-3"
      >
        <div className="space-y-3">
          {sorting.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {t("table.noSorting")}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event
                if (!over || active.id === over.id) return
                const oldIndex = sorting.findIndex(
                  (rule) => rule.id === active.id
                )
                const newIndex = sorting.findIndex(
                  (rule) => rule.id === over.id
                )
                if (oldIndex === -1 || newIndex === -1) return
                setSorting((prev) => arrayMove(prev, oldIndex, newIndex))
              }}
            >
              <SortableContext
                items={sorting.map((rule) => rule.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sorting.map((rule) => {
                    const label =
                      sortOptions.find(
                        (option) => option.id === rule.id
                      )?.label ?? rule.id
                    return (
                      <SortRuleItem
                        key={rule.id}
                        sort={rule}
                        label={label}
                        reorderLabel={t("table.reorderSort")}
                        toggleLabel={
                          rule.desc
                            ? t("table.sortDescending")
                            : t("table.sortAscending")
                        }
                        removeLabel={t("table.removeSort")}
                        onToggleDirection={() =>
                          setSorting((prev) =>
                            prev.map((item) =>
                              item.id === rule.id
                                ? { ...item, desc: !item.desc }
                                : item
                            )
                          )
                        }
                        onRemove={() =>
                          setSorting((prev) =>
                            prev.filter((item) => item.id !== rule.id)
                          )
                        }
                      />
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <div className="flex items-center gap-2">
            <Select
              value={pendingSortId}
              onValueChange={(value) => {
                const nextValue = value === "__none" ? "" : value
                setPendingSortId(nextValue)
                if (nextValue) {
                  setSorting((prev) => [
                    ...prev,
                    { id: nextValue, desc: false },
                  ])
                  setPendingSortId("")
                }
              }}
            >
              <SelectTrigger className="h-8 flex-1">
                <SelectValue placeholder={t("table.pickSortColumn")} />
              </SelectTrigger>
              <SelectContent>
                {availableSortOptions.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    {t("table.noMoreSortOptions")}
                  </SelectItem>
                ) : (
                  availableSortOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSorting}
              disabled={sorting.length === 0}
            >
              {t("table.clearSorting")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
