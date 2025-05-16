'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useMemo, useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { useUserData } from "@/components/context/user-data"
import { setupAccount, getAccounts, addPayout, deletePayout, updatePayout, checkAndResetAccounts } from "@/app/[locale]/(dashboard)/dashboard/data/actions"
import { AccountEquityChart } from "./account-equity-chart"
import { Checkbox } from "@/components/ui/checkbox"
import { Gauge } from "@/components/ui/gauge"

interface PropFirmAccount {
  id: string
  accountNumber: string
  balanceToDate: number
  profitTarget: number
  drawdownThreshold: number
  isPerformance: boolean
  startingBalance: number
  propfirm: string
  lastBalanceUpdate?: Date
  lastBalanceAmount?: number
  payouts: Array<{
    id: string
    amount: number
    date: Date
    status: string
  }>
  trailingDrawdown: boolean
  trailingStopProfit: number | null
  resetDate: Date | null
  consistencyPercentage: number
  accountSize?: string
  accountSizeName?: string
  price?: number
  priceWithPromo?: number
  evaluation?: boolean
  minDays?: number
  dailyLoss?: number
  rulesDailyLoss?: string
  trailing?: string
  tradingNewsAllowed?: boolean
  activationFees?: number
  isRecursively?: string
  payoutBonus?: number
  profitSharing?: number
  payoutPolicy?: string
  balanceRequired?: number
  minTradingDaysForPayout?: number
  minPayout?: number
  maxPayout?: string
  maxFundedAccounts?: number | null
  createdAt: Date
  groupId: string | null
  payoutCount: number
}

interface PropFirmSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountNumber: string
  onSubmit: (data: Partial<PropFirmAccount>) => Promise<void>
}

function PropFirmSetupDialog({ open, onOpenChange, accountNumber, onSubmit }: PropFirmSetupDialogProps) {
  const [formData, setFormData] = useState<Partial<PropFirmAccount>>({
    propfirm: '',
    profitTarget: 0,
    drawdownThreshold: 0,
    startingBalance: 0,
    isPerformance: false,
    trailingDrawdown: false,
    trailingStopProfit: null,
    resetDate: new Date(),
    consistencyPercentage: 0,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Setup Prop Firm Account</DialogTitle>
          <DialogDescription>
            Enter the details for account {accountNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="propfirm">Prop Firm</Label>
            <Input
              id="propfirm"
              className="col-span-3"
              value={formData.propfirm}
              onChange={(e) => setFormData(prev => ({ ...prev, propfirm: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startingBalance">Starting Balance</Label>
            <Input
              id="startingBalance"
              type="number"
              className="col-span-3"
              value={formData.startingBalance}
              onChange={(e) => setFormData(prev => ({ ...prev, startingBalance: Number(e.target.value) }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="profitTarget">Profit Target</Label>
            <Input
              id="profitTarget"
              type="number"
              className="col-span-3"
              value={formData.profitTarget}
              onChange={(e) => setFormData(prev => ({ ...prev, profitTarget: Number(e.target.value) }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="drawdownThreshold">Drawdown Limit</Label>
            <Input
              id="drawdownThreshold"
              type="number"
              className="col-span-3"
              value={formData.drawdownThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, drawdownThreshold: Number(e.target.value) }))}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="trailingDrawdown"
              checked={formData.trailingDrawdown}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ 
                  ...prev, 
                  trailingDrawdown: checked as boolean,
                  trailingStopProfit: checked ? prev.trailingStopProfit : null
                }))
              }
            />
            <Label htmlFor="trailingDrawdown">Enable Trailing Drawdown</Label>
          </div>
          {formData.trailingDrawdown && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trailingStopProfit">Stop Trailing at Profit</Label>
              <Input
                id="trailingStopProfit"
                type="number"
                className="col-span-3"
                value={formData.trailingStopProfit || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, trailingStopProfit: Number(e.target.value) } as any))}
              />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="resetDate">Reset Date</Label>
            <div className="col-span-3">
              <Calendar
                mode="single"
                selected={formData.resetDate || undefined}
                onSelect={(date) => setFormData(prev => ({ ...prev, resetDate: date || null }))}
                initialFocus
                className="rounded-md border"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="consistencyPercentage">Consistency Percentage</Label>
            <Input
              id="consistencyPercentage"
              type="number"
              className="col-span-3"
              value={formData.consistencyPercentage}
              onChange={(e) => setFormData(prev => ({ ...prev, consistencyPercentage: Number(e.target.value) }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onSubmit(formData)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
}

function PayoutDialog({ 
  open, 
  onOpenChange, 
  accountNumber, 
  existingPayout,
  onSubmit,
  onDelete 
}: PayoutDialogProps) {
  const [date, setDate] = useState<Date>(existingPayout?.date ?? new Date())
  const [amount, setAmount] = useState<number>(existingPayout?.amount ?? 0)
  const [status, setStatus] = useState<string>(existingPayout?.status ?? 'PENDING')

  useEffect(() => {
    if (existingPayout) {
      setDate(existingPayout.date)
      setAmount(existingPayout.amount)
      setStatus(existingPayout.status)
    } else {
      setDate(new Date())
      setAmount(0)
      setStatus('PENDING')
    }
  }, [existingPayout, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingPayout ? 'Edit Payout Record' : 'Add Payout Record'}</DialogTitle>
          <DialogDescription>
            {existingPayout ? 'Modify payout for' : 'Record a payout for'} account {accountNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Payout Date</Label>
            <Calendar
              mode="single"
              selected={date || undefined}
              onSelect={(newDate) => newDate && setDate(newDate)}
              initialFocus
              className="rounded-md border"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              className="col-span-3"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="PENDING">Pending</option>
              <option value="VALIDATED">Validated</option>
              <option value="REFUSED">Refused</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          {existingPayout && onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
            >
              Delete Payout
            </Button>
          )}
          <Button 
            onClick={() => onSubmit({ date, amount, status })}
            disabled={amount <= 0}
          >
            {existingPayout ? 'Update' : 'Save'} Payout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DrawdownSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: PropFirmAccount
  onSubmit: (data: {
    drawdownThreshold: number
    trailingDrawdown: boolean
    trailingStopProfit?: number
  }) => Promise<void>
}

function DrawdownSettingsDialog({ 
  open, 
  onOpenChange, 
  account,
  onSubmit 
}: DrawdownSettingsDialogProps) {
  const [formData, setFormData] = useState({
    drawdownThreshold: account.drawdownThreshold,
    trailingDrawdown: account.trailingDrawdown,
    trailingStopProfit: account.trailingStopProfit || 0,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Drawdown Settings</DialogTitle>
          <DialogDescription>
            Modify drawdown settings for account {account.accountNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="drawdownThreshold">Drawdown Limit</Label>
            <Input
              id="drawdownThreshold"
              type="number"
              className="col-span-3"
              value={formData.drawdownThreshold}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                drawdownThreshold: Number(e.target.value) 
              }))}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="trailingDrawdown"
              checked={formData.trailingDrawdown}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ 
                  ...prev, 
                  trailingDrawdown: checked as boolean,
                  trailingStopProfit: checked ? prev.trailingStopProfit : 0
                }))
              }
            />
            <Label htmlFor="trailingDrawdown">Enable Trailing Drawdown</Label>
          </div>
          {formData.trailingDrawdown && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trailingStopProfit">Stop Trailing at Profit</Label>
              <Input
                id="trailingStopProfit"
                type="number"
                className="col-span-3"
                value={formData.trailingStopProfit}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  trailingStopProfit: Number(e.target.value) 
                }))}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onSubmit(formData)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AccountEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: PropFirmAccount
  onSubmit: (data: Partial<PropFirmAccount>) => Promise<void>
}

function AccountEditDialog({ open, onOpenChange, account, onSubmit }: AccountEditDialogProps) {
  const [formData, setFormData] = useState<Partial<PropFirmAccount>>({
    propfirm: account.propfirm,
    profitTarget: account.profitTarget,
    startingBalance: account.startingBalance,
    isPerformance: account.isPerformance,
    trailingDrawdown: account.trailingDrawdown,
    trailingStopProfit: account.trailingStopProfit,
    resetDate: account.resetDate || null,
    consistencyPercentage: account.consistencyPercentage,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Account Settings</DialogTitle>
          <DialogDescription>
            Modify settings for account {account.accountNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="propfirm">Prop Firm</Label>
            <Input
              id="propfirm"
              className="col-span-3"
              value={formData.propfirm}
              onChange={(e) => setFormData(prev => ({ ...prev, propfirm: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startingBalance">Starting Balance</Label>
            <Input
              id="startingBalance"
              type="number"
              className="col-span-3"
              value={formData.startingBalance}
              onChange={(e) => setFormData(prev => ({ ...prev, startingBalance: Number(e.target.value) }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="profitTarget">Profit Target</Label>
            <Input
              id="profitTarget"
              type="number"
              className="col-span-3"
              value={formData.profitTarget}
              onChange={(e) => setFormData(prev => ({ ...prev, profitTarget: Number(e.target.value) }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="resetDate">Reset Date</Label>
            <div className="col-span-3">
              <Calendar
                mode="single"
                selected={formData.resetDate || undefined}
                onSelect={(date) => setFormData(prev => ({ ...prev, resetDate: date || null }))}
                initialFocus
                className="rounded-md border"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="consistencyPercentage">Consistency Percentage</Label>
            <Input
              id="consistencyPercentage"
              type="number"
              className="col-span-3"
              value={formData.consistencyPercentage}
              onChange={(e) => setFormData(prev => ({ ...prev, consistencyPercentage: Number(e.target.value) }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onSubmit(formData)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AccountTabProps {
  account: PropFirmAccount
  onAddPayout: (accountNumber: string) => void
  onEditPayout: (payout: { 
    id: string; 
    date: Date; 
    amount: number; 
    status: string 
  }, accountNumber: string) => void
  onEditDrawdown: (account: PropFirmAccount) => void
  onEditAccount: (account: PropFirmAccount) => void
}

function AccountTab({ account, onAddPayout, onEditPayout, onEditDrawdown, onEditAccount }: AccountTabProps) {
  const { trades } = useUserData()
  const accountTrades = trades.filter(t => t.accountNumber === account.accountNumber)
  
  // Calculate profits considering reset date
  const { totalPnL, currentProfits, relevantPayouts } = useMemo(() => {
    // Get all trades
    const allTrades = accountTrades

    // Filter trades and payouts based on reset date
    const relevantTrades = account.resetDate 
      ? allTrades.filter(trade => new Date(trade.closeDate) >= new Date(account.resetDate!))
      : allTrades

    const relevantPayouts = account.resetDate 
      ? account.payouts.filter(payout => new Date(payout.date) >= new Date(account.resetDate!))
      : account.payouts

    // Calculate PnL from relevant trades including commissions
    const totalPnL = allTrades.reduce((sum, trade) => sum + trade.pnl - (trade.commission || 0), 0)
    const currentProfits = relevantTrades.reduce((sum, trade) => sum + trade.pnl - (trade.commission || 0), 0)

    return {
      totalPnL,
      currentProfits,
      relevantPayouts
    }
  }, [accountTrades, account.resetDate, account.payouts])

  // Calculate total payouts since reset
  const totalPayouts = useMemo(() => 
    relevantPayouts.reduce((sum, payout) => sum + payout.amount, 0)
  , [relevantPayouts])

  // Calculate average daily PnL
  const avgDailyPnl = useMemo(() => {
    if (accountTrades.length === 0) return 0
    
    // Get unique trading days since reset
    const tradingDays = new Set(
      accountTrades
        .filter(trade => !account.resetDate || new Date(trade.closeDate) >= new Date(account.resetDate!))
        .map(trade => new Date(trade.closeDate).toISOString().split('T')[0])
    )
    
    return currentProfits / tradingDays.size
  }, [accountTrades, account.resetDate, currentProfits])

  // Calculate current balance without payouts (for display purposes)
  const currentBalanceWithoutPayouts = useMemo(() => 
    account.startingBalance + totalPnL - account.payouts.reduce((sum, payout) => sum + payout.amount, 0)
  , [account.startingBalance, totalPnL, account.payouts])

  // Calculate remaining amount needed for next payout
  const remainingForPayout = Math.max(0, account.profitTarget - (currentProfits - totalPayouts))

  // Calculate consistency based on profit target or actual profits
  const maxAllowedDailyProfit = useMemo(() => {
    // If profits are below target, use profit target as base
    const baseAmount = currentProfits <= account.profitTarget 
      ? account.profitTarget 
      : currentProfits
    
    return baseAmount * (account.consistencyPercentage / 100)
  }, [currentProfits, account.profitTarget, account.consistencyPercentage])

  // Estimate next payout date based on average daily PnL
  const estimatedNextPayout = useMemo(() => {
    if (avgDailyPnl <= 0) return null
    const tradingDaysToTarget = Math.ceil(remainingForPayout / avgDailyPnl)
    
    // Calculate the next payout date considering only weekdays
    const currentDate = new Date()
    let nextDate = new Date(currentDate)
    let remainingTradingDays = tradingDaysToTarget
    
    while (remainingTradingDays > 0) {
      nextDate.setDate(nextDate.getDate() + 1)
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (nextDate.getDay() !== 0 && nextDate.getDay() !== 6) {
        remainingTradingDays--
      }
    }
    
    return nextDate
  }, [avgDailyPnl, remainingForPayout])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{account.propfirm} - {account.accountNumber}</h3>
        </div>
        <div className="space-x-2">
          <Button 
            variant="outline"
            onClick={() => onEditAccount(account)}
          >
            Edit Account
          </Button>
          <Button 
            variant="outline"
            onClick={() => onEditDrawdown(account)}
          >
            Edit Drawdown
          </Button>
          <Button onClick={() => onAddPayout(account.accountNumber)}>
            Record Payout
          </Button>
        </div>
      </div>

      <div className="h-[300px]">
        <AccountEquityChart 
          trades={accountTrades}
          drawdownThreshold={account.drawdownThreshold}
          profitTarget={account.profitTarget}
          startingBalance={account.startingBalance}
          payouts={account.payouts}
          trailingDrawdown={account.trailingDrawdown}
          trailingStopProfit={account.trailingStopProfit ?? undefined}
          resetDate={account.resetDate ? format(new Date(account.resetDate), "yyyy-MM-dd") : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-medium">Progress to Target</h4>
          <Gauge 
            value={currentProfits - totalPayouts}
            max={account.profitTarget}
            size="md"
            type="profit"
            label="Target Progress"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Progress: ${(currentProfits - totalPayouts).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span>Target: ${account.profitTarget.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          {account.resetDate && (
            <div className="text-xs text-muted-foreground mt-1">
              Reset on {format(new Date(account.resetDate), "MMM d, yyyy")}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Drawdown Status</h4>
          {(() => {
            // Current balance calculation considering reset date but without payouts for drawdown
            const balanceWithoutPayouts = account.startingBalance + currentProfits
            const currentBalance = balanceWithoutPayouts - totalPayouts
            
            // Initialize drawdown tracking variables exactly like the chart
            let maxBalanceToDate = account.startingBalance
            let maxDrawdownLevel = account.startingBalance - account.drawdownThreshold
            let hasReachedStopProfit = false

            // Calculate current profit without considering payouts
            const currentProfit = currentProfits

            if (account.trailingDrawdown && currentProfit > 0) {
              if (account.trailingStopProfit && currentProfit >= account.trailingStopProfit) {
                // If we've reached stop profit, lock the drawdown level
                if (!hasReachedStopProfit) {
                  hasReachedStopProfit = true
                  maxDrawdownLevel = account.startingBalance + account.trailingStopProfit - account.drawdownThreshold
                }
              } else if (!hasReachedStopProfit) {
                // Only update drawdown level if we haven't reached stop profit
                if (balanceWithoutPayouts > maxBalanceToDate) {
                  maxBalanceToDate = balanceWithoutPayouts
                  maxDrawdownLevel = maxBalanceToDate - account.drawdownThreshold
                }
              }
            }

            // Simple distance calculation - this uses the actual balance with payouts
            const distanceToDrawdown = currentBalance - maxDrawdownLevel
            // Calculate percentage of distance relative to current balance for color coding
            const distancePercentage = (distanceToDrawdown / currentBalance) * 100
            
            return (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span>Current Balance</span>
                  <span className="font-medium">${currentBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Drawdown Level</span>
                  <span className="font-medium text-destructive">${maxDrawdownLevel.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Distance to Drawdown</span>
                  <span className={cn(
                    "font-medium",
                    distancePercentage > 3 ? "text-success" : distancePercentage > 1 ? "text-warning" : "text-destructive"
                  )}>
                    ${distanceToDrawdown.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                {account.trailingDrawdown && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Trailing Drawdown {account.trailingStopProfit ? `(Locks at $${account.trailingStopProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })})` : ''}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Performance Metrics</h4>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Avg. Daily PnL</dt>
              <dd className="text-sm">${avgDailyPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Total Payouts</dt>
              <dd className="text-sm">${totalPayouts.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Current Profits</dt>
              <dd className="text-sm">${currentProfits.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd>
            </div>
          </dl>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Projections</h4>
          <dl className="space-y-1">
            {estimatedNextPayout && (
              <>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Est. Next Payout</dt>
                  <dd className="text-sm">{format(estimatedNextPayout, "MMM d, yyyy")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Remaining to Payout</dt>
                  <dd className="text-sm">${remainingForPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Payout History</h4>
        {account.payouts && account.payouts.length > 0 ? (
          <div className="space-y-2">
            {account.payouts
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .map(payout => (
                <div
                  key={payout.id}
                  className="flex justify-between items-center p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80"
                  onClick={() => onEditPayout({
                    id: payout.id,
                    date: new Date(payout.date),
                    amount: payout.amount,
                    status: payout.status
                  }, account.accountNumber)}
                >
                  <div className="flex items-center space-x-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      {
                        "bg-gray-500": payout.status === 'PENDING',
                        "bg-orange-500": payout.status === 'VALIDATED',
                        "bg-red-500": payout.status === 'REFUSED',
                        "bg-green-500": payout.status === 'PAID',
                      }
                    )} />
                    <span className="text-sm">{format(new Date(payout.date), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium">${payout.amount.toLocaleString()}</span>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      {
                        "bg-gray-100 text-gray-700": payout.status === 'PENDING',
                        "bg-orange-100 text-orange-700": payout.status === 'VALIDATED',
                        "bg-red-100 text-red-700": payout.status === 'REFUSED',
                        "bg-green-100 text-green-700": payout.status === 'PAID',
                      }
                    )}>
                      {payout.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No payouts recorded yet</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Account Settings</h4>
          <dl className="space-y-1">
            {account.resetDate && (
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Reset Date</dt>
                <dd className="text-sm">{format(new Date(account.resetDate), "MMM d, yyyy")}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}

export function PropFirmCard() {
  const { trades, user } = useUserData()
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false)
  const [selectedAccountForPayout, setSelectedAccountForPayout] = useState<string>('')
  const [dbAccounts, setDbAccounts] = useState<any[]>([])
  const [selectedPayout, setSelectedPayout] = useState<{
    id: string;
    date: Date;
    amount: number;
    status: string;
  } | undefined>()
  const [drawdownDialogOpen, setDrawdownDialogOpen] = useState(false)
  const [selectedAccountForDrawdown, setSelectedAccountForDrawdown] = useState<PropFirmAccount | null>(null)
  const [accountEditDialogOpen, setAccountEditDialogOpen] = useState(false)
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<PropFirmAccount | null>(null)

  useEffect(() => {
    async function fetchAccounts() {
      if (!user) return
      try {
        const accounts = await getAccounts()
        setDbAccounts(accounts)
      } catch (error) {
        console.error('Failed to fetch accounts:', error)
        toast({
          title: 'Failed to load accounts',
          description: 'Please try again later',
          variant: 'destructive',
        })
      }
    }
    fetchAccounts()
  }, [user])


  const propFirmAccounts = useMemo(() => {
    const uniqueAccounts = new Set(trades.map(trade => trade.accountNumber))
    return Array.from(uniqueAccounts).map(accountNumber => {
      const accountTrades = trades.filter(t => t.accountNumber === accountNumber)
      const balance = accountTrades.reduce((total, trade) => total + trade.pnl - (trade.commission || 0), 0)
      
      const dbAccount = dbAccounts.find(acc => acc.number === accountNumber)
      
      return {
        id: accountNumber,
        accountNumber,
        balanceToDate: balance,
        profitTarget: dbAccount?.profitTarget ?? 0,
        drawdownThreshold: dbAccount?.drawdownThreshold ?? 0,
        isPerformance: dbAccount?.isPerformance ?? false,
        startingBalance: dbAccount?.startingBalance ?? 0,
        propfirm: dbAccount?.propfirm ?? '',
        payouts: dbAccount?.payouts ?? [],
        trailingDrawdown: dbAccount?.trailingDrawdown ?? false,
        trailingStopProfit: dbAccount?.trailingStopProfit ?? null,
        resetDate: dbAccount?.resetDate || null,
        consistencyPercentage: dbAccount?.consistencyPercentage ?? 0,
        accountSize: dbAccount?.accountSize || '',
        accountSizeName: dbAccount?.accountSizeName || '',
        price: dbAccount?.price || 0,
        priceWithPromo: dbAccount?.priceWithPromo || 0,
        evaluation: dbAccount?.evaluation || true,
        minDays: dbAccount?.minDays || 0,
        dailyLoss: dbAccount?.dailyLoss || 0,
        rulesDailyLoss: dbAccount?.rulesDailyLoss || '',
        trailing: dbAccount?.trailing || '',
        tradingNewsAllowed: dbAccount?.tradingNewsAllowed || true,
        activationFees: dbAccount?.activationFees || 0,
        isRecursively: dbAccount?.isRecursively || '',
        payoutBonus: dbAccount?.payoutBonus || 0,
        profitSharing: dbAccount?.profitSharing || 0,
        payoutPolicy: dbAccount?.payoutPolicy || '',
        balanceRequired: dbAccount?.balanceRequired || 0,
        minTradingDaysForPayout: dbAccount?.minTradingDaysForPayout || 0,
        minPayout: dbAccount?.minPayout || 0,
        maxPayout: dbAccount?.maxPayout || '',
        maxFundedAccounts: dbAccount?.maxFundedAccounts || null,
        createdAt: dbAccount?.createdAt || new Date(),
        groupId: dbAccount?.groupId || null,
        payoutCount: dbAccount?.payoutCount || 0,
      }
    })
  }, [trades, dbAccounts])

  const handleSetupAccount = async (data: Partial<PropFirmAccount>) => {
    if (!user) return

    try {
      await setupAccount({
        number: selectedAccount,
        userId: user.id,
        propfirm: data.propfirm || '',
        profitTarget: data.profitTarget || 0,
        drawdownThreshold: data.drawdownThreshold || 0,
        startingBalance: data.startingBalance || 0,
        isPerformance: data.isPerformance || false,
        trailingDrawdown: data.trailingDrawdown || false,
        trailingStopProfit: data.trailingStopProfit || null,
        resetDate: data.resetDate || null,
        consistencyPercentage: data.consistencyPercentage || 0,
        accountSize: data.accountSize || '',
        accountSizeName: data.accountSizeName || '',
        price: data.price || 0,
        priceWithPromo: data.priceWithPromo || 0,
        evaluation: data.evaluation || true,
        minDays: data.minDays || 0,
        dailyLoss: data.dailyLoss || 0,
        rulesDailyLoss: data.rulesDailyLoss || '',
        trailing: data.trailing || '',
        tradingNewsAllowed: data.tradingNewsAllowed || true,
        activationFees: data.activationFees || 0,
        isRecursively: data.isRecursively || '',
        payoutBonus: data.payoutBonus || 0,
        profitSharing: data.profitSharing || 0,
        payoutPolicy: data.payoutPolicy || '',
        balanceRequired: data.balanceRequired || 0,
        minTradingDaysForPayout: data.minTradingDaysForPayout || 0,
        minPayout: data.minPayout || 0,
        maxPayout: data.maxPayout || '',
        maxFundedAccounts: data.maxFundedAccounts || null,
        id: '',
        createdAt: new Date(),
        groupId: null,
        payoutCount: 0
      })

      toast({
        title: 'Account setup successful',
        description: 'Your prop firm account has been configured.',
      })
      setSetupDialogOpen(false)
    } catch (error) {
      toast({
        title: 'Failed to setup account',
        description: 'Please try again later',
        variant: 'destructive',
      })
    }
  }

  const handleAddPayout = async (payout: Payout) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not found',
        variant: 'destructive',
      })
      return
    }

    const userId = user.id

    try {
    //   if (selectedPayout) {
    //     // Update existing payout
    //     await updatePayout(selectedPayout.id, {
    //       date: payout.date,
    //       amount: payout.amount,
    //       status: payout.status
    //     })
    //   } else {
    //     // Create new payout
    //     await addPropFirmPayout({
    //       accountNumber: selectedAccountForPayout,
    //       userId,
    //       date: payout.date,
    //       amount: payout.amount,
    //       status: payout.status
    //     })
    //   }

      // Refresh the accounts data
      const accounts = await getAccounts()
      setDbAccounts(accounts)

      toast({
        title: `Payout ${selectedPayout ? 'updated' : 'recorded'} successfully`,
        description: `Your payout has been ${selectedPayout ? 'updated' : 'recorded'}.`,
      })
      setPayoutDialogOpen(false)
      setSelectedPayout(undefined)
    } catch (error) {
      console.error('Error handling payout:', error)
      toast({
        title: `Failed to ${selectedPayout ? 'update' : 'record'} payout`,
        description: 'Please try again later',
        variant: 'destructive',
      })
    }
  }

  const handleDeletePayout = async () => {
    if (!selectedPayout) return

    try {
      await deletePayout(selectedPayout.id)
      
      // Refresh the accounts data
      const accounts = await getAccounts()
      setDbAccounts(accounts)

      toast({
        title: 'Payout deleted successfully',
        description: 'The payout record has been removed.',
      })
      setPayoutDialogOpen(false)
      setSelectedPayout(undefined)
    } catch (error) {
      toast({
        title: 'Failed to delete payout',
        description: 'Please try again later',
        variant: 'destructive',
      })
    }
  }

  const handleEditPayout = (
    payout: { id: string; date: Date; amount: number; status: string }, 
    accountNumber: string
  ) => {
    setSelectedPayout(payout)
    setSelectedAccountForPayout(accountNumber)
    setPayoutDialogOpen(true)
  }

  const handleEditDrawdown = async (data: {
    drawdownThreshold: number
    trailingDrawdown: boolean
    trailingStopProfit?: number
  }) => {
    if (!selectedAccountForDrawdown || !user) return

    try {
      await setupAccount({
        number: selectedAccountForDrawdown.accountNumber,
        userId: user.id,
        propfirm: selectedAccountForDrawdown.propfirm,
        profitTarget: selectedAccountForDrawdown.profitTarget,
        drawdownThreshold: data.drawdownThreshold,
        startingBalance: selectedAccountForDrawdown.startingBalance,
        isPerformance: selectedAccountForDrawdown.isPerformance,
        trailingDrawdown: data.trailingDrawdown,
        trailingStopProfit: data.trailingStopProfit || null,
        resetDate: selectedAccountForDrawdown.resetDate || null,
        consistencyPercentage: selectedAccountForDrawdown.consistencyPercentage,
        accountSize: selectedAccountForDrawdown.accountSize || '',
        accountSizeName: selectedAccountForDrawdown.accountSizeName || '',
        price: selectedAccountForDrawdown.price || 0,
        priceWithPromo: selectedAccountForDrawdown.priceWithPromo || 0,
        evaluation: selectedAccountForDrawdown.evaluation || true,
        minDays: selectedAccountForDrawdown.minDays || 0,
        dailyLoss: selectedAccountForDrawdown.dailyLoss || 0,
        rulesDailyLoss: selectedAccountForDrawdown.rulesDailyLoss || '',
        trailing: selectedAccountForDrawdown.trailing || '',
        tradingNewsAllowed: selectedAccountForDrawdown.tradingNewsAllowed || true,
        activationFees: selectedAccountForDrawdown.activationFees || 0,
        isRecursively: selectedAccountForDrawdown.isRecursively || '',
        payoutBonus: selectedAccountForDrawdown.payoutBonus || 0,
        profitSharing: selectedAccountForDrawdown.profitSharing || 0,
        payoutPolicy: selectedAccountForDrawdown.payoutPolicy || '',
        balanceRequired: selectedAccountForDrawdown.balanceRequired || 0,
        minTradingDaysForPayout: selectedAccountForDrawdown.minTradingDaysForPayout || 0,
        minPayout: selectedAccountForDrawdown.minPayout || 0,
        maxPayout: selectedAccountForDrawdown.maxPayout || '',
        maxFundedAccounts: selectedAccountForDrawdown.maxFundedAccounts || null,
        id: selectedAccountForDrawdown.id,
        createdAt: selectedAccountForDrawdown.createdAt,
        groupId: selectedAccountForDrawdown.groupId,
        payoutCount: selectedAccountForDrawdown.payoutCount
      })

      // Refresh accounts
      const accounts = await getAccounts()
      setDbAccounts(accounts)

      toast({
        title: 'Drawdown settings updated',
        description: 'Your drawdown settings have been saved.',
      })
      setDrawdownDialogOpen(false)
      setSelectedAccountForDrawdown(null)
    } catch (error) {
      toast({
        title: 'Failed to update drawdown settings',
        description: 'Please try again later',
        variant: 'destructive',
      })
    }
  }

  const handleEditAccount = async (data: Partial<PropFirmAccount>) => {
    if (!selectedAccountForEdit || !user) return

    try {
      if (!data.propfirm) {
        toast({
          title: 'Error',
          description: 'Prop firm name is required',
          variant: 'destructive',
        })
        return
      }

      await setupAccount({
        number: selectedAccountForEdit.accountNumber,
        userId: user.id,
        propfirm: data.propfirm,
        profitTarget: data.profitTarget ?? selectedAccountForEdit.profitTarget,
        startingBalance: data.startingBalance ?? selectedAccountForEdit.startingBalance,
        isPerformance: data.isPerformance ?? selectedAccountForEdit.isPerformance,
        drawdownThreshold: selectedAccountForEdit.drawdownThreshold,
        trailingDrawdown: selectedAccountForEdit.trailingDrawdown,
        trailingStopProfit: selectedAccountForEdit.trailingStopProfit || null,
        resetDate: data.resetDate || null,
        consistencyPercentage: data.consistencyPercentage ?? selectedAccountForEdit.consistencyPercentage,
        accountSize: selectedAccountForEdit.accountSize || '',
        accountSizeName: selectedAccountForEdit.accountSizeName || '',
        price: selectedAccountForEdit.price || 0,
        priceWithPromo: selectedAccountForEdit.priceWithPromo || 0,
        evaluation: selectedAccountForEdit.evaluation || true,
        minDays: selectedAccountForEdit.minDays || 0,
        dailyLoss: selectedAccountForEdit.dailyLoss || 0,
        rulesDailyLoss: selectedAccountForEdit.rulesDailyLoss || '',
        trailing: selectedAccountForEdit.trailing || '',
        tradingNewsAllowed: selectedAccountForEdit.tradingNewsAllowed || true,
        activationFees: selectedAccountForEdit.activationFees || 0,
        isRecursively: selectedAccountForEdit.isRecursively || '',
        payoutBonus: selectedAccountForEdit.payoutBonus || 0,
        profitSharing: selectedAccountForEdit.profitSharing || 0,
        payoutPolicy: selectedAccountForEdit.payoutPolicy || '',
        balanceRequired: selectedAccountForEdit.balanceRequired || 0,
        minTradingDaysForPayout: selectedAccountForEdit.minTradingDaysForPayout || 0,
        minPayout: selectedAccountForEdit.minPayout || 0,
        maxPayout: selectedAccountForEdit.maxPayout || '',
        maxFundedAccounts: selectedAccountForEdit.maxFundedAccounts || null,
        id: selectedAccountForEdit.id,
        createdAt: selectedAccountForEdit.createdAt,
        groupId: selectedAccountForEdit.groupId,
        payoutCount: selectedAccountForEdit.payoutCount
      })

      const accounts = await getAccounts()
      setDbAccounts(accounts)

      toast({
        title: 'Account updated successfully',
        description: 'Your account settings have been saved.',
      })
      setAccountEditDialogOpen(false)
      setSelectedAccountForEdit(null)
    } catch (error) {
      toast({
        title: 'Failed to update account',
        description: 'Please try again later',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Prop Firm Accounts</CardTitle>
        <CardDescription>Monitor your prop firm account status and targets</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={propFirmAccounts[0]?.accountNumber}>
          <TabsList className="mb-4">
            {propFirmAccounts.map((account) => (
              <TabsTrigger key={account.accountNumber} value={account.accountNumber}>
                {account.accountNumber}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {propFirmAccounts.map((account) => (
            <TabsContent key={account.accountNumber} value={account.accountNumber}>
              {!account.propfirm ? (
                <div className="flex justify-center py-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAccount(account.accountNumber)
                      setSetupDialogOpen(true)
                    }}
                  >
                    Setup Account
                  </Button>
                </div>
              ) : (
                <AccountTab 
                  account={account}
                  onAddPayout={(accountNumber) => {
                    setSelectedAccountForPayout(accountNumber)
                    setPayoutDialogOpen(true)
                  }}
                  onEditPayout={handleEditPayout}
                  onEditDrawdown={(account) => {
                    setSelectedAccountForDrawdown(account)
                    setDrawdownDialogOpen(true)
                  }}
                  onEditAccount={(account) => {
                    setSelectedAccountForEdit(account)
                    setAccountEditDialogOpen(true)
                  }}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <PropFirmSetupDialog
        open={setupDialogOpen}
        onOpenChange={setSetupDialogOpen}
        accountNumber={selectedAccount}
        onSubmit={handleSetupAccount}
      />

      <PayoutDialog
        open={payoutDialogOpen}
        onOpenChange={(open) => {
          setPayoutDialogOpen(open)
          if (!open) setSelectedPayout(undefined)
        }}
        accountNumber={selectedAccountForPayout}
        existingPayout={selectedPayout}
        onSubmit={handleAddPayout}
        onDelete={selectedPayout ? handleDeletePayout : undefined}
      />

      {selectedAccountForDrawdown && (
        <DrawdownSettingsDialog
          open={drawdownDialogOpen}
          onOpenChange={setDrawdownDialogOpen}
          account={selectedAccountForDrawdown}
          onSubmit={handleEditDrawdown}
        />
      )}

      {selectedAccountForEdit && (
        <AccountEditDialog
          open={accountEditDialogOpen}
          onOpenChange={setAccountEditDialogOpen}
          account={selectedAccountForEdit}
          onSubmit={handleEditAccount}
        />
      )}
    </Card>
  )
}