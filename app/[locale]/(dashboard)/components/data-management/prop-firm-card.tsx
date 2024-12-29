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
import { useTrades } from "@/components/context/trades-data"
import { useMemo, useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { useUser } from "@/components/context/user-data"
import { setupPropFirmAccount, getPropFirmAccounts, addPropFirmPayout, deletePayout, updatePayout, checkAndResetAccounts } from "@/app/[locale]/(dashboard)/dashboard/data/actions"
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
  trailingStopProfit: number
  resetDate?: Date
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
    trailingStopProfit: 0,
    resetDate: new Date(),
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
                onChange={(e) => setFormData(prev => ({ ...prev, trailingStopProfit: Number(e.target.value) }))}
              />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="resetDate">Reset Date</Label>
            <div className="col-span-3">
              <Calendar
                mode="single"
                selected={formData.resetDate || undefined}
                onSelect={(date) => setFormData(prev => ({ ...prev, resetDate: date || undefined }))}
                initialFocus
                className="rounded-md border"
              />
            </div>
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
    resetDate: account.resetDate || new Date(),
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
                onSelect={(date) => setFormData(prev => ({ ...prev, resetDate: date || undefined }))}
                initialFocus
                className="rounded-md border"
              />
            </div>
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
  const { trades } = useTrades()
  const accountTrades = trades.filter(t => t.accountNumber === account.accountNumber)
  
  // Calculate average daily PnL
  const avgDailyPnl = useMemo(() => {
    if (accountTrades.length === 0) return 0
    
    // Get unique trading days
    const tradingDays = new Set(
      accountTrades.map(trade => 
        new Date(trade.closeDate).toISOString().split('T')[0]
      )
    )
    
    const totalPnl = accountTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    return totalPnl / tradingDays.size
  }, [accountTrades])

  // Calculate total payouts
  const totalPayouts = useMemo(() => 
    account.payouts.reduce((sum, payout) => sum + payout.amount, 0)
  , [account.payouts])

  // Calculate total PnL from trades
  const totalPnL = useMemo(() => 
    accountTrades.reduce((sum, trade) => sum + trade.pnl, 0)
  , [accountTrades])

  // Calculate current profits (total PnL already includes withdrawn profits)
  const currentProfits = totalPnL

  // Calculate current balance without payouts
  const currentBalanceWithoutPayouts = useMemo(() => 
    account.startingBalance + totalPnL - totalPayouts
  , [account.startingBalance, totalPnL, totalPayouts])

  // Calculate remaining amount needed for next payout
  // We need to reach profit target considering already withdrawn payouts
  const remainingForPayout = Math.max(0, account.profitTarget - (currentProfits - totalPayouts))

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
  }, [account, avgDailyPnl, remainingForPayout])

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
          trailingStopProfit={account.trailingStopProfit}
          resetDate={account.resetDate ? format(new Date(account.resetDate), "yyyy-MM-dd") : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-medium">Progress to Target</h4>
          <Gauge 
            value={currentBalanceWithoutPayouts - account.startingBalance}
            max={account.profitTarget}
            size="md"
            type="profit"
            label="Target Progress"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Profit: ${(currentBalanceWithoutPayouts - account.startingBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span>Target: ${account.profitTarget.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Drawdown Status</h4>
          {(() => {
            let effectiveDrawdownThreshold = account.drawdownThreshold
            const initialDrawdownDistance = account.startingBalance - account.drawdownThreshold
            
            // Calculate total payouts
            const totalPayouts = account.payouts.reduce((sum, payout) => sum + payout.amount, 0)
            // Current balance without payouts
            const currentBalanceWithoutPayouts = account.balanceToDate - totalPayouts

            if (account.trailingDrawdown && currentProfits > 0) {
              if (account.trailingStopProfit && currentProfits >= account.trailingStopProfit) {
                // If total profit is above stop profit level, lock the drawdown
                effectiveDrawdownThreshold = account.startingBalance + account.trailingStopProfit - initialDrawdownDistance
              } else {
                // If we haven't reached stop profit yet, trail normally
                effectiveDrawdownThreshold = currentBalanceWithoutPayouts - initialDrawdownDistance
              }
            }

            const maxBalance = Math.max(account.startingBalance, currentBalanceWithoutPayouts)
            const drawdownPercentage = ((currentBalanceWithoutPayouts - effectiveDrawdownThreshold) / 
                                     (maxBalance - effectiveDrawdownThreshold)) * 100
            
            return (
              <>
                <Gauge 
                  value={currentBalanceWithoutPayouts - effectiveDrawdownThreshold}
                  max={maxBalance - effectiveDrawdownThreshold}
                  size="md"
                  type="drawdown"
                  label="Drawdown Buffer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Current: ${currentBalanceWithoutPayouts.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <span>Drawdown at: ${effectiveDrawdownThreshold.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </>
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
  const { trades } = useTrades()
  const { user } = useUser()
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
        const accounts = await getPropFirmAccounts(user.id)
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
      const balance = accountTrades.reduce((total, trade) => total + trade.pnl, 0)
      
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
        trailingStopProfit: dbAccount?.trailingStopProfit ?? 0,
        resetDate: dbAccount?.resetDate,
      }
    })
  }, [trades, dbAccounts])

  const handleSetupAccount = async (data: Partial<PropFirmAccount>) => {
    if (!user) return

    try {
      await setupPropFirmAccount({
        accountNumber: selectedAccount,
        userId: user.id,
        propfirm: data.propfirm || '',
        profitTarget: data.profitTarget || 0,
        drawdownThreshold: data.drawdownThreshold || 0,
        startingBalance: data.startingBalance || 0,
        isPerformance: data.isPerformance || false,
        trailingDrawdown: data.trailingDrawdown || false,
        trailingStopProfit: data.trailingStopProfit || 0,
        resetDate: data.resetDate || undefined,
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
      if (selectedPayout) {
        // Update existing payout
        await updatePayout(selectedPayout.id, {
          date: payout.date,
          amount: payout.amount,
          status: payout.status
        })
      } else {
        // Create new payout
        await addPropFirmPayout({
          accountNumber: selectedAccountForPayout,
          userId,
          date: payout.date,
          amount: payout.amount,
          status: payout.status
        })
      }

      // Refresh the accounts data
      const accounts = await getPropFirmAccounts(userId)
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
      const accounts = await getPropFirmAccounts(user!.id)
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
      await setupPropFirmAccount({
        accountNumber: selectedAccountForDrawdown.accountNumber,
        userId: user.id,
        propfirm: selectedAccountForDrawdown.propfirm,
        profitTarget: selectedAccountForDrawdown.profitTarget,
        drawdownThreshold: data.drawdownThreshold,
        startingBalance: selectedAccountForDrawdown.startingBalance,
        isPerformance: selectedAccountForDrawdown.isPerformance,
        trailingDrawdown: data.trailingDrawdown,
        trailingStopProfit: data.trailingStopProfit,
        resetDate: selectedAccountForDrawdown.resetDate,
      })

      // Refresh accounts
      const accounts = await getPropFirmAccounts(user.id)
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

      await setupPropFirmAccount({
        accountNumber: selectedAccountForEdit.accountNumber,
        userId: user.id,
        propfirm: data.propfirm,
        profitTarget: data.profitTarget ?? selectedAccountForEdit.profitTarget,
        startingBalance: data.startingBalance ?? selectedAccountForEdit.startingBalance,
        isPerformance: data.isPerformance ?? selectedAccountForEdit.isPerformance,
        drawdownThreshold: selectedAccountForEdit.drawdownThreshold,
        trailingDrawdown: selectedAccountForEdit.trailingDrawdown,
        trailingStopProfit: selectedAccountForEdit.trailingStopProfit,
        resetDate: data.resetDate || undefined,
      })

      const accounts = await getPropFirmAccounts(user.id)
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