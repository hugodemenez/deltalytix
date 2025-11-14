'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Gift, Users, Trophy, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { useI18n } from "@/locales/client"

export default function ReferralPage() {
  const t = useI18n()

  const tiers = [
    { count: 1, reward: t('referral.landing.tier1Reward'), icon: <Gift className="w-5 h-5 text-blue-500" /> },
    { count: 3, reward: t('referral.landing.tier2Reward'), icon: <Sparkles className="w-5 h-5 text-purple-500" /> },
    { count: 5, reward: t('referral.landing.tier3Reward'), icon: <Trophy className="w-5 h-5 text-yellow-500" /> },
  ]

  const requirements = [
    {
      title: t('referral.landing.requirement1Title'),
      description: t('referral.landing.requirement1Description'),
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    },
    {
      title: t('referral.landing.requirement2Title'),
      description: t('referral.landing.requirement2Description'),
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
    },
  ]

  return (
    <div className="px-4 py-12 bg-background text-foreground">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('referral.landing.title')}</h1>
          <p className="text-xl text-muted-foreground">
            {t('referral.landing.subtitle')}
          </p>
        </div>

        {/* How It Works Section */}
        <Card className="mb-8 bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">{t('referral.landing.howItWorks')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('referral.landing.step1Title')}</h3>
                  <p className="text-muted-foreground">{t('referral.landing.step1Description')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('referral.landing.step2Title')}</h3>
                  <p className="text-muted-foreground">{t('referral.landing.step2Description')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('referral.landing.step3Title')}</h3>
                  <p className="text-muted-foreground">{t('referral.landing.step3Description')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements Section */}
        <Card className="mb-8 bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">{t('referral.landing.requirements')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              {t('referral.landing.requirementsDescription')}
            </p>
            <div className="space-y-4">
              {requirements.map((req, index) => (
                <div key={index} className="flex gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0 mt-0.5">
                    {req.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{req.title}</h3>
                    <p className="text-sm text-muted-foreground">{req.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rewards Tiers Section */}
        <Card className="mb-8 bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">{t('referral.landing.rewards')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className="p-6 rounded-lg border-2 border-border bg-muted/30 flex flex-col items-center text-center"
                >
                  <div className="mb-4">{tier.icon}</div>
                  <Badge variant="secondary" className="mb-3">
                    {t('referral.landing.tierBadge', { count: tier.count })}
                  </Badge>
                  <p className="text-sm text-muted-foreground">{tier.reward}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">{t('referral.landing.importantNotes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 list-disc list-inside text-muted-foreground">
              <li>{t('referral.landing.note1')}</li>
              <li>{t('referral.landing.note2')}</li>
              <li>{t('referral.landing.note3')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

