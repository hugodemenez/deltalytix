import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Settings, RotateCcw } from "lucide-react"
import { useI18n } from '@/locales/client'
import { useTableConfigStore, TableColumnConfig } from '@/store/table-config-store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface ColumnConfigDialogProps {
  tableId: string
  trigger?: React.ReactNode
}

export function ColumnConfigDialog({ tableId, trigger }: ColumnConfigDialogProps) {
  const t = useI18n()
  const {
    tables,
    updateColumnVisibility,
    resetTableConfig,
  } = useTableConfigStore()

  const tableConfig = tables[tableId]
  const columns = tableConfig?.columns || []

  const handleColumnToggle = (columnId: string, visible: boolean) => {
    updateColumnVisibility(tableId, columnId, visible)
  }

  // Get the current visibility state from the store
  const currentVisibility = tableConfig?.columnVisibility || {}

  const handleReset = () => {
    resetTableConfig(tableId)
    toast.success(t('trade-table.resetConfigSuccess'))
  }

  const defaultTrigger = (
    <Button variant="outline" className="w-[180px] h-10 font-normal">
      <Settings className="h-4 w-4 mr-2" />
      Configuration
    </Button>
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('trade-table.resetConfig')}</DialogTitle>
          <DialogDescription>
            {t('trade-table.resetConfigDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-3">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={currentVisibility[column.id] !== false}
                  onCheckedChange={(checked) => 
                    handleColumnToggle(column.id, checked as boolean)
                  }
                />
                <label
                  htmlFor={column.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {column.title}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-[180px] h-10">
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('trade-table.resetConfig')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('trade-table.resetConfigConfirmTitle')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('trade-table.resetConfigConfirmDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>
                  {t('trade-table.confirmReset')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  )
} 