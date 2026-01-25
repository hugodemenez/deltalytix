'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowDown,
  ArrowUp,
  CalendarIcon,
  Info,
  ListOrdered,
  Plus,
  X,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Trash2,
  Save,
  Settings,
  ChevronLeft,
  ChevronRight,
  Loader2,
  GripVertical,
  LayoutGrid,
  Table,
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, Locale } from "date-fns"
import { cn, calculateTradingDays } from "@/lib/utils"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { AccountTable } from './account-table'
import { toast } from "sonner"
import { WidgetSize } from '../../types/dashboard'
import { enUS, fr } from 'date-fns/locale'
import { useParams } from 'next/navigation'
import { AccountCard } from './account-card'
import { AccountConfigurator } from './account-configurator'
import { AccountsTableView } from './accounts-table-view'
import { AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogDescription, AlertDialogTitle, AlertDialogContent, AlertDialogHeader, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { AlertDialog } from '@/components/ui/alert-dialog'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Account } from '@/context/data-provider'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { useAccountOrderStore } from '@/store/account-order-store'
import { useAccountsViewPreferenceStore } from '@/store/accounts-view-preference-store'
import { useAccountsSortingStore } from '@/store/accounts-sorting-store'
import { savePayoutAction, removeAccountsFromTradesAction } from '@/server/accounts'
import { useModalStateStore } from '@/store/modal-state-store'
import { SortingState } from "@tanstack/react-table"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DailyMetric {
  date: Date
  pnl: number
  totalBalance: number
  percentageOfTarget: number
  isConsistent: boolean
  payout?: {
    id: string
    amount: number
    date: Date
    status: string
  }
}

interface Payout {
  date: Date
  amount: number
  status: string
}

interface PayoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountNumber: string
  existingPayout?: {
    id: string
    date: Date
    amount: number
    status: string
  }
  onSubmit: (payout: Payout) => Promise<void>
  onDelete?: () => Promise<void>
  isLoading?: boolean
  isDeleting?: boolean
}

type SortOption = {
  id: string
  label: string
}

function toValidDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getAccountStartDate(account: Account) {
  const tradeDates = (account.trades ?? [])
    .map((trade) => toValidDate(trade.entryDate))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())

  if (tradeDates.length > 0) return tradeDates[0]

  const dailyDates = (account.dailyMetrics ?? [])
    .map((metric) => toValidDate(metric.date))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())

  return dailyDates[0] ?? null
}

function getAccountBalance(account: Account) {
  return account.metrics?.currentBalance ?? account.startingBalance ?? 0
}

function getAccountSortValue(account: Account, ruleId: string) {
  switch (ruleId) {
    case "account":
      return account.number || ""
    case "propfirm":
      return account.propfirm || ""
    case "startDate":
      return getAccountStartDate(account)?.getTime() ?? Number.POSITIVE_INFINITY
    case "funded":
      return account.evaluation === false ? 1 : 0
    case "balance":
      return getAccountBalance(account)
    case "targetProgress":
      return account.metrics?.progress ?? 0
    case "drawdown":
      return account.metrics?.remainingLoss ?? 0
    case "consistency":
      if (!account.metrics?.hasProfitableData) return 0
      return account.metrics.isConsistent || account.consistencyPercentage === 100
        ? 2
        : 1
    case "maxDailyProfit":
      return account.metrics?.highestProfitDay ?? 0
    case "tradingDays":
      return account.metrics?.totalTradingDays ?? 0
    default:
      return ""
  }
}

function compareSortValues(a: unknown, b: unknown, desc: boolean) {
  let result = 0
  if (typeof a === "number" && typeof b === "number") {
    result = a - b
  } else {
    result = String(a).localeCompare(String(b), undefined, {
      sensitivity: "base",
    })
  }
  return desc ? -result : result
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



const localeMap: { [key: string]: Locale } = {
  en: enUS,
  fr: fr
}

// Draggable Account Card Component
interface DraggableAccountCardProps {
  account: Account
  onClick: () => void
  size: WidgetSize
  isDragDisabled?: boolean
}

function DraggableAccountCard({ 
  account, 
  onClick, 
  size,
  isDragDisabled = false 
}: DraggableAccountCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: account.number,
    disabled: isDragDisabled
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "shrink-0",
        isDragging && "z-50"
      )}
    >
      <div className="relative group">
        <AccountCard
          account={account}
          onClick={onClick}
          size={size}
        />
        {!isDragDisabled && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded bg-background/80 backdrop-blur-xs border"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  )
}

function PayoutDialog({
  open,
  onOpenChange,
  accountNumber,
  existingPayout,
  onSubmit,
  onDelete,
  isLoading = false,
  isDeleting = false
}: PayoutDialogProps) {
  const params = useParams()
  const locale = params.locale as string
  const dateLocale = locale === 'fr' ? fr : undefined
  const [date, setDate] = useState<Date>(existingPayout?.date ?? new Date())
  const [amount, setAmount] = useState<number>(existingPayout?.amount ?? 0)
  const [inputValue, setInputValue] = useState<string>(existingPayout?.amount?.toString() ?? "")
  const [status, setStatus] = useState<string>(existingPayout?.status ?? 'PENDING')
  const [dateInputValue, setDateInputValue] = useState<string>("")
  const t = useI18n()
  
  // Combined loading state for both saving and deleting
  const isProcessing = isLoading || isDeleting

  useEffect(() => {
    if (existingPayout) {
      setDate(existingPayout.date)
      setAmount(existingPayout.amount)
      setInputValue(existingPayout.amount.toString())
      setStatus(existingPayout.status)
      setDateInputValue(format(existingPayout.date, 'yyyy-MM-dd'))
    } else {
      const today = new Date()
      setDate(today)
      setAmount(0)
      setInputValue("")
      setStatus('PENDING')
      setDateInputValue(format(today, 'yyyy-MM-dd'))
    }
  }, [existingPayout, open])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    const numericValue = value ? Number(value) : 0
    if (!isNaN(numericValue)) {
      setAmount(numericValue)
    }
  }

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDateInputValue(value)
    
    // Try to parse the date
    const parsedDate = new Date(value)
    if (!isNaN(parsedDate.getTime())) {
      // Set the time to noon to prevent timezone issues
      parsedDate.setHours(12, 0, 0, 0)
      setDate(parsedDate)
    }
  }

  const handleCalendarDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      // Set the time to noon to prevent timezone issues
      const adjustedDate = new Date(newDate);
      adjustedDate.setHours(12, 0, 0, 0);
      setDate(adjustedDate);
      setDateInputValue(format(adjustedDate, 'yyyy-MM-dd'));
    }
  }

  const statusOptions = [
    { value: 'PENDING', label: t('propFirm.payout.statuses.pending'), icon: <Clock className="h-4 w-4" /> },
    { value: 'VALIDATED', label: t('propFirm.payout.statuses.validated'), icon: <CheckCircle className="h-4 w-4" /> },
    { value: 'REFUSED', label: t('propFirm.payout.statuses.refused'), icon: <XCircle className="h-4 w-4" /> },
    { value: 'PAID', label: t('propFirm.payout.statuses.paid'), icon: <DollarSign className="h-4 w-4" /> }
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full max-h-screen">
        <SheetHeader className="shrink-0">
          <SheetTitle>{existingPayout ? t('propFirm.payout.edit') : t('propFirm.payout.add')}</SheetTitle>
          <SheetDescription>
            {existingPayout ? t('propFirm.payout.editDescription') : t('propFirm.payout.addDescription')} {accountNumber}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 py-6 min-h-0">
          {/* Amount Input with Currency Symbol */}
          <div className="space-y-2">
            <Label htmlFor="amount">{t('propFirm.payout.amount')}</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                className="pl-9"
                value={inputValue}
                onChange={handleAmountChange}
                placeholder="0.00"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Date Selection with Inline Calendar */}
          <div className="space-y-3">
            <Label>{t('propFirm.payout.date')}</Label>
            
            {/* Quick Date Selection */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  today.setHours(12, 0, 0, 0)
                  setDate(today)
                  setDateInputValue(format(today, 'yyyy-MM-dd'))
                }}
                className="text-xs"
                disabled={isProcessing}
              >
                {t('propFirm.payout.today')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const yesterday = new Date()
                  yesterday.setDate(yesterday.getDate() - 1)
                  yesterday.setHours(12, 0, 0, 0)
                  setDate(yesterday)
                  setDateInputValue(format(yesterday, 'yyyy-MM-dd'))
                }}
                className="text-xs"
                disabled={isProcessing}
              >
                {t('propFirm.payout.yesterday')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const lastWeek = new Date()
                  lastWeek.setDate(lastWeek.getDate() - 7)
                  lastWeek.setHours(12, 0, 0, 0)
                  setDate(lastWeek)
                  setDateInputValue(format(lastWeek, 'yyyy-MM-dd'))
                }}
                className="text-xs"
                disabled={isProcessing}
              >
                {t('propFirm.payout.lastWeek')}
              </Button>
            </div>

            {/* Selected Date Display */}
            <div className="p-3 bg-muted/30 rounded-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('propFirm.payout.selectedDate')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(date, 'PPP', { locale: localeMap[params.locale as string] })}
                  </p>
                </div>
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            {/* Inline Calendar with Custom Header */}
            <div className="border rounded-md bg-background max-h-[400px] flex flex-col">
              {/* Custom Month/Year Header */}
              <div className="p-3 border-b bg-muted/20 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(date)
                        newDate.setMonth(newDate.getMonth() - 1)
                        setDate(newDate)
                      }}
                      className="h-7 w-7 p-0 hover:bg-muted"
                      disabled={isProcessing}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <div className="text-center">
                      <h3 className="text-base font-semibold">
                        {format(date, 'MMMM', { locale: localeMap[params.locale as string] })}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(date)
                        newDate.setMonth(newDate.getMonth() + 1)
                        setDate(newDate)
                      }}
                      className="h-7 w-7 p-0 hover:bg-muted"
                      disabled={isProcessing}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Year Navigation */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(date)
                        const currentDay = newDate.getDate()
                        const currentMonth = newDate.getMonth()
                        newDate.setFullYear(newDate.getFullYear() - 1)
                        // Ensure the date is valid (e.g., Feb 29 in leap year)
                        if (newDate.getDate() !== currentDay) {
                          newDate.setDate(0) // Go to last day of previous month
                        }
                        setDate(newDate)
                      }}
                      className="h-7 w-7 p-0 hover:bg-muted"
                      disabled={isProcessing}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-base font-semibold min-w-12 text-center">
                      {date.getFullYear()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(date)
                        const currentDay = newDate.getDate()
                        const currentMonth = newDate.getMonth()
                        newDate.setFullYear(newDate.getFullYear() + 1)
                        // Ensure the date is valid (e.g., Feb 29 in leap year)
                        if (newDate.getDate() !== currentDay) {
                          newDate.setDate(0) // Go to last day of previous month
                        }
                        setDate(newDate)
                      }}
                      className="h-7 w-7 p-0 hover:bg-muted"
                      disabled={isProcessing}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="p-2 flex-1 overflow-y-auto">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleCalendarDateSelect}
                  month={date}
                  onMonthChange={setDate}
                  locale={localeMap[params.locale as string]}
                  showOutsideDays={false}
                  fixedWeeks={false}
                  className="w-full"
                  classNames={{
                    months: "flex flex-col space-y-2",
                    month: "space-y-2",
                    caption: "hidden", // Hide default caption since we have custom header
                    nav: "hidden", // Hide default nav since we have custom navigation
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.75rem]",
                    row: "flex w-full mt-1",
                    cell: "h-8 w-8 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors text-xs",
                    day_range_end: "day-range-end",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                    day_today: "bg-accent text-accent-foreground font-semibold",
                    day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status">{t('propFirm.payout.status')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={status === option.value ? "default" : "outline"}
                  className="justify-start text-sm"
                  onClick={() => setStatus(option.value)}
                  disabled={isProcessing}
                >
                  {option.icon}
                  <span className="ml-2 truncate">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-col-reverse sm:flex-row gap-2 pt-4 border-t mt-auto">
          {existingPayout && onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={isProcessing}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common.deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('propFirm.payout.delete')}
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('propFirm.payout.delete')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('propFirm.payout.deleteConfirm')} ${existingPayout.amount.toFixed(2)} on {format(existingPayout.date, 'PP', { locale: dateLocale })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isProcessing}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('common.deleting')}
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('propFirm.payout.delete')}
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            onClick={() => onSubmit({ date, amount, status })}
            disabled={amount <= 0 || isProcessing}
            size="sm"
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.saving')}
              </>
            ) : existingPayout ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t('propFirm.payout.update')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {t('propFirm.payout.save')}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function AccountsOverview({ size }: { size: WidgetSize }) {
  const trades = useTradesStore(state => state.trades)
  const user = useUserStore(state => state.user)
  const isLoading = useUserStore(state => state.isLoading)
  const groups = useUserStore(state => state.groups)
  const accounts = useUserStore(state => state.accounts)
  const { accountNumbers, setAccountNumbers, deletePayout, deleteAccount, saveAccount, savePayout } = useData()
  const { getOrderedAccounts, reorderAccounts } = useAccountOrderStore()
  const t = useI18n()
  const params = useParams()
  const locale = params.locale as string
  const { setAccountGroupBoardOpen } = useModalStateStore()
  const { view, setView } = useAccountsViewPreferenceStore()
  const [selectedAccountForTable, setSelectedAccountForTable] = useState<Account | null>(null)
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState<{
    id: string;
    date: Date;
    amount: number;
    status: string;
  } | undefined>()
  const [isDeleting, setIsDeleting] = useState(false)
  const [canDeleteAccount, setCanDeleteAccount] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Partial<Account> | null>(null)
  const [isSavingPayout, setIsSavingPayout] = useState(false)
  const [isDeletingPayout, setIsDeletingPayout] = useState(false)
  const { sorting, setSorting, clearSorting } = useAccountsSortingStore()
  const [sortingMenuOpen, setSortingMenuOpen] = useState(false)
  const [pendingSortId, setPendingSortId] = useState("")
  const shouldUpdateSelectedAccount = useRef(false)

  const sortOptions = useMemo<SortOption[]>(
    () => [
      { id: "group", label: t("accounts.table.group") },
      { id: "account", label: t("accounts.table.account") },
      { id: "propfirm", label: t("accounts.table.propfirm") },
      { id: "startDate", label: t("accounts.table.startDate") },
      { id: "funded", label: t("accounts.table.funded") },
      { id: "balance", label: t("accounts.table.balance") },
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      // Find which group this account belongs to
      const activeAccount = accounts.find(acc => acc.number === active.id)
      if (!activeAccount) return

      let groupId: string
      let groupAccounts: Account[]

      if (activeAccount.groupId) {
        // Account belongs to a group
        const group = groups.find(g => g.id === activeAccount.groupId)
        if (!group) return
        
        groupId = group.id
        groupAccounts = filteredAccounts.filter(account => {
          return group.accounts.some(a => a.number === account.number);
        })
      } else {
        // Account is ungrouped
        const groupedAccountNumbers = new Set(
          groups.flatMap(group => group.accounts.map(a => a.number))
        )
        
        groupId = 'ungrouped'
        groupAccounts = filteredAccounts.filter(
          account => !groupedAccountNumbers.has(account.number ?? '')
        )
      }
      
      const orderedAccounts = getOrderedAccounts(groupId, groupAccounts)
      const oldIndex = orderedAccounts.findIndex(account => account.number === active.id)
      const newIndex = orderedAccounts.findIndex(account => account.number === over?.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedAccounts = arrayMove(orderedAccounts, oldIndex, newIndex)
        const accountNumbers = reorderedAccounts.map(acc => acc.number)
        
        reorderAccounts(groupId, accountNumbers)
        
        toast.success(t('propFirm.dragAndDrop.reorderSuccess'))
      }
    }
  }

  // Enable delete button when an account is selected
  useEffect(() => {
    setCanDeleteAccount(!!selectedAccountForTable)
  }, [selectedAccountForTable])

  // Update selected account when accounts data is refreshed (e.g., after adding a payout)
  useEffect(() => {
    if (shouldUpdateSelectedAccount.current && selectedAccountForTable) {
      const updatedAccount = accounts.find(acc => acc.number === selectedAccountForTable.number)
      if (updatedAccount) {
        // Update with the full account including recalculated metrics and daily metrics
        setSelectedAccountForTable(updatedAccount)
      }
      shouldUpdateSelectedAccount.current = false
    }
  }, [accounts, selectedAccountForTable])

  const { filteredAccounts, unconfiguredAccounts } = useMemo(() => {
    const uniqueAccounts = new Set(trades.map(trade => trade.accountNumber))
    // Find the hidden group
    const hiddenGroup = groups.find(g => g.name === "Hidden Accounts")
    const hiddenAccountNumbers = hiddenGroup ? new Set(hiddenGroup.accounts.map(a => a.number)) : new Set()

    const configuredAccounts: Account[] = []
    const unconfiguredAccounts: string[] = []

    Array.from(uniqueAccounts)
      .filter(accountNumber =>
        (accountNumbers.length === 0 || accountNumbers.includes(accountNumber)) &&
        !hiddenAccountNumbers.has(accountNumber)
      )
      .forEach(accountNumber => {
        const dbAccount = accounts.find(acc => acc.number === accountNumber)

        if (dbAccount) {
          // Account is configured - use it with all its pre-computed metrics
          configuredAccounts.push(dbAccount)
        } else {
          // Account exists in trades but not configured in database
          unconfiguredAccounts.push(accountNumber)
        }
      })

    return { filteredAccounts: configuredAccounts, unconfiguredAccounts }
  }, [trades, accounts, accountNumbers, groups])

  const { sortedGroupEntries, sortedUngroupedAccounts } = useMemo(() => {
    const groupSortRule = sorting.find((rule) => rule.id === "group")
    const accountSortRules = sorting.filter((rule) => rule.id !== "group")

    const sortAccounts = (groupId: string, groupAccounts: Account[]) => {
      if (accountSortRules.length === 0) {
        return getOrderedAccounts(groupId, groupAccounts) as Account[]
      }
      return [...groupAccounts].sort((a, b) => {
        for (const rule of accountSortRules) {
          const aValue = getAccountSortValue(a, rule.id)
          const bValue = getAccountSortValue(b, rule.id)
          const compare = compareSortValues(aValue, bValue, rule.desc)
          if (compare !== 0) return compare
        }
        return 0
      })
    }

    const groupEntries = groups
      .map((group) => {
        const groupAccounts = filteredAccounts.filter((account) =>
          group.accounts.some((a) => a.number === account.number)
        )
        if (groupAccounts.length === 0) return null
        return {
          group,
          accounts: sortAccounts(group.id, groupAccounts),
        }
      })
      .filter((value): value is { group: typeof groups[number]; accounts: Account[] } =>
        Boolean(value)
      )

    if (groupSortRule) {
      groupEntries.sort((a, b) =>
        compareSortValues(a.group.name, b.group.name, groupSortRule.desc)
      )
    } else if (accountSortRules.length > 0) {
      groupEntries.sort((a, b) => {
        const aAccount = a.accounts[0]
        const bAccount = b.accounts[0]
        if (!aAccount && !bAccount) return 0
        if (!aAccount) return 1
        if (!bAccount) return -1
        for (const rule of accountSortRules) {
          const aValue = getAccountSortValue(aAccount, rule.id)
          const bValue = getAccountSortValue(bAccount, rule.id)
          const compare = compareSortValues(aValue, bValue, rule.desc)
          if (compare !== 0) return compare
        }
        return 0
      })
    }

    const groupedAccountNumbers = new Set(
      groups.flatMap((group) => group.accounts.map((a) => a.number))
    )
    const ungroupedAccounts = filteredAccounts.filter(
      (account) => !groupedAccountNumbers.has(account.number ?? "")
    )
    const sortedUngrouped = sortAccounts("ungrouped", ungroupedAccounts)

    return {
      sortedGroupEntries: groupEntries,
      sortedUngroupedAccounts: sortedUngrouped,
    }
  }, [filteredAccounts, getOrderedAccounts, groups, sorting])

  const dailyMetrics = useMemo(() => {
    if (!selectedAccountForTable) return []
    // Use pre-computed daily metrics from account
    return selectedAccountForTable.dailyMetrics || []
  }, [selectedAccountForTable])

  const handleAddPayout = async (payout: Payout) => {
    console.log('handleAddPayout', payout)
    if (!selectedAccountForTable || !user) return

    try {
      setIsSavingPayout(true)
      
      if (selectedPayout) {
        // Update existing payout
        await savePayout({
          ...payout,
          id: selectedPayout.id, // Use existing payout ID
          accountNumber: selectedAccountForTable.number,
          createdAt: selectedPayout.date, // Keep original creation date
          accountId: selectedAccountForTable.id
        })
      } else {
        // Add new payout
        await savePayout({
          ...payout,
          id: '', // Will be generated by the server
          accountNumber: selectedAccountForTable.number,
          createdAt: new Date(),
          accountId: selectedAccountForTable.id
        })
      }
      
      // Mark for local selection update; data is already updated optimistically
      shouldUpdateSelectedAccount.current = true

      setPayoutDialogOpen(false)
      setSelectedPayout(undefined)

      toast.success(selectedPayout ? t('propFirm.payout.updateSuccess') : t('propFirm.payout.success'), {
        description: selectedPayout ? t('propFirm.payout.updateSuccessDescription') : t('propFirm.payout.successDescription'),
      })
    } catch (error) {
      console.error('Failed to handle payout:', error)
      toast.error(t('propFirm.payout.error'), {
        description: t('propFirm.payout.errorDescription'),
      })
    } finally {
      setIsSavingPayout(false)
    }
  }

  const handleDeletePayout = async () => {
    if (!selectedAccountForTable || !user || !selectedPayout) return

    try {
      setIsDeletingPayout(true)
      
      await deletePayout(selectedPayout.id)

      // Mark for local selection update; data is already updated optimistically
      shouldUpdateSelectedAccount.current = true

      setPayoutDialogOpen(false)
      setSelectedPayout(undefined)

      toast.success(t('propFirm.payout.deleteSuccess'), {
        description: t('propFirm.payout.deleteSuccessDescription'),
      })
    } catch (error) {
      console.error('Failed to delete payout:', error)
      toast.error(t('propFirm.payout.deleteError'), {
        description: t('propFirm.payout.deleteErrorDescription'),
      })
    } finally {
      setIsDeletingPayout(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !selectedAccountForTable || !canDeleteAccount) return

    try {
      setIsDeleting(true)
      // Delete both account configuration and all associated trades
      await removeAccountsFromTradesAction([selectedAccountForTable.number])
      // DataProvider updates accounts/trades optimistically; no full refresh
      setSelectedAccountForTable(null)

      toast.success(t('propFirm.toast.deleteSuccess'), {
        description: t('propFirm.toast.deleteSuccessDescription'),
      })
    } catch (error) {
      console.error('Failed to delete account:', error)
      toast.error(t('propFirm.toast.deleteError'), {
        description: t('propFirm.toast.deleteErrorDescription'),
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!user || !selectedAccountForTable || !pendingChanges) return

    try {
      setIsSaving(true)
      const accountUpdate = {
        ...selectedAccountForTable,
        userId: user.id,
        ...pendingChanges,
        startingBalance: pendingChanges?.startingBalance ?? selectedAccountForTable.startingBalance,
        profitTarget: pendingChanges?.profitTarget ?? selectedAccountForTable.profitTarget,
        drawdownThreshold: pendingChanges?.drawdownThreshold ?? selectedAccountForTable.drawdownThreshold,
        consistencyPercentage: pendingChanges?.consistencyPercentage ?? selectedAccountForTable.consistencyPercentage,
        propfirm: pendingChanges?.propfirm ?? selectedAccountForTable.propfirm,
        resetDate: 'resetDate' in pendingChanges 
          ? (pendingChanges.resetDate instanceof Date ? pendingChanges.resetDate : null)
          : selectedAccountForTable.resetDate,
        shouldConsiderTradesBeforeReset: pendingChanges?.shouldConsiderTradesBeforeReset ?? selectedAccountForTable.shouldConsiderTradesBeforeReset ?? true,
        trailingDrawdown: pendingChanges?.trailingDrawdown ?? selectedAccountForTable.trailingDrawdown,
        trailingStopProfit: pendingChanges?.trailingStopProfit ?? selectedAccountForTable.trailingStopProfit,
        accountSize: pendingChanges?.accountSize ?? selectedAccountForTable.accountSize,
        accountSizeName: pendingChanges?.accountSizeName ?? selectedAccountForTable.accountSizeName,
        price: pendingChanges?.price ?? selectedAccountForTable.price,
        priceWithPromo: pendingChanges?.priceWithPromo ?? selectedAccountForTable.priceWithPromo,
        evaluation: pendingChanges?.evaluation ?? selectedAccountForTable.evaluation,
        minDays: pendingChanges?.minDays ?? selectedAccountForTable.minDays,
        dailyLoss: pendingChanges?.dailyLoss ?? selectedAccountForTable.dailyLoss,
        rulesDailyLoss: pendingChanges?.rulesDailyLoss ?? selectedAccountForTable.rulesDailyLoss,
        trailing: pendingChanges?.trailing ?? selectedAccountForTable.trailing,
        tradingNewsAllowed: pendingChanges?.tradingNewsAllowed ?? selectedAccountForTable.tradingNewsAllowed,
        activationFees: pendingChanges?.activationFees ?? selectedAccountForTable.activationFees,
        isRecursively: pendingChanges?.isRecursively ?? selectedAccountForTable.isRecursively,
        balanceRequired: pendingChanges?.balanceRequired ?? selectedAccountForTable.balanceRequired,
        minTradingDaysForPayout: pendingChanges?.minTradingDaysForPayout ?? selectedAccountForTable.minTradingDaysForPayout,
        groupId: 'groupId' in pendingChanges 
          ? (pendingChanges.groupId ?? null)
          : (selectedAccountForTable.groupId ?? null)
      }
      await saveAccount(accountUpdate)

      // Update the selected account
      setSelectedAccountForTable(accountUpdate)

      setPendingChanges(null)

      toast.success(t('propFirm.toast.setupSuccess'), {
        description: t('propFirm.toast.setupSuccessDescription'),
      })
    } catch (error) {
      console.error('Failed to setup account:', error)
      toast.error(t('propFirm.toast.setupError'), {
        description: t('propFirm.toast.setupErrorDescription'),
      })
    } finally {
      setIsSaving(false)
    }
  }


  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small' ? "p-2 h-10" : "p-3 sm:p-4 h-14"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle
              className={cn(
                "line-clamp-1",
                size === 'small' ? "text-sm" : "text-base"
              )}
            >
              {t('propFirm.title')}
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('propFirm.description')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAccountGroupBoardOpen(true)}
              className={cn(
                "gap-1.5",
                size === "small" ? "h-7 px-2 text-xs" : "h-8"
              )}
            >
              <Settings className="h-3.5 w-3.5" />
              <span className={cn(size === "small" && "sr-only")}>
                {t("filters.manageAccounts")}
              </span>
            </Button>
            <Popover open={sortingMenuOpen} onOpenChange={setSortingMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1.5",
                    size === "small" ? "h-7 px-2 text-xs" : "h-8"
                  )}
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                  <span className={cn(size === "small" && "sr-only")}>
                    {sorting.length > 0
                      ? t("table.sortingRules", { count: sorting.length })
                      : t("table.sorting")}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-3">
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
            <Tabs value={view} onValueChange={(value) => setView(value as "cards" | "table")}>
              <TabsList
                className={cn(
                  "gap-1",
                  size === "small" ? "h-7 px-1" : "h-8 px-1"
                )}
              >
                <TabsTrigger
                  value="cards"
                  className={cn(
                    "gap-1.5",
                    size === "small" ? "h-6 px-2 text-xs" : "h-7"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className={cn(size === "small" && "sr-only")}>
                    {t("accounts.view.charts")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="table"
                  className={cn(
                    "gap-1.5",
                    size === "small" ? "h-6 px-2 text-xs" : "h-7"
                  )}
                >
                  <Table className="h-3.5 w-3.5" />
                  <span className={cn(size === "small" && "sr-only")}>
                    {t("accounts.view.table")}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      {/* Unconfigured accounts banner */}
      {(unconfiguredAccounts.length > 0 && !isLoading) && (
        <div className="border-b border-orange-200/30 bg-orange-50/40 dark:border-orange-700/30 dark:bg-orange-950/30">
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  {t('propFirm.status.needsConfiguration')}:
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {unconfiguredAccounts.map((accountNumber, index) => (
                  <div
                    key={accountNumber}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/50"
                  >
                    <span className="text-xs font-medium text-orange-800 dark:text-orange-200">
                      {accountNumber}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-orange-200 dark:hover:bg-orange-800/50"
                      onClick={() => {
                        // Create a minimal account object for configuration
                        const tempAccount = {
                          id: '',
                          userId: user?.id || '',
                          number: accountNumber,
                          propfirm: '',
                          startingBalance: 0,
                          profitTarget: 0,
                          drawdownThreshold: 0,
                          consistencyPercentage: 30,
                          resetDate: null,
                          payouts: [],
                          balanceToDate: 0
                        }
                        // Use type assertion to work around the type issues
                        setSelectedAccountForTable(tempAccount as any)
                      }}
                    >
                      <Settings className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <CardContent
        className={cn(
          "flex-1 overflow-hidden",
          view === "table" && "p-0"
        )}
      >
        <div
          className="flex-1 overflow-y-auto h-full"
        >
          {view === "cards" ? (
            <div className="mt-4">
              <div className="space-y-6">
                {sortedGroupEntries.map(({ group, accounts: orderedAccounts }, groupIndex) => {
                  // Generate a consistent color for each group based on group index
                  const groupColors = [
                    'border-blue-200/50 bg-blue-50/30 dark:border-blue-800/30 dark:bg-blue-950/20',
                    'border-purple-200/50 bg-purple-50/30 dark:border-purple-800/30 dark:bg-purple-950/20',
                    'border-green-200/50 bg-green-50/30 dark:border-green-800/30 dark:bg-green-950/20',
                    'border-orange-200/50 bg-orange-50/30 dark:border-orange-800/30 dark:bg-orange-950/20',
                    'border-pink-200/50 bg-pink-50/30 dark:border-pink-800/30 dark:bg-pink-950/20',
                    'border-cyan-200/50 bg-cyan-50/30 dark:border-cyan-800/30 dark:bg-cyan-950/20',
                  ];

                  const groupColorClass = groupColors[groupIndex % groupColors.length];

                  return (
                    <div
                      key={group.id}
                      className={cn(
                        "relative border-l-4 rounded-r-lg",
                        groupColorClass,
                        "transition-all duration-200 hover:shadow-md"
                      )}
                    >
                      {/* Group header with subtle styling */}
                      <div className="px-4 py-3 border-b border-current/10">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground/80 tracking-wide uppercase">
                            {group.name}
                          </h3>
                          <div className="text-xs text-muted-foreground bg-white/50 dark:bg-black/20 px-2 py-1 rounded-full">
                            {orderedAccounts.length} {orderedAccounts.length === 1 ? 'account' : 'accounts'}
                          </div>
                        </div>
                      </div>

                      {/* Cards container with optimized spacing */}
                      <div className="p-4 pt-3">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                          modifiers={[restrictToHorizontalAxis]}
                        >
                          <SortableContext
                            items={orderedAccounts.map(acc => acc.number)}
                            strategy={horizontalListSortingStrategy}
                          >
                            <div className="flex gap-3 overflow-x-auto pb-2 min-h-fit">
                              {orderedAccounts.map(account => {
                                if (!account.number) return null;
                                return (
                                  <DraggableAccountCard
                                    key={account.number}
                                    account={account as Account}
                                    onClick={() => setSelectedAccountForTable(account as Account)}
                                    size={size}
                                  />
                                )
                              }).filter(Boolean)}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    </div>
                  );
                })}

                {/* Show ungrouped accounts */}
                {(() => {
                  if (sortedUngroupedAccounts.length === 0) return null;

                  return (
                    <div
                      className={cn(
                        "relative border-l-4 border-gray-200/50 bg-gray-50/30 dark:border-gray-700/30 dark:bg-gray-900/20 rounded-r-lg",
                        "transition-all duration-200 hover:shadow-md"
                      )}
                    >
                      {/* Ungrouped header */}
                      <div className="px-4 py-3 border-b border-gray-200/20 dark:border-gray-700/20">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
                            {t('propFirm.ungrouped')}
                          </h3>
                          <div className="text-xs text-muted-foreground bg-white/50 dark:bg-black/20 px-2 py-1 rounded-full">
                            {sortedUngroupedAccounts.length} {sortedUngroupedAccounts.length === 1 ? 'account' : 'accounts'}
                          </div>
                        </div>
                      </div>

                      {/* Cards container */}
                      <div className="p-4 pt-3">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                          modifiers={[restrictToHorizontalAxis]}
                        >
                          <SortableContext
                            items={sortedUngroupedAccounts.map(acc => acc.number)}
                            strategy={horizontalListSortingStrategy}
                          >
                            <div className="flex gap-3 overflow-x-auto pb-2 min-h-fit">
                              {sortedUngroupedAccounts.map(account => {
                                if (!account.number) return null;
                                return (
                                  <DraggableAccountCard
                                    key={account.number}
                                    account={account as Account}
                                    onClick={() => setSelectedAccountForTable(account as Account)}
                                    size={size}
                                  />
                                )
                              }).filter(Boolean)}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <AccountsTableView
              accounts={filteredAccounts}
              groups={groups}
              onSelectAccount={(account) => setSelectedAccountForTable(account)}
              sorting={sorting}
              onSortingChange={setSorting}
            />
          )}
        </div>

        <Dialog
          open={!!selectedAccountForTable}
          onOpenChange={(open) => !open && setSelectedAccountForTable(null)}
        >
          <DialogContent className="max-w-7xl h-[80vh] flex flex-col overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>{t('propFirm.configurator.title', { accountNumber: selectedAccountForTable?.number })}</DialogTitle>
                  <DialogDescription>{t('propFirm.configurator.description')}</DialogDescription>
                </div>
                <div className="flex items-center gap-2 pr-4">

                  <Button
                    variant="default"
                    onClick={handleSave}
                    disabled={pendingChanges === null}
                  >
                    {isSaving ? t('common.saving') : t('common.save')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPayout(undefined)
                      setPayoutDialogOpen(true)
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('propFirm.payout.add')}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isDeleting || !canDeleteAccount}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('propFirm.common.delete')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('propFirm.delete.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('propFirm.delete.description', { account: selectedAccountForTable?.number })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('propFirm.common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? t('propFirm.common.deleting') : t('propFirm.common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 pt-4 flex-1 overflow-y-auto">
              {selectedAccountForTable && (
                <Tabs
                  defaultValue={selectedAccountForTable.profitTarget === 0 ? "configurator" : "table"}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="table">{t('propFirm.table.title')}</TabsTrigger>
                    <TabsTrigger value="configurator">{t('propFirm.table.configurator')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="table" className="mt-4">
                    <AccountTable
                      accountNumber={selectedAccountForTable.number}
                      startingBalance={selectedAccountForTable.startingBalance}
                      profitTarget={selectedAccountForTable.profitTarget}
                      dailyMetrics={dailyMetrics}
                      consistencyPercentage={selectedAccountForTable.consistencyPercentage ?? 30}
                      resetDate={selectedAccountForTable.resetDate ? new Date(selectedAccountForTable.resetDate) : undefined}
                      onDeletePayout={async (payoutId) => {
                        try {
                          await deletePayout(payoutId)

                          shouldUpdateSelectedAccount.current = true

                          toast.success(t('propFirm.payout.deleteSuccess'), {
                            description: t('propFirm.payout.deleteSuccessDescription'),
                          })
                        } catch (error) {
                          console.error('Failed to delete payout:', error)
                          toast.error(t('propFirm.payout.deleteError'), {
                            description: t('propFirm.payout.deleteErrorDescription'),
                          })
                        }
                      }}
                      onEditPayout={(payout) => {
                        setSelectedPayout({
                          id: payout.id,
                          date: new Date(payout.date),
                          amount: payout.amount,
                          status: payout.status
                        })
                        setPayoutDialogOpen(true)
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="configurator" className="mt-4">
                    <AccountConfigurator
                      account={selectedAccountForTable}
                      pendingChanges={pendingChanges as Partial<Account> | null}
                      setPendingChanges={setPendingChanges}
                      isSaving={isSaving}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>

      <PayoutDialog
        open={payoutDialogOpen}
        onOpenChange={(open) => {
          setPayoutDialogOpen(open)
          if (!open) {
            setSelectedPayout(undefined)
          }
        }}
        accountNumber={selectedAccountForTable?.number ?? ''}
        existingPayout={selectedPayout}
        onSubmit={handleAddPayout}
        onDelete={selectedPayout ? handleDeletePayout : undefined}
        isLoading={isSavingPayout}
        isDeleting={isDeletingPayout}
      />
    </Card>
  )
} 
