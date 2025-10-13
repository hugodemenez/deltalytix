'use client'

import React, { useEffect } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from '@/locales/client'
import { getCalApi } from "@calcom/embed-react"
import { 
  Users, 
  BarChart3, 
  Shield, 
  Zap, 
  TrendingUp, 
  Clock, 
  FileText, 
  Code,
  CheckCircle,
  Star,
  ArrowRight,
  Building2,
  Target,
  Globe,
  Headphones,
  Calendar,
  CheckCircle2,
  Clock3,
  Play,
  ChevronRight
} from 'lucide-react'
import { useTheme } from '@/context/theme-provider'
import Footer from '../(landing)/components/footer'
import Image from 'next/image'

export default function BusinessPage() {
  const t = useI18n()

  useEffect(() => {
    // Cal.com initialization
    (async function () {
      const cal = await getCalApi({"namespace":"deltalytix-business"});
      cal("ui", {"hideEventTypeDetails":false,"layout":"month_view"});
    })();
  }, [])

  const features = [
    {
      icon: Users,
      title: t('business.features.multiAccount.title'),
      description: t('business.features.multiAccount.description'),
    },
    {
      icon: BarChart3,
      title: t('business.features.teamAnalytics.title'),
      description: t('business.features.teamAnalytics.description'),
    },
    {
      icon: Clock,
      title: t('business.features.realTime.title'),
      description: t('business.features.realTime.description'),
    },
    {
      icon: Shield,
      title: t('business.features.riskManagement.title'),
      description: t('business.features.riskManagement.description'),
    },
    {
      icon: FileText,
      title: t('business.features.compliance.title'),
      description: t('business.features.compliance.description'),
    },
    {
      icon: Code,
      title: t('business.features.api.title'),
      description: t('business.features.api.description'),
    },
  ]

  const useCases = [
    {
      icon: Building2,
      title: t('business.usecases.fund.title'),
      description: t('business.usecases.fund.description'),
    },
    {
      icon: Target,
      title: t('business.usecases.prop.title'),
      description: t('business.usecases.prop.description'),
    },
    {
      icon: Users,
      title: t('business.usecases.family.title'),
      description: t('business.usecases.family.description'),
    },
    {
      icon: Globe,
      title: t('business.usecases.institutional.title'),
      description: t('business.usecases.institutional.description'),
    },
  ]

  const testimonials = [
    {
      quote: t('business.testimonials.quote1'),
      author: t('business.testimonials.author1'),
      role: t('business.testimonials.role1'),
    },
    {
      quote: t('business.testimonials.quote2'),
      author: t('business.testimonials.author2'),
      role: t('business.testimonials.role2'),
    },
    {
      quote: t('business.testimonials.quote3'),
      author: t('business.testimonials.author3'),
      role: t('business.testimonials.role3'),
    },
  ]

  const stats = [
    { value: '500+', label: t('business.stats.traders') },
    { value: '2,000+', label: t('business.stats.accounts') },
    { value: '50+', label: t('business.stats.brokers') },
  ]

  const roadmap = [
    {
      quarter: t('business.roadmap.q1.title'),
      description: t('business.roadmap.q1.description'),
      features: [
        'Multi-account dashboard',
        'Team analytics',
        'Basic reporting',
        'API foundation'
      ],
      status: 'completed',
      icon: CheckCircle2,
    },
    {
      quarter: t('business.roadmap.q2.title'),
      description: t('business.roadmap.q2.description'),
      features: [
        'Real-time monitoring',
        'Risk management tools',
        'Compliance reporting',
        'Advanced team analytics'
      ],
      status: 'inProgress',
      icon: Clock3,
    },
    {
      quarter: t('business.roadmap.q3.title'),
      description: t('business.roadmap.q3.description'),
      features: [
        'Enterprise API',
        'Custom integrations',
        'Advanced security'
      ],
      status: 'coming',
      icon: Play,
    },
    {
      quarter: t('business.roadmap.q4.title'),
      description: t('business.roadmap.q4.description'),
      features: [
        'Complete enterprise suite',
        'Dedicated support',
        'Custom onboarding',
        'Enterprise pricing'
      ],
      status: 'coming',
      icon: Calendar,
    },
  ]

  return (
    <div className="flex flex-col min-h-dvh text-gray-900 dark:text-white transition-colors duration-300">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 pt-6 pb-16 sm:pb-20 lg:flex lg:px-8 lg:py-20">
            <div className="mx-auto max-w-2xl lg:mx-0 lg:shrink-0 lg:pt-4">
              <div className="mt-8 sm:mt-12 lg:mt-8">
                <a href="#" className="inline-flex space-x-6">
                  <span className="rounded-full bg-[#2E9987]/10 dark:bg-[hsl(var(--chart-1))]/10 px-3 py-1 text-sm/6 font-semibold text-[#2E9987] dark:text-[hsl(var(--chart-1))] ring-1 ring-[#2E9987]/10 dark:ring-[hsl(var(--chart-1))]/10 ring-inset">
                    {t('business.badge')}
                  </span>
                  <span className="inline-flex items-center space-x-2 text-sm/6 font-medium text-gray-600 dark:text-gray-400">
                    <span>{t('business.badge.description')}</span>
                    <ChevronRight aria-hidden="true" className="size-5 text-gray-400" />
                  </span>
                </a>
              </div>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-pretty text-gray-900 dark:text-white sm:text-7xl">
                {t('business.hero.title')}
              </h1>
              <p className="mt-6 text-lg font-medium text-pretty text-gray-500 dark:text-gray-400 sm:text-xl/8">
                {t('business.hero.description')}
              </p>
              <div className="mt-8 flex items-center gap-x-6">
                <Link href="/authentication?next=business/dashboard" className="flex justify-center items-center px-8 py-2.5 h-10 bg-[#2E9987] hover:bg-[#267a6d] dark:bg-[hsl(var(--chart-1))] dark:hover:bg-[hsl(var(--chart-1)/0.9)] shadow-[0_0_0_6px_rgba(50,169,151,0.1),0_0_0_2px_rgba(50,169,151,0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_0_0_6px_rgba(50,169,151,0.2),0_0_0_2px_rgba(50,169,151,0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] dark:shadow-[0_0_0_6px_hsl(var(--chart-1)/0.1),0_0_0_2px_hsl(var(--chart-1)/0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_0_6px_hsl(var(--chart-1)/0.2),0_0_0_2px_hsl(var(--chart-1)/0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] rounded-xl transition-all duration-200">
                  <span className="font-medium text-sm text-white">{t('business.cta')}</span>
                </Link>
                <button 
                  className="flex justify-center items-center px-8 py-2.5 h-10 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-[0_0_0_6px_rgba(107,114,128,0.1),0_0_0_2px_rgba(107,114,128,0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_0_0_6px_rgba(107,114,128,0.2),0_0_0_2px_rgba(107,114,128,0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] dark:shadow-[0_0_0_6px_rgba(156,163,175,0.1),0_0_0_2px_rgba(156,163,175,0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_0_6px_rgba(156,163,175,0.2),0_0_0_2px_rgba(156,163,175,0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] rounded-xl transition-all duration-200"
                  data-cal-namespace="deltalytix-business"
                  data-cal-link="hugo-demenez/deltalytix-business"
                  data-cal-config='{"layout":"month_view"}'
                >
                  <span className="font-medium text-sm text-gray-900 dark:text-white">{t('business.cta.secondary')} <span aria-hidden="true">→</span></span>
                </button>
              </div>
              
              {/* Stats Section moved inside hero */}
              <div className="mt-12 grid grid-cols-3 gap-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-left">
                    <div className="text-2xl font-bold text-[#2E9987] dark:text-[hsl(var(--chart-1))]">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-12 flex max-w-2xl sm:mt-16 lg:mt-0 lg:mr-0 lg:ml-10 lg:max-w-none lg:flex-none xl:ml-32">
              <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
                <div className="-m-2 rounded-xl bg-gray-900/5 dark:bg-gray-100/5 p-2 ring-1 ring-gray-900/10 dark:ring-gray-100/10 ring-inset lg:-m-4 lg:rounded-2xl lg:p-4">
                  <Image
                    alt="Dashboard screenshot"
                    src="/business-dark.png"
                    width={2432}
                    height={1442}
                    className="w-304 rounded-md shadow-2xl ring-1 ring-gray-900/10 dark:ring-gray-100/10 hidden dark:block"
                  />
                  <Image
                    alt="Dashboard screenshot"
                    src="/business-light.png"
                    width={2432}
                    height={1442}
                    className="w-304 rounded-md shadow-2xl ring-1 ring-gray-900/10 dark:hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {t('business.features.title')}
              </h2>
              <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl mt-4">
                {t('business.features.description')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="border-2 hover:border-[#2E9987] dark:hover:border-[hsl(var(--chart-1))] transition-colors duration-200">
                  <CardHeader>
                    <div className="w-12 h-12 bg-[#2E9987] dark:bg-[hsl(var(--chart-1))] rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24 bg-muted">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {t('business.usecases.title')}
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl mt-4">
                {t('business.usecases.description')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {useCases.map((useCase, index) => (
                <Card key={index} className="border-2 hover:border-[#2E9987] dark:hover:border-[hsl(var(--chart-1))] transition-colors duration-200">
                  <CardHeader>
                    <div className="w-12 h-12 bg-[#2E9987] dark:bg-[hsl(var(--chart-1))] rounded-lg flex items-center justify-center mb-4">
                      <useCase.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {useCase.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                {t('business.cta.createAccount.title')}
              </h2>
              <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl mb-8">
                {t('business.cta.createAccount.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/authentication" className="flex justify-center items-center px-8 py-2.5 h-10 bg-[#2E9987] hover:bg-[#267a6d] dark:bg-[hsl(var(--chart-1))] dark:hover:bg-[hsl(var(--chart-1)/0.9)] shadow-[0_0_0_6px_rgba(50,169,151,0.1),0_0_0_2px_rgba(50,169,151,0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_0_0_6px_rgba(50,169,151,0.2),0_0_0_2px_rgba(50,169,151,0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] dark:shadow-[0_0_0_6px_hsl(var(--chart-1)/0.1),0_0_0_2px_hsl(var(--chart-1)/0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_0_6px_hsl(var(--chart-1)/0.2),0_0_0_2px_hsl(var(--chart-1)/0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] rounded-xl transition-all duration-200">
                  <span className="font-medium text-sm text-white">{t('business.cta.createAccount.button')}</span>
                </Link>
                <button 
                  className="flex justify-center items-center px-8 py-2.5 h-10 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-[0_0_0_6px_rgba(107,114,128,0.1),0_0_0_2px_rgba(107,114,128,0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_0_0_6px_rgba(107,114,128,0.2),0_0_0_2px_rgba(107,114,128,0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] dark:shadow-[0_0_0_6px_rgba(156,163,175,0.1),0_0_0_2px_rgba(156,163,175,0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_0_6px_rgba(156,163,175,0.2),0_0_0_2px_rgba(156,163,175,0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] rounded-xl transition-all duration-200"
                  data-cal-namespace="deltalytix-business"
                  data-cal-link="hugo-demenez/deltalytix-business"
                  data-cal-config='{"layout":"month_view"}'
                >
                  <span className="font-medium text-sm text-gray-900 dark:text-white">{t('business.cta.demo.button')}</span>
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                {t('business.cta.createAccount.subtext')}
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full py-6 md:py-12 lg:py-16 xl:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <Footer />
          </div>
        </footer>
      </main>
    </div>
  )
}