import { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff, Filter, X } from "lucide-react"
import { useState, useEffect } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { useTableConfigStore } from "@/store/table-config-store"
import { Switch } from "@/components/ui/switch"
import { useI18n } from "@/locales/client"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
  tableId?: string
  showFilter?: boolean
  showToggle?: boolean
  toggleLabel?: string
  onToggleChange?: (value: boolean) => void
  toggleValue?: boolean
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  tableId,
  showFilter = false,
  showToggle = false,
  toggleLabel,
  onToggleChange,
  toggleValue = false,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const { updateColumnVisibility } = useTableConfigStore()
  const t = useI18n()
  
  // Initialize filter values from existing filter state
  const currentFilter = column.getFilterValue() as { min?: number; max?: number } | undefined
  const [minValue, setMinValue] = useState(currentFilter?.min?.toString() || '')
  const [maxValue, setMaxValue] = useState(currentFilter?.max?.toString() || '')

  // Update local state when filter changes externally
  useEffect(() => {
    const filter = column.getFilterValue() as { min?: number; max?: number } | undefined
    setMinValue(filter?.min?.toString() || '')
    setMaxValue(filter?.max?.toString() || '')
  }, [column.getFilterValue()])

  const handleHideColumn = () => {
    if (tableId) {
      updateColumnVisibility(tableId, column.id, false)
    } else {
      // Fallback to default behavior if no tableId provided
      column.toggleVisibility(false)
    }
  }

  const handleApplyFilter = () => {
    const min = minValue ? parseFloat(minValue) : undefined
    const max = maxValue ? parseFloat(maxValue) : undefined
    
    if (min !== undefined || max !== undefined) {
      column.setFilterValue({ min, max })
    } else {
      column.setFilterValue(undefined)
    }
  }

  const handleClearFilter = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMinValue('')
    setMaxValue('')
    column.setFilterValue(undefined)
  }

  const isFiltered = column.getFilterValue() !== undefined

  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "-ml-3 h-8 data-[state=open]:bg-accent",
              isFiltered && "bg-accent"
            )}
          >
            <span>{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-1 h-3.5 w-3.5" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-1 h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/70" />
            )}
            {isFiltered && (
              <Filter className="ml-1 h-3.5 w-3.5 text-muted-foreground/70" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {t('table.sortAscending')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {t('table.sortDescending')}
          </DropdownMenuItem>
          {showToggle && (
            <>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between px-2 py-1.5">
                <Label htmlFor="toggle-mode" className="text-sm font-normal">
                  {toggleLabel}
                </Label>
                <Switch
                  id="toggle-mode"
                  checked={toggleValue}
                  onCheckedChange={onToggleChange}
                />
              </div>
            </>
          )}
          {showFilter && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                  {t('table.filter')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-80">
                  <div className="grid gap-4 p-2">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">{title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('table.filterByRange')}
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="min-value">{t('table.min')}</Label>
                          <Input
                            id="min-value"
                            type="number"
                            placeholder={t('table.min')}
                            value={minValue}
                            onChange={(e) => setMinValue(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="max-value">{t('table.max')}</Label>
                          <Input
                            id="max-value"
                            type="number"
                            placeholder={t('table.max')}
                            value={maxValue}
                            onChange={(e) => setMaxValue(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilter}
                        className="flex-1"
                      >
                        {t('table.clear')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApplyFilter}
                        className="flex-1"
                      >
                        {t('table.apply')}
                      </Button>
                    </div>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleHideColumn}>
            <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {t('table.hideColumn')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
