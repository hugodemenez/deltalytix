'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, AlertCircle, CheckCircle2, CalendarDays, Clock, CreditCard, History, Receipt, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getSubscriptionData, updateSubscription, type SubscriptionWithPrice } from "../actions/billing"
import { useToast } from "@/hooks/use-toast"
import { useI18n, useCurrentLocale } from "@/locales/client"
import PricingPlans from "../../(landing)/components/pricing-plans"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useUserData } from "@/components/context/user-data"

type BillingPeriod = "yearly" | "monthly"

type SubscriptionStatus = 
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "paused"
  | "trialing"
  | "unpaid"

// Add helper function for safe date formatting
function formatStripeDate(
  timestamp: number | null | undefined, 
  locale: string, 
  t: ReturnType<typeof useI18n>,
  options: Intl.DateTimeFormatOptions = { 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  }
): string {
  if (!timestamp) return t('billing.notApplicable')
  // Stripe timestamps are in seconds, JavaScript needs milliseconds
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString(locale, options)
}

interface PlanPrice {
  yearly: number
  monthly: number
}

interface Plan {
  name: string
  description: string
  price: PlanPrice
  features: string[]
  isPopular?: boolean
  isComingSoon?: boolean
}

type Plans = {
  [key: string]: Plan
}

export default function BillingManagement() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly")
  const [subscription, setSubscription] = useState<SubscriptionWithPrice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const t = useI18n()
  const locale = useCurrentLocale()
  const { timezone } = useUserData()

  const plans: Plans = {
    basic: {
      name: t('pricing.basic.name'),
      description: t('pricing.basic.description'),
      price: { yearly: 0, monthly: 0 },
      features: [
        t('pricing.basic.feature1'),
        t('pricing.basic.feature2'),
      ]
    },
    plus: {
      name: t('pricing.plus.name'),
      description: t('pricing.plus.description'),
      price: { 
        yearly: 300,
        monthly: 29.99
      },
      isPopular: true,
      features: [
        t('pricing.plus.feature1'),
        t('pricing.plus.feature2'),
        t('pricing.plus.feature4'),
      ]
    },
    pro: {
      name: t('pricing.pro.name'),
      description: t('pricing.pro.description'),
      price: { 
        yearly: 1000,
        monthly: 99.99
      },
      isComingSoon: true,
      features: [
        t('pricing.pro.feature1'),
        t('pricing.pro.feature2'),
        t('pricing.pro.feature3'),
      ]
    }
  }

  useEffect(() => {
    async function loadSubscription() {
      const data = await getSubscriptionData()
      setSubscription(data)
      setIsLoading(false)
    }
    loadSubscription()
  }, [])

  const currentPlan = subscription?.plan?.name?.toLowerCase().includes('pro') 
    ? 'pro' 
    : subscription?.plan?.name?.toLowerCase().includes('plus')
      ? 'plus'
      : 'basic'

  const handleChangeBillingPeriod = (newPeriod: BillingPeriod) => {
    setBillingPeriod(newPeriod)
  }

  const handleSubscriptionAction = async (action: 'pause' | 'resume' | 'cancel') => {
    if (!subscription?.id) return

    try {
      const result = await updateSubscription(action, subscription.id)
      
      if (result.success) {
        // Refresh subscription data
        const updatedData = await getSubscriptionData()
        setSubscription(updatedData)
        
        toast({
          title: "Success",
          description: `Successfully ${action}ed your subscription`,
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} subscription. Please try again.`,
        variant: "destructive",
      })
    }
  }

  function formatPrice(plan: Plan) {
    if (plan.price.yearly === 0) {
      return t('pricing.free')
    }

    const priceDisplay = (
      <>
        €{billingPeriod === 'monthly' ? plan.price.monthly : (plan.price.yearly / 12).toFixed(2)}
        <span className="text-lg font-normal text-gray-500">
          /{t('pricing.month')}
        </span>
        {billingPeriod === 'yearly' && (
          <div className="text-sm font-normal text-gray-500 mt-1">
            {t('pricing.billedYearly', {
              total: plan.price.yearly.toString()
            })}
          </div>
        )}
      </>
    )

    return priceDisplay
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0">
            <CardTitle>{t('billing.currentPlan')}</CardTitle>
            <CardDescription className="mt-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-[100px]" /> {/* Plan name */}
                <span className="text-muted-foreground">•</span>
                <Skeleton className="h-4 w-[60px]" /> {/* Status */}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="rounded-lg border bg-card p-6 space-y-6">
              {/* Current Plan Details */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-[100px]" /> {/* Price */}
                  <Skeleton className="h-4 w-[140px]" /> {/* Billing interval */}
                </div>
              </div>

              {/* Subscription Timeline */}
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <History className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Active Since</p>
                      <Skeleton className="h-4 w-[120px] mt-1" />
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Current Period</p>
                      <Skeleton className="h-4 w-[200px] mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Management */}
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0">
            <CardTitle>{t('billing.manageSubscription')}</CardTitle>
            <CardDescription>{t('billing.manageSubscriptionDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-10 w-[150px]" /> {/* Action button */}
            </div>
          </CardContent>
        </Card>

        {/* Available Plans */}
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0">
            <CardTitle>{t('billing.availablePlans')}</CardTitle>
            <CardDescription>{t('billing.choosePlan')}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <PricingPlans />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <CardTitle>{t('billing.currentPlan')}</CardTitle>
          <CardDescription className="mt-1.5">
            {subscription?.plan?.name || t('pricing.basic.name')} • {subscription?.status === 'active' 
              ? <span className="text-green-500 dark:text-green-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('billing.status.active')}
                </span>
              : subscription?.cancel_at_period_end 
                ? <span className="text-yellow-500 dark:text-yellow-400 inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {t('billing.scheduledToCancel')}
                  </span>
                : <span className="text-gray-500 dark:text-gray-400">
                    {subscription?.status ? t(`billing.status.${subscription.status as SubscriptionStatus}`) : t('billing.notApplicable')}
                  </span>
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="rounded-lg border bg-card p-6 space-y-6">
            {/* Current Plan Details */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                {subscription?.promotion ? (
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <span className="text-muted-foreground line-through">
                        €{(subscription.plan.amount / 100).toFixed(2)}
                      </span>
                      <span>
                        €{((subscription.plan.amount - (subscription.promotion.amount_off || (subscription.promotion.percent_off ? subscription.plan.amount * subscription.promotion.percent_off / 100 : 0))) / 100).toFixed(2)}
                        /{subscription.plan.interval}
                      </span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        {subscription.promotion.percent_off 
                          ? `${subscription.promotion.percent_off}% OFF`
                          : `€${(subscription.promotion.amount_off / 100).toFixed(2)} OFF`}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {t('billing.promotionCode', { code: subscription.promotion.code })}
                        {subscription.promotion.duration.duration === 'forever' && (
                          <span className="ml-1">({t('billing.promotionDuration.forever')})</span>
                        )}
                        {subscription.promotion.duration.duration === 'once' && (
                          <span className="ml-1">({t('billing.promotionDuration.once')})</span>
                        )}
                        {subscription.promotion.duration.duration === 'repeating' && subscription.promotion.duration.duration_in_months && (
                          <span className="ml-1">({t('billing.promotionDuration.repeating', { months: subscription.promotion.duration.duration_in_months })})</span>
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold">
                    {subscription?.plan?.amount 
                      ? `€${(subscription.plan.amount / 100).toFixed(2)}/${subscription.plan.interval}`
                      : t('pricing.free')}
                  </h2>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription?.plan?.interval === 'year' 
                    ? t('pricing.currentlyYearly') 
                    : t('pricing.currentlyMonthly')}
                </p>
              </div>
              {subscription?.trial_end && new Date(subscription.trial_end * 1000) > new Date() && (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-md text-sm">
                  {t('billing.trialEndsIn', {
                    date: formatStripeDate(subscription.trial_end, locale, t, { 
                      month: 'long', 
                      day: 'numeric'
                    })
                  })}
                </div>
              )}
            </div>

            {/* Subscription Timeline */}
            {subscription && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <History className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{t('billing.dates.activeSince', { 
                        date: formatStripeDate(subscription.created, locale, t) 
                      })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{t('billing.dates.currentPeriod', {
                        startDate: formatStripeDate(subscription.current_period_start, locale, t, { 
                          month: 'long', 
                          day: 'numeric'
                        }),
                        endDate: formatStripeDate(subscription.current_period_end, locale, t, { 
                          month: 'long', 
                          day: 'numeric'
                        })
                      })}</p>
                    </div>
                  </div>
                  {subscription.trial_start && subscription.trial_end && (
                    <div className="flex items-start gap-2">
                      <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Trial Period</p>
                        <p className="text-sm text-muted-foreground">
                          {formatStripeDate(subscription.trial_start, locale, t, { 
                            month: 'long', 
                            day: 'numeric'
                          })} - {formatStripeDate(subscription.trial_end, locale, t, { 
                            month: 'long', 
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {subscription.cancel_at && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive">Cancellation Date</p>
                        <p className="text-sm text-destructive/80">
                          {formatStripeDate(subscription.cancel_at, locale, t)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Management */}
      {(subscription?.status === 'active' || subscription?.status === 'trialing') && (
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0">
            <CardTitle>{t('billing.manageSubscription')}</CardTitle>
            <CardDescription>{t('billing.manageSubscriptionDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="flex flex-col gap-4">
              {!subscription.cancel_at_period_end && (
                <div className="flex flex-wrap gap-4">
                  <Button 
                    onClick={() => handleSubscriptionAction('pause')} 
                    variant="outline" 
                    className="sm:w-auto"
                  >
                    {t('billing.pauseSubscription')}
                  </Button>
                  <Button 
                    onClick={() => handleSubscriptionAction('cancel')} 
                    variant="destructive" 
                    className="sm:w-auto"
                  >
                    {t('billing.cancelSubscription')}
                  </Button>
                </div>
              )}
              {subscription.cancel_at_period_end && (
                <Button 
                  onClick={() => handleSubscriptionAction('resume')} 
                  className="sm:w-auto"
                >
                  {t('billing.resumeSubscription')}
                </Button>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button
                  variant="outline"
                  className="sm:w-auto"
                  asChild
                >
                  <Link href={process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL || ""}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t('billing.managePaymentMethod')}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <CardTitle>{t('billing.paymentHistory')}</CardTitle>
          <CardDescription>{t('billing.paymentHistoryDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="rounded-lg border bg-card">
            {subscription?.invoices && subscription.invoices.length > 0 ? (
              <div className="divide-y">
                {subscription.invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        €{(invoice.amount_paid / 100).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatStripeDate(invoice.created, locale, t)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {invoice.status === 'paid' && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          {t('billing.paymentStatus.succeeded')}
                        </Badge>
                      )}
                      <div className="flex items-center gap-2">
                        {invoice.hosted_invoice_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => invoice.hosted_invoice_url && window.open(invoice.hosted_invoice_url, '_blank')}
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            {t('billing.viewInvoice')}
                          </Button>
                        )}
                        {invoice.invoice_pdf && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => invoice.invoice_pdf && window.open(invoice.invoice_pdf, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {t('billing.downloadPdf')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t('billing.noPaymentHistory')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <CardTitle>{t('billing.availablePlans')}</CardTitle>
          <CardDescription>{t('billing.choosePlan')}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <PricingPlans />
        </CardContent>
      </Card>
    </div>
  )
} 