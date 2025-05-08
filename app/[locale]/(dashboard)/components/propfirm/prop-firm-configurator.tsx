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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

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

  const handleTemplateChange = (firmKey: string, sizeKey: string) => {
    const firm = propFirms[firmKey]
    const accountSize = firm.accountSizes[sizeKey]
    
    if (!firm || !accountSize) {
      console.error('Template not found:', firmKey, sizeKey)
      return
    }

    setPendingChanges(prev => ({
      ...prev,
      // Basic account info
      propfirm: firm.name,
      startingBalance: accountSize.balance,
      profitTarget: accountSize.target,
      drawdownThreshold: accountSize.drawdown,
      consistencyPercentage: typeof accountSize.consistency === 'number' ? accountSize.consistency : 30,
      trailingDrawdown: accountSize.trailing === 'EOD' || accountSize.trailing === 'Intraday',
      trailingStopProfit: accountSize.trailing === 'EOD' || accountSize.trailing === 'Intraday' ? accountSize.target : 0,
      
      // Account size details
      accountSize: sizeKey,
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
      balanceRequired: accountSize.balanceRequired ?? 0,
      minTradingDaysForPayout: accountSize.minTradingDaysForPayout ?? 0
    }))
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
        balanceRequired: pendingChanges?.balanceRequired ?? account.balanceRequired,
        minTradingDaysForPayout: pendingChanges?.minTradingDaysForPayout ?? account.minTradingDaysForPayout
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
      {/* Template Loading Section */}
      <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">{t('propFirm.configurator.template.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('propFirm.configurator.template.description')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[300px] justify-between"
              >
                {selectedAccountSize ? (
                  <>
                    {(() => {
                      const firmKey = Object.keys(propFirms).find(key => propFirms[key].name === (pendingChanges?.propfirm ?? account.propfirm))
                      return firmKey ? propFirms[firmKey]?.accountSizes[selectedAccountSize]?.name : t('propFirm.configurator.template.select')
                    })()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </>
                ) : (
                  <>
                    {t('propFirm.configurator.template.select')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 max-h-[400px] overflow-y-auto">
              <Command>
                <CommandInput placeholder={t('propFirm.configurator.template.search')} />
                <CommandEmpty>{t('propFirm.configurator.template.noTemplate')}</CommandEmpty>
                {Object.entries(propFirms).map(([firmKey, firm]) => {
                  const items = Object.entries(firm.accountSizes).map(([sizeKey, accountSize]) => ({
                    sizeKey,
                    accountSize,
                    value: `${firm.name} ${accountSize.name}`,
                    searchValue: `${firm.name.toLowerCase()} ${accountSize.name.toLowerCase()}`
                  }));

                  return (
                    <CommandGroup key={firmKey} heading={firm.name}>
                      {items.map(({ sizeKey, accountSize, value }) => (
                        <CommandItem
                          key={`${firmKey}-${sizeKey}`}
                          value={value}
                          onSelect={() => {
                            setSelectedAccountSize(sizeKey)
                            handleTemplateChange(firmKey, sizeKey)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedAccountSize === sizeKey && pendingChanges?.propfirm === firm.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{accountSize.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {accountSize.balance.toLocaleString()} - {accountSize.target}$ {t('propFirm.configurator.template.target')}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </Command>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="outline"
            onClick={() => {
              setSelectedAccountSize("")
              setPendingChanges(prev => ({
                ...prev,
                propfirm: "",
                accountSize: "",
                accountSizeName: "",
                startingBalance: 0,
                profitTarget: 0,
                drawdownThreshold: 0,
                consistencyPercentage: 30,
                trailingDrawdown: false,
                trailingStopProfit: 0,
                price: 0,
                priceWithPromo: 0,
                evaluation: false,
                minDays: 0,
                dailyLoss: 0,
                rulesDailyLoss: "No",
                trailing: "Static",
                tradingNewsAllowed: false,
                activationFees: 0,
                isRecursively: "No",
                balanceRequired: 0,
                minTradingDaysForPayout: 0,
                minPayout: 0,
                maxPayout: "",
                maxFundedAccounts: 0
              }))
            }}
          >
            {t('propFirm.configurator.template.clear')}
          </Button>
        </div>
      </div>

      <Accordion type="multiple" className="w-full">
        {/* Basic Account Info */}
        <AccordionItem value="basic-info">
          <AccordionTrigger>{t('propFirm.configurator.sections.basicInfo')}</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
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
                <Label>{t('propFirm.coherence')}</Label>
                <Input
                  type="number"
                  value={pendingChanges?.consistencyPercentage ?? account.consistencyPercentage ?? 30}
                  onChange={(e) => setPendingChanges(prev => ({
                    ...prev,
                    consistencyPercentage: parseFloat(e.target.value)
                  }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('propFirm.configurator.fields.accountType')}</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPerformance"
                    checked={pendingChanges?.isPerformance ?? account.isPerformance ?? false}
                    onCheckedChange={(checked) => setPendingChanges(prev => ({
                      ...prev,
                      isPerformance: checked
                    }))}
                  />
                  <Label htmlFor="isPerformance" className="cursor-pointer">
                    {pendingChanges?.isPerformance ?? account.isPerformance ? t('propFirm.configurator.fields.funded') : t('propFirm.configurator.fields.challenge')}
                  </Label>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Drawdown & Trading Rules */}
        <AccordionItem value="drawdown-rules">
          <AccordionTrigger>{t('propFirm.configurator.sections.drawdownRules')}</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {/* Drawdown Configuration */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.drawdown')}</Label>
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
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.drawdownType')}</Label>
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
                    <Label htmlFor="trailingDrawdown" className="cursor-pointer">{t('propFirm.configurator.fields.trailingDrawdown')}</Label>
                  </div>
                </div>

                {(pendingChanges?.trailingDrawdown ?? account.trailingDrawdown) && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.trailingStopProfit')}</Label>
                    <Input
                      type="number"
                      value={pendingChanges?.trailingStopProfit ?? account.trailingStopProfit ?? 0}
                      onChange={(e) => setPendingChanges(prev => ({
                        ...prev,
                        trailingStopProfit: parseFloat(e.target.value)
                      }))}
                      placeholder="Enter amount to lock drawdown"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.trailingType')}</Label>
                  <Select
                    value={pendingChanges?.trailing ?? account.trailing ?? 'Static'}
                    onValueChange={(value) => setPendingChanges(prev => ({
                      ...prev,
                      trailing: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trailing type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Static">{t('propFirm.configurator.trailingTypes.static')}</SelectItem>
                      <SelectItem value="EOD">{t('propFirm.configurator.trailingTypes.eod')}</SelectItem>
                      <SelectItem value="Intraday">{t('propFirm.configurator.trailingTypes.intraday')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Daily Loss Rules */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.dailyLoss')}</Label>
                  <Input
                    type="number"
                    value={pendingChanges?.dailyLoss ?? account.dailyLoss ?? 0}
                    onChange={(e) => setPendingChanges(prev => ({
                      ...prev,
                      dailyLoss: parseFloat(e.target.value)
                    }))}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.rulesDailyLoss')}</Label>
                  <Select
                    value={pendingChanges?.rulesDailyLoss ?? account.rulesDailyLoss ?? 'No'}
                    onValueChange={(value) => setPendingChanges(prev => ({
                      ...prev,
                      rulesDailyLoss: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No">{t('propFirm.configurator.rulesDailyLoss.no')}</SelectItem>
                      <SelectItem value="Lock">{t('propFirm.configurator.rulesDailyLoss.lock')}</SelectItem>
                      <SelectItem value="Violation">{t('propFirm.configurator.rulesDailyLoss.violation')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.tradingNewsAllowed')}</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="tradingNewsAllowed"
                      checked={pendingChanges?.tradingNewsAllowed ?? account.tradingNewsAllowed ?? false}
                      onCheckedChange={(checked) => setPendingChanges(prev => ({
                        ...prev,
                        tradingNewsAllowed: checked
                      }))}
                    />
                    <Label htmlFor="tradingNewsAllowed" className="cursor-pointer">{t('propFirm.configurator.fields.allowNewsTrading')}</Label>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Pricing & Payout Section */}
        <AccordionItem value="pricing-payout">
          <AccordionTrigger>{t('propFirm.configurator.sections.pricingPayout')}</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {/* Price Section */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.basePrice')}</Label>
                  <Input
                    type="number"
                    value={pendingChanges?.price ?? account.price ?? 0}
                    onChange={(e) => {
                      const newPrice = parseFloat(e.target.value);
                      setPendingChanges(prev => {
                        const promoType = prev?.promoType ?? account.promoType ?? 'direct' as const;
                        const promoPercentage = prev?.promoPercentage ?? account.promoPercentage ?? 0;
                        const priceWithPromo = promoType === 'percentage' 
                          ? newPrice * (1 - promoPercentage / 100)
                          : prev?.priceWithPromo ?? account.priceWithPromo ?? 0;
                        
                        return {
                          ...prev,
                          price: newPrice,
                          priceWithPromo
                        };
                      });
                    }}
                    placeholder="Enter base price"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.promo')}</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hasPromo"
                        checked={!!(pendingChanges?.priceWithPromo ?? account.priceWithPromo ?? 0)}
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            setPendingChanges(prev => ({
                              ...prev,
                              priceWithPromo: 0,
                              promoType: 'direct' as const,
                              promoPercentage: 0
                            }))
                          }
                        }}
                      />
                      <Label htmlFor="hasPromo" className="cursor-pointer">{t('propFirm.configurator.fields.hasPromo')}</Label>
                    </div>
                  </div>

                  {(pendingChanges?.priceWithPromo ?? account.priceWithPromo ?? 0) > 0 && (
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        <Select
                          value={pendingChanges?.promoType ?? account.promoType ?? 'direct'}
                          onValueChange={(value: 'direct' | 'percentage') => {
                            const basePrice = pendingChanges?.price ?? account.price ?? 0;
                            if (!basePrice) return;
                            
                            if (value === 'percentage') {
                              const currentPromoPrice = pendingChanges?.priceWithPromo ?? account.priceWithPromo ?? 0;
                              const percentage = ((basePrice - currentPromoPrice) / basePrice) * 100;
                              setPendingChanges(prev => ({
                                ...prev,
                                promoType: value,
                                promoPercentage: percentage
                              }))
                            } else {
                              const currentPercentage = pendingChanges?.promoPercentage ?? account.promoPercentage ?? 0;
                              const directPrice = basePrice * (1 - currentPercentage / 100);
                              setPendingChanges(prev => ({
                                ...prev,
                                promoType: value,
                                priceWithPromo: directPrice
                              }))
                            }
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t('propFirm.configurator.fields.promoType')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direct">{t('propFirm.configurator.fields.directPrice')}</SelectItem>
                            <SelectItem value="percentage">{t('propFirm.configurator.fields.percentage')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(pendingChanges?.promoType ?? account.promoType ?? 'direct') === 'direct' ? (
                        <Input
                          type="number"
                          value={pendingChanges?.priceWithPromo ?? account.priceWithPromo ?? 0}
                          onChange={(e) => setPendingChanges(prev => ({
                            ...prev,
                            priceWithPromo: parseFloat(e.target.value)
                          }))}
                          placeholder="Enter promo price"
                        />
                      ) : (
                        <Input
                          type="number"
                          value={pendingChanges?.promoPercentage ?? account.promoPercentage ?? 0}
                          onChange={(e) => {
                            const percentage = parseFloat(e.target.value);
                            const basePrice = pendingChanges?.price ?? account.price ?? 0;
                            const promoPrice = basePrice * (1 - percentage / 100);
                            setPendingChanges(prev => ({
                              ...prev,
                              promoPercentage: percentage,
                              priceWithPromo: promoPrice
                            }))
                          }}
                          placeholder="Enter discount percentage"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.activationFees')}</Label>
                  <Input
                    type="number"
                    value={pendingChanges?.activationFees ?? account.activationFees ?? 0}
                    onChange={(e) => setPendingChanges(prev => ({
                      ...prev,
                      activationFees: parseFloat(e.target.value)
                    }))}
                  />
                </div>
              </div>

              {/* Payout Section */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.balanceRequired')}</Label>
                  <Input
                    type="number"
                    value={pendingChanges?.balanceRequired ?? account.balanceRequired ?? 0}
                    onChange={(e) => setPendingChanges(prev => ({
                      ...prev,
                      balanceRequired: parseFloat(e.target.value)
                    }))}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.minTradingDays')}</Label>
                  <Input
                    type="number"
                    value={pendingChanges?.minTradingDaysForPayout ?? account.minTradingDaysForPayout ?? 0}
                    onChange={(e) => setPendingChanges(prev => ({
                      ...prev,
                      minTradingDaysForPayout: parseInt(e.target.value)
                    }))}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Reset Date Section */}
        <AccordionItem value="reset-date">
          <AccordionTrigger>{t('propFirm.configurator.sections.resetDate')}</AccordionTrigger>
          <AccordionContent>
            <div className="p-4">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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