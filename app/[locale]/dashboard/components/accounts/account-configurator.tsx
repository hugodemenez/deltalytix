'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, X, Trash2, Check, ChevronsUpDown, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format, Locale } from "date-fns"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useParams } from 'next/navigation'
import { enUS, fr } from 'date-fns/locale'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { propFirms } from './config'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Account } from '@/context/data-provider'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"

interface AccountConfiguratorProps {
  account: Account
  pendingChanges: Partial<Account> | null
  setPendingChanges: (changes: Partial<Account> | null) => void
  isSaving: boolean,

}

const localeMap: { [key: string]: Locale } = {
  en: enUS,
  fr: fr
}

export function AccountConfigurator({ 
  account, 
  pendingChanges,
  setPendingChanges,
  isSaving
}: AccountConfiguratorProps) {
  const t = useI18n()
  const params = useParams()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [paymentCalendarOpen, setPaymentCalendarOpen] = useState(false)
  const [selectedAccountSize, setSelectedAccountSize] = useState<string>("")
  const [accountSizeOpen, setAccountSizeOpen] = useState(false)

  const handleTemplateChange = (firmKey: string, sizeKey: string) => {
    const firm = propFirms[firmKey]
    const accountSize = firm.accountSizes[sizeKey]
    
    if (!firm || !accountSize) {
      console.error('Template not found:', firmKey, sizeKey)
      return
    }

    const newChanges: Partial<Account> = {
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
      minTradingDaysForPayout: accountSize.minTradingDaysForPayout ?? 0,
      minPnlToCountAsDay: accountSize.minPnlToCountAsDay ?? 0
    }

    setPendingChanges(newChanges)
  }

  const handleInputChange = (field: keyof Account, value: any) => {
    const newChanges: Partial<Account> = {
      ...pendingChanges,
      [field]: value
    }
    setPendingChanges(newChanges)
  }

  const isSaveDisabled = !pendingChanges || 
    Object.keys(pendingChanges).length === 0 || 
    (pendingChanges?.startingBalance !== undefined && pendingChanges?.startingBalance <= 0) ||
    (pendingChanges?.profitTarget !== undefined && pendingChanges?.profitTarget <= 0) ||
    (pendingChanges?.drawdownThreshold !== undefined && pendingChanges?.drawdownThreshold <= 0) ||
    (typeof pendingChanges?.consistencyPercentage === 'number' && pendingChanges.consistencyPercentage < 0) ||
    (pendingChanges?.trailingDrawdown && typeof pendingChanges?.trailingStopProfit === 'number' && pendingChanges.trailingStopProfit <= 0) ||
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
        
        <div className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent>
              {Object.entries(propFirms).map(([firmKey, firm]) => (
                <CarouselItem key={firmKey} className="basis-1/2 xl:basis-1/5">
                  <Popover modal>
                    <PopoverTrigger asChild>
                      <Card className="cursor-pointer hover:bg-muted/50 transition-colors basis-1/2 xl:basis-1/5">
                        <CardHeader>
                          <CardTitle className='whitespace-nowrap text-sm'>{firm.name}</CardTitle>
                        </CardHeader>
                      </Card>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-4 max-h-[400px] overflow-y-auto">
                      <div className="space-y-4">
                        {Object.entries(firm.accountSizes).map(([sizeKey, accountSize]) => (
                          <div
                            key={`${firmKey}-${sizeKey}`}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              setSelectedAccountSize(sizeKey)
                              handleTemplateChange(firmKey, sizeKey)
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{accountSize.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {accountSize.balance.toLocaleString()} - {accountSize.target}$ {t('propFirm.configurator.template.target')}
                              </span>
                            </div>
                            <Check
                              className={cn(
                                "h-4 w-4",
                                selectedAccountSize === sizeKey && pendingChanges?.propfirm === firm.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0" />
            <CarouselNext className="right-0" />
          </Carousel>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSelectedAccountSize("")
              const clearedChanges: Partial<Account> = {
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
                maxFundedAccounts: 0,
                minPnlToCountAsDay: 0
              }
              setPendingChanges(clearedChanges)
            }}
          >
            {t('propFirm.configurator.template.clear')}
          </Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["basic-info"]} className="w-full">
        {/* Basic Account Info */}
        <AccordionItem value="basic-info">
          <AccordionTrigger>{t('propFirm.configurator.sections.basicInfo')}</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
              <div className="flex flex-col gap-2">
                <Label>{t('propFirm.configurator.fields.propfirmName')}</Label>
                <Input
                  value={pendingChanges?.propfirm ?? account.propfirm ?? ''}
                  onChange={(e) => handleInputChange('propfirm', e.target.value)}
                  placeholder={t('propFirm.configurator.fields.propfirmName')}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('propFirm.accountSize')}</Label>
                <Popover modal open={accountSizeOpen} onOpenChange={setAccountSizeOpen}>
                  <PopoverTrigger asChild>
                    <Input
                      type="number"
                      value={pendingChanges?.startingBalance ?? account.startingBalance ?? ''}
                      onChange={(e) => handleInputChange('startingBalance', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid grid-cols-2 gap-2">
                      {[0,25000, 50000, 100000, 150000, 300000].map((size) => (
                        <Button
                          key={size}
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            handleInputChange('startingBalance', size)
                            setAccountSizeOpen(false)
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
                  value={pendingChanges?.profitTarget ?? account.profitTarget ?? ''}
                  onChange={(e) => handleInputChange('profitTarget', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('propFirm.coherence')}</Label>
                <Input
                  type="number"
                  value={pendingChanges?.consistencyPercentage ?? account.consistencyPercentage ?? ''}
                  onChange={(e) => handleInputChange('consistencyPercentage', e.target.value === '' ? 30 : parseFloat(e.target.value) || 30)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('propFirm.configurator.fields.accountType')}</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPerformance"
                    checked={pendingChanges?.isPerformance ?? account.isPerformance ?? false}
                    onCheckedChange={(checked) => handleInputChange('isPerformance', checked)}
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
                    value={pendingChanges?.drawdownThreshold ?? account.drawdownThreshold ?? ''}
                    onChange={(e) => handleInputChange('drawdownThreshold', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.drawdownType')}</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="trailingDrawdown"
                      checked={pendingChanges?.trailingDrawdown ?? account.trailingDrawdown ?? false}
                      onCheckedChange={(checked) => handleInputChange('trailingDrawdown', checked)}
                    />
                    <Label htmlFor="trailingDrawdown" className="cursor-pointer">{t('propFirm.configurator.fields.trailingDrawdown')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>{t('propFirm.configurator.tooltips.trailingDrawdown')}</p>
                        </TooltipContent>
                      </Tooltip>
                  </div>
                </div>

                {(pendingChanges?.trailingDrawdown ?? account.trailingDrawdown) && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.trailingStopProfit')}</Label>
                    <p className="text-xs text-muted-foreground">{t('propFirm.configurator.tooltips.trailingStopProfit')}</p>
                    <Input
                      type="number"
                      value={pendingChanges?.trailingStopProfit ?? account.trailingStopProfit ?? ''}
                      onChange={(e) => handleInputChange('trailingStopProfit', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                      placeholder={t('propFirm.configurator.placeholders.enterAmountToLockDrawdown')}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.trailingType')}</Label>
                  <Select
                    value={pendingChanges?.trailing ?? account.trailing ?? 'EOD'}
                    onValueChange={(value) => handleInputChange('trailing', value as 'EOD' | 'Intraday')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('propFirm.configurator.placeholders.selectTrailingType')} />
                    </SelectTrigger>
                    <SelectContent>
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
                    value={pendingChanges?.dailyLoss ?? account.dailyLoss ?? ''}
                    onChange={(e) => handleInputChange('dailyLoss', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.minPnlToCountAsDay')}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>{t('propFirm.configurator.tooltips.minPnlToCountAsDay')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={pendingChanges?.minPnlToCountAsDay ?? account.minPnlToCountAsDay ?? ''}
                    onChange={(e) => handleInputChange('minPnlToCountAsDay', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.tradingNewsAllowed')}</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="tradingNewsAllowed"
                      checked={pendingChanges?.tradingNewsAllowed ?? account.tradingNewsAllowed ?? false}
                      onCheckedChange={(checked) => handleInputChange('tradingNewsAllowed', checked)}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
              {/* Price Section */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.price')}</Label>
                  <Input
                    type="number"
                    value={pendingChanges?.price ?? account.price ?? ''}
                    onChange={(e) => handleInputChange('price', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    placeholder={t('propFirm.configurator.placeholders.enterPrice')}
                  />
                </div>
              </div>

              {/* Payment & Renewal Section */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.nextPaymentDate')}</Label>
                  <Dialog open={paymentCalendarOpen} onOpenChange={setPaymentCalendarOpen}>
                    <DialogTrigger asChild>
                      <div className="relative w-full">
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal pr-10",
                            !pendingChanges?.nextPaymentDate && !account.nextPaymentDate && "text-muted-foreground"
                          )}
                        >
                                                  <CalendarIcon className="mr-2 h-4 w-4" />
                        {(pendingChanges && 'nextPaymentDate' in pendingChanges) ? (
                          pendingChanges.nextPaymentDate ? (
                            format(pendingChanges.nextPaymentDate, 'PPP', { locale: localeMap[params.locale as string] })
                          ) : (
                            <span>{t('propFirm.configurator.placeholders.noPaymentDateSet')}</span>
                          )
                        ) : (
                          account.nextPaymentDate ? (
                            format(account.nextPaymentDate, 'PPP', { locale: localeMap[params.locale as string] })
                          ) : (
                            <span>{t('propFirm.configurator.placeholders.noPaymentDateSet')}</span>
                          )
                        )}
                        </Button>
                        {((pendingChanges && 'nextPaymentDate' in pendingChanges) ? pendingChanges.nextPaymentDate : account.nextPaymentDate) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full hover:bg-transparent"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleInputChange('nextPaymentDate', undefined);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>{t('propFirm.configurator.fields.nextPaymentDate')}</DialogTitle>
                        <DialogDescription>
                          Select the next payment date for this account. This will automatically update based on your payment frequency after each renewal notice.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-6">
                        <Calendar
                          mode="single"
                          numberOfMonths={2}
                          showOutsideDays={true}
                          fixedWeeks={true}
                          selected={pendingChanges?.nextPaymentDate || account.nextPaymentDate || undefined}
                          onSelect={(date) => {
                            handleInputChange('nextPaymentDate', date || undefined);
                            setPaymentCalendarOpen(false);
                          }}
                          initialFocus
                          locale={localeMap[params.locale as string]}
                          className="mx-auto"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                  {(pendingChanges?.paymentFrequency || account.paymentFrequency) && 
                   (pendingChanges?.paymentFrequency || account.paymentFrequency) !== 'CUSTOM' && (
                    <p className="text-xs text-muted-foreground">
                      {t('propFirm.configurator.fields.autoAdvanceInfo', { 
                        frequency: (pendingChanges?.paymentFrequency || account.paymentFrequency)?.toLowerCase() || 'monthly'
                      })}
                    </p>
                  )}
                  {(pendingChanges?.paymentFrequency || account.paymentFrequency) === 'CUSTOM' && (
                    <p className="text-xs text-orange-600">
                      {t('propFirm.configurator.fields.customFrequencyWarning')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.paymentFrequency')}</Label>
                  <Select
                    value={pendingChanges?.paymentFrequency ?? account.paymentFrequency ?? 'MONTHLY'}
                    onValueChange={(value) => handleInputChange('paymentFrequency', value as 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL' | 'CUSTOM')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('propFirm.configurator.placeholders.selectPaymentFrequency')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">{t('propFirm.configurator.paymentFrequencies.monthly')}</SelectItem>
                      <SelectItem value="QUARTERLY">{t('propFirm.configurator.paymentFrequencies.quarterly')}</SelectItem>
                      <SelectItem value="BIANNUAL">{t('propFirm.configurator.paymentFrequencies.biannual')}</SelectItem>
                      <SelectItem value="ANNUAL">{t('propFirm.configurator.paymentFrequencies.annual')}</SelectItem>
                      <SelectItem value="CUSTOM">{t('propFirm.configurator.paymentFrequencies.custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.renewalNotification')}</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="renewalNotification"
                      checked={pendingChanges?.autoRenewal ?? account.autoRenewal ?? false}
                      onCheckedChange={(checked) => {
                        // Combine both updates into a single state change
                        const newChanges: Partial<Account> = {
                          ...pendingChanges,
                          autoRenewal: checked,
                          ...(checked && { renewalNotice: 3 })
                        }
                        setPendingChanges(newChanges)
                      }}
                    />
                    <Label htmlFor="renewalNotification" className="cursor-pointer">{t('propFirm.configurator.fields.enableRenewalNotification')}</Label>
                  </div>
                  {(pendingChanges?.autoRenewal ?? account.autoRenewal) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('propFirm.configurator.fields.renewalNoticeInfo')}
                    </p>
                  )}
                </div>
              </div>

              {/* Payout Section */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-muted-foreground">{t('propFirm.configurator.fields.minTradingDays')}</Label>
                  <Input
                    type="number"
                    value={pendingChanges?.minTradingDaysForPayout ?? account.minTradingDaysForPayout ?? ''}
                    onChange={(e) => handleInputChange('minTradingDaysForPayout', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
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
                      {(pendingChanges && 'resetDate' in pendingChanges) ? (
                        pendingChanges.resetDate ? (
                          format(pendingChanges.resetDate, 'PPP', { locale: localeMap[params.locale as string] })
                        ) : (
                          <span>{t('propFirm.resetDate.noDate')}</span>
                        )
                      ) : (
                        account.resetDate ? (
                          format(account.resetDate, 'PPP', { locale: localeMap[params.locale as string] })
                        ) : (
                          <span>{t('propFirm.resetDate.noDate')}</span>
                        )
                      )}
                    </Button>
                                          {((pendingChanges && 'resetDate' in pendingChanges) ? pendingChanges.resetDate : account.resetDate) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full hover:bg-transparent"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleInputChange('resetDate', undefined);
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
                        handleInputChange('resetDate', date || undefined);
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
    </div>
  )
}