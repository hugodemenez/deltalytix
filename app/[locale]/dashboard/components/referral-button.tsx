'use client'

import { useState, useEffect } from 'react'
import { Gift, Copy, Check, Users, Trophy, Sparkles, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useI18n } from '@/locales/client'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface ReferralData {
  referral: {
    id: string
    slug: string
    count: number
    tier: {
      level: number
      reward: string
      count: number
    }
    nextTier: {
      count: number
      reward: string
    } | null
    referredUsers: Array<{
      id: string
      email: string
    }>
  }
}

export default function ReferralButton() {
  const t = useI18n()
  const params = useParams()
  const locale = params?.locale as string || 'en'
  const [isOpen, setIsOpen] = useState(false)
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchReferralData()
    }
  }, [isOpen])

  const fetchReferralData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/referral')
      if (response.ok) {
        const data = await response.json()
        setReferralData(data.data)
      } else {
        console.error('Failed to fetch referral data')
      }
    } catch (error) {
      console.error('Error fetching referral data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyReferralCode = async () => {
    if (!referralData?.referral.slug) return

    const referralUrl = `${window.location.origin}?ref=${referralData.referral.slug}`
    
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      toast.success(t('referral.codeCopied'))
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error(t('referral.copyFailed'))
    }
  }

  const getProgressPercentage = () => {
    if (!referralData?.referral.nextTier) return 100
    const current = referralData.referral.count
    const next = referralData.referral.nextTier.count
    const previous = referralData.referral.tier.count || 0
    return ((current - previous) / (next - previous)) * 100
  }

  const getTierIcon = (level: number) => {
    if (level >= 3) return <Trophy className="h-4 w-4 text-yellow-500" />
    if (level >= 2) return <Sparkles className="h-4 w-4 text-purple-500" />
    if (level >= 1) return <Gift className="h-4 w-4 text-blue-500" />
    return <Gift className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors relative"
          aria-label={t('referral.title')}
        >
          <Gift className="h-4 w-4" />
          {referralData && referralData.referral.count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {referralData.referral.count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : referralData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">{t('referral.title')}</h4>
              {getTierIcon(referralData.referral.tier.level)}
            </div>

            {/* How It Works Link */}
            <Link 
              href={`/${locale}/referral`}
              className="text-sm text-primary hover:underline flex items-center gap-1 w-fit"
              onClick={() => setIsOpen(false)}
            >
              <ExternalLink className="h-3 w-3" />
              {t('referral.howItWorks')}
            </Link>

            <Separator />

            {/* Referral Link */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('referral.yourLink')}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}?ref=${referralData.referral.slug}` : referralData.referral.slug}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyReferralCode}
                  className="h-9 shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Current Tier */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('referral.currentTier')}</span>
                <Badge variant="secondary">
                  {t('referral.tier', { level: referralData.referral.tier.level })}
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('referral.referrals')}</span>
                  <span className="font-medium">{referralData.referral.count}</span>
                </div>
                
                {/* Progress Bar with All Tiers */}
                <div className="relative">
                  <Progress 
                    value={Math.min((referralData.referral.count / 5) * 100, 100)} 
                    className="h-3"
                  />
                  {/* Tier Markers */}
                  <div className="absolute inset-0 flex items-center px-1">
                    {[1, 3, 5].map((tierCount, index) => {
                      const isCompleted = referralData.referral.count >= tierCount
                      const previousTier = index > 0 ? [1, 3, 5][index - 1] : 0
                      const isCurrent = referralData.referral.count < tierCount && referralData.referral.count >= previousTier
                      // Position markers: 0% (1), 50% (3), 100% (5)
                      const position = index === 0 ? 0 : index === 1 ? 50 : 100
                      return (
                        <div
                          key={tierCount}
                          className={`absolute flex flex-col items-center transform -translate-x-1/2 ${
                            isCompleted ? 'z-10' : ''
                          }`}
                          style={{ left: `${position}%` }}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isCompleted
                                ? 'bg-primary border-primary text-primary-foreground'
                                : isCurrent
                                ? 'bg-primary/20 border-primary'
                                : 'bg-background border-muted-foreground'
                            }`}
                          >
                            {isCompleted && (
                              <Check className="h-2.5 w-2.5" />
                            )}
                          </div>
                          <div className="absolute top-5 whitespace-nowrap">
                            <div className={`text-xs font-medium ${
                              isCompleted ? 'text-primary' : 'text-muted-foreground'
                            }`}>
                              {tierCount}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* Tier Rewards */}
                <div className="space-y-2 pt-4">
                  {[
                    { count: 1, reward: t('referral.landing.tier1Reward') },
                    { count: 3, reward: t('referral.landing.tier2Reward') },
                    { count: 5, reward: t('referral.landing.tier3Reward') },
                  ].map((tier) => {
                    const isCompleted = referralData.referral.count >= tier.count
                    return (
                      <div
                        key={tier.count}
                        className={`flex items-center justify-between text-xs p-2 rounded-md transition-colors ${
                          isCompleted
                            ? 'bg-primary/10 border border-primary/20'
                            : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                          )}
                          <span className={isCompleted ? 'font-medium' : 'text-muted-foreground'}>
                            {tier.count} {tier.count === 1 ? t('referral.referral') : t('referral.referrals')} - {tier.reward}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <Separator />

            {/* Referred Users */}
            {referralData.referral.referredUsers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t('referral.referredUsers')} ({referralData.referral.referredUsers.length})
                  </span>
                </div>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {referralData.referral.referredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center text-sm p-2 rounded-md bg-muted/50"
                      >
                        <span className="truncate">{user.email}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {referralData.referral.referredUsers.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                {t('referral.noReferralsYet')}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {t('referral.loadError')}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

