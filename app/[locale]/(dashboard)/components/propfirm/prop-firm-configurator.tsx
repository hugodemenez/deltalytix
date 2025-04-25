'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, X, Trash2, Check, ChevronsUpDown } from "lucide-react"
import { format, Locale } from "date-fns"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useParams } from 'next/navigation'
import { enUS, fr } from 'date-fns/locale'
import { toast } from "@/hooks/use-toast"
import { setupPropFirmAccount, getPropFirmAccounts, deletePropFirmAccount } from '@/app/[locale]/(dashboard)/dashboard/data/actions'
import { useUserData } from "@/components/context/user-data"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { propFirms } from './config'
import SuggestionInput from './suggestion-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PropFirmAccount } from './types'

interface PropFirmConfiguratorProps {
  account: PropFirmAccount
  onUpdate: (updatedAccount: PropFirmAccount) => void
  onDelete: () => void
  onAccountsUpdate: (accounts: PropFirmAccount[]) => void
}

const localeMap: { [key: string]: Locale } = {
  en: enUS,
  fr: fr
}

export function PropFirmConfigurator({ account, onUpdate, onDelete, onAccountsUpdate }: PropFirmConfiguratorProps) {
  const { user } = useUserData()
  const t = useI18n()
  const params = useParams()
  const [pendingChanges, setPendingChanges] = useState<Partial<PropFirmAccount> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [selectedAccountSize, setSelectedAccountSize] = useState<string>("")

  const handlePropFirmChange = (value: string) => {
    setPendingChanges(prev => ({
      ...prev,
      propfirm: value
    }))
    setSelectedAccountSize("") // Reset account size when prop firm changes
  }

  const handleAccountSizeChange = (value: string) => {
    setSelectedAccountSize(value)
    const selectedPropFirm = pendingChanges?.propfirm ?? account.propfirm
    console.error('selectedPropFirm:', selectedPropFirm)
    console.error('value:', value)
    
    if (selectedPropFirm && value) {
      // Find the prop firm by name
      const propFirmKey = Object.keys(propFirms).find(key => propFirms[key].name === selectedPropFirm)
      
      if (!propFirmKey) {
        console.error('Prop firm not found:', selectedPropFirm)
        return
      }
      
      const propFirm = propFirms[propFirmKey]
      
      const accountSize = propFirm.accountSizes[value]
      
      if (!accountSize) {
        console.error('Account size not found:', value)
        return
      }

      setPendingChanges(prev => ({
        ...prev,
        // Basic account info
        startingBalance: accountSize.balance,
        profitTarget: accountSize.target,
        drawdownThreshold: accountSize.drawdown,
        consistencyPercentage: typeof accountSize.consistency === 'number' ? accountSize.consistency : 0,
        trailingDrawdown: accountSize.trailing === 'EOD' || accountSize.trailing === 'Intraday',
        trailingStopProfit: accountSize.trailing === 'EOD' || accountSize.trailing === 'Intraday' ? accountSize.target : 0,
        
        // Account size details
        accountSize: value,
        accountSizeName: accountSize.name,
        price: accountSize.price,
        priceWithPromo: accountSize.priceWithPromo,
        evaluation: accountSize.evaluation,
        minDays: typeof accountSize.minDays === 'number' ? accountSize.minDays : 0,
        dailyLoss: accountSize.dailyLoss ?? 0,
        rulesDailyLoss: accountSize.rulesDailyLoss ?? 'No',
        trailing: accountSize.trailing ?? 'Static',
        tradingNewsAllowed: accountSize.tradingNewsAllowed ?? false,
        activationFees: accountSize.activationFees ?? 0,
        isRecursively: accountSize.isRecursively ?? 'No',
        payoutBonus: accountSize.payoutBonus ?? 0,
        profitSharing: accountSize.profitSharing ?? 0,
        payoutPolicy: accountSize.payoutPolicy ?? '',
        balanceRequired: accountSize.balanceRequired ?? 0,
        minTradingDaysForPayout: accountSize.minTradingDaysForPayout ?? 0,
        minPayout: accountSize.minPayout ?? 0,
        maxPayout: accountSize.maxPayout ?? 'No',
        maxFundedAccounts: accountSize.maxFundedAccounts ?? 0
      }))
    }
  }

  const handleSave = async () => {
    if (!user || !pendingChanges) return
    
    try {
      setIsSaving(true)
      const accountUpdate = {
        ...account,
        userId: user.id,
        ...pendingChanges, // Include all pending changes
        startingBalance: pendingChanges?.startingBalance ?? account.startingBalance,
        profitTarget: pendingChanges?.profitTarget ?? account.profitTarget,
        drawdownThreshold: pendingChanges?.drawdownThreshold ?? account.drawdownThreshold,
        consistencyPercentage: pendingChanges?.consistencyPercentage ?? account.consistencyPercentage,
        propfirm: pendingChanges?.propfirm ?? account.propfirm,
        resetDate: pendingChanges?.resetDate instanceof Date ? pendingChanges.resetDate : undefined,
        trailingDrawdown: pendingChanges?.trailingDrawdown ?? account.trailingDrawdown,
        trailingStopProfit: pendingChanges?.trailingStopProfit ?? account.trailingStopProfit,
        // Include all the new fields
        accountSize: pendingChanges?.accountSize ?? account.accountSize,
        accountSizeName: pendingChanges?.accountSizeName ?? account.accountSizeName,
        price: pendingChanges?.price ?? account.price,
        priceWithPromo: pendingChanges?.priceWithPromo ?? account.priceWithPromo,
        evaluation: pendingChanges?.evaluation ?? account.evaluation,
        minDays: pendingChanges?.minDays ?? account.minDays,
        dailyLoss: pendingChanges?.dailyLoss ?? account.dailyLoss,
        rulesDailyLoss: pendingChanges?.rulesDailyLoss ?? account.rulesDailyLoss,
        trailing: pendingChanges?.trailing ?? account.trailing,
        tradingNewsAllowed: pendingChanges?.tradingNewsAllowed ?? account.tradingNewsAllowed,
        activationFees: pendingChanges?.activationFees ?? account.activationFees,
        isRecursively: pendingChanges?.isRecursively ?? account.isRecursively,
        payoutBonus: pendingChanges?.payoutBonus ?? account.payoutBonus,
        profitSharing: pendingChanges?.profitSharing ?? account.profitSharing,
        payoutPolicy: pendingChanges?.payoutPolicy ?? account.payoutPolicy,
        balanceRequired: pendingChanges?.balanceRequired ?? account.balanceRequired,
        minTradingDaysForPayout: pendingChanges?.minTradingDaysForPayout ?? account.minTradingDaysForPayout,
        minPayout: pendingChanges?.minPayout ?? account.minPayout,
        maxPayout: pendingChanges?.maxPayout ?? account.maxPayout,
        maxFundedAccounts: pendingChanges?.maxFundedAccounts ?? account.maxFundedAccounts
      }

      await setupPropFirmAccount(accountUpdate)
      
      // Reload the accounts data
      const accounts = await getPropFirmAccounts(user.id)
      
      // Update the selected account with new data
      const updatedDbAccount = accounts.find(acc => acc.number === account.accountNumber)
      if (updatedDbAccount) {
        const updatedAccount = {
          ...account,
          startingBalance: updatedDbAccount.startingBalance,
          profitTarget: updatedDbAccount.profitTarget,
          drawdownThreshold: updatedDbAccount.drawdownThreshold,
          consistencyPercentage: updatedDbAccount.consistencyPercentage ?? 30,
          propfirm: updatedDbAccount.propfirm,
          trailingDrawdown: updatedDbAccount.trailingDrawdown ?? false,
          trailingStopProfit: updatedDbAccount.trailingStopProfit ?? 0,
          resetDate: updatedDbAccount.resetDate ? new Date(updatedDbAccount.resetDate) : null
        }

        // Update local storage
        const storedAccounts = localStorage.getItem('propFirmAccounts')
        if (storedAccounts) {
          const parsedAccounts = JSON.parse(storedAccounts)
          const updatedAccounts = parsedAccounts.map((acc: PropFirmAccount) => 
            acc.accountNumber === updatedAccount.accountNumber ? updatedAccount : acc
          )
          localStorage.setItem('propFirmAccounts', JSON.stringify(updatedAccounts))
        }
        
        // Update parent component's accounts list
        const transformedAccounts = accounts.map(acc => ({
          ...acc,
          accountNumber: acc.number,
          balanceToDate: 0 // You might want to calculate this based on your business logic
        }))
        onAccountsUpdate(transformedAccounts as PropFirmAccount[])
        // Update the selected account
        onUpdate(updatedAccount)
      }
      
      setPendingChanges(null)
      
      toast({
        title: t('propFirm.toast.setupSuccess'),
        description: t('propFirm.toast.setupSuccessDescription'),
        variant: "default"
      })
    } catch (error) {
      console.error('Failed to setup account:', error)
      toast({
        title: t('propFirm.toast.setupError'),
        description: t('propFirm.toast.setupErrorDescription'),
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }


  const isSaveDisabled = !pendingChanges || 
    Object.keys(pendingChanges).length === 0 || 
    (pendingChanges.startingBalance !== undefined && pendingChanges.startingBalance <= 0) ||
    (pendingChanges.profitTarget !== undefined && pendingChanges.profitTarget <= 0) ||
    (pendingChanges.drawdownThreshold !== undefined && pendingChanges.drawdownThreshold <= 0) ||
    (pendingChanges.consistencyPercentage !== undefined && pendingChanges.consistencyPercentage < 0) ||
    (pendingChanges.trailingDrawdown && pendingChanges.trailingStopProfit !== undefined && pendingChanges.trailingStopProfit <= 0) ||
    isSaving

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="propfirm">Prop Firm Name</Label>
            <SuggestionInput
              label=""
              placeholder="Search prop firms..."
              suggestions={Object.values(propFirms).map(firm => firm.name)}
              initialValue={pendingChanges?.propfirm ?? account.propfirm ?? ""}
              onChange={handlePropFirmChange}
              className="w-[200px]"
            />
          </div>
          {(pendingChanges?.propfirm ?? account.propfirm) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="accountSize">Account Size</Label>
              <Select
                value={selectedAccountSize}
                onValueChange={handleAccountSizeChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select account size" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(Object.values(propFirms).find(firm => firm.name === (pendingChanges?.propfirm ?? account.propfirm))?.accountSizes ?? {}).map(([key, accountSize]) => (
                    <SelectItem key={key} value={key}>
                      {accountSize.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="flex flex-col gap-2">
          <Label>{t('propFirm.accountSize')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Input
                type="number"
                value={pendingChanges?.startingBalance ?? account.startingBalance ?? 0}
                onChange={(e) => setPendingChanges(prev => ({
                  ...prev,
                  startingBalance: parseFloat(e.target.value)
                }))}
              />
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid grid-cols-2 gap-2">
                {[25000, 50000, 100000, 150000, 300000].map((size) => (
                  <Button
                    key={size}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setPendingChanges(prev => ({
                        ...prev,
                        startingBalance: size
                      }))
                    }}
                  >
                    {size.toLocaleString()}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t('propFirm.target')}</Label>
          <Input
            type="number"
            value={pendingChanges?.profitTarget ?? account.profitTarget ?? 0}
            onChange={(e) => setPendingChanges(prev => ({
              ...prev,
              profitTarget: parseFloat(e.target.value)
            }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Drawdown</Label>
          <Input
            type="number"
            value={pendingChanges?.drawdownThreshold ?? account.drawdownThreshold ?? 0}
            onChange={(e) => setPendingChanges(prev => ({
              ...prev,
              drawdownThreshold: parseFloat(e.target.value)
            }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Coherence</Label>
          <Input
            type="number"
            value={pendingChanges?.consistencyPercentage ?? account.consistencyPercentage ?? 30}
            onChange={(e) => setPendingChanges(prev => ({
              ...prev,
              consistencyPercentage: parseFloat(e.target.value)
            }))}
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label>Drawdown Type</Label>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="trailingDrawdown"
                checked={pendingChanges?.trailingDrawdown ?? account.trailingDrawdown ?? false}
                onCheckedChange={(checked) => setPendingChanges(prev => ({
                  ...prev,
                  trailingDrawdown: checked,
                  trailingStopProfit: checked ? (prev?.trailingStopProfit ?? account.trailingStopProfit ?? 0) : 0
                }))}
              />
              <Label htmlFor="trailingDrawdown" className="cursor-pointer">Trailing Drawdown</Label>
            </div>
          </div>
        </div>

        {(pendingChanges?.trailingDrawdown ?? account.trailingDrawdown) && (
          <div className="flex flex-col gap-2">
            <Label>Trailing Stop Profit</Label>
            <Input
              type="number"
              value={pendingChanges?.trailingStopProfit ?? account.trailingStopProfit ?? 0}
              onChange={(e) => setPendingChanges(prev => ({
                ...prev,
                trailingStopProfit: parseFloat(e.target.value)
              }))}
              placeholder="Enter amount to lock drawdown"
            />
            <p className="text-xs text-muted-foreground">
              {t('propFirm.trailingDrawdown.explanation')}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>{t('propFirm.resetDate.label')}</Label>
          <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
            <DialogTrigger asChild>
              <div className="relative w-full">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal pr-10",
                    !pendingChanges?.resetDate && !account.resetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {pendingChanges?.resetDate || account.resetDate ? (
                    format(pendingChanges?.resetDate || account.resetDate!, 'PPP', { locale: localeMap[params.locale as string] })
                  ) : (
                    <span>{t('propFirm.resetDate.noDate')}</span>
                  )}
                </Button>
                {(pendingChanges?.resetDate || account.resetDate) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full hover:bg-transparent"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPendingChanges(prev => ({
                        ...prev,
                        resetDate: undefined
                      }));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{t('propFirm.resetDate.title')}</DialogTitle>
                <DialogDescription>
                  {t('propFirm.resetDate.description')}
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <Calendar
                  mode="single"
                  numberOfMonths={2}
                  showOutsideDays={true}
                  fixedWeeks={true}
                  selected={pendingChanges?.resetDate || account.resetDate || undefined}
                  onSelect={(date) => {
                    setPendingChanges(prev => ({
                      ...prev,
                      resetDate: date || undefined
                    }));
                    setCalendarOpen(false);
                  }}
                  initialFocus
                  locale={localeMap[params.locale as string]}
                  className="mx-auto"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {pendingChanges && (
        <div className="flex-none border-t pt-4">
          <Button 
            className="w-full"
            disabled={isSaveDisabled}
            onClick={handleSave}
          >
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      )}
    </div>
  )
} 