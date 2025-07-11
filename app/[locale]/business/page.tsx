'use client'

import React from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from '@/locales/client'
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
  Play
} from 'lucide-react'

export default function BusinessPage() {
  const t = useI18n()

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

  const benefits = [
    {
      icon: TrendingUp,
      title: t('business.benefits.performance.title'),
      description: t('business.benefits.performance.description'),
    },
    {
      icon: Zap,
      title: t('business.benefits.scalability.title'),
      description: t('business.benefits.scalability.description'),
    },
    {
      icon: Shield,
      title: t('business.benefits.security.title'),
      description: t('business.benefits.security.description'),
    },
    {
      icon: Headphones,
      title: t('business.benefits.support.title'),
      description: t('business.benefits.support.description'),
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
    { value: '50+', label: t('business.stats.firms') },
    { value: '99.9%', label: t('business.stats.uptime') },
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
        'Advanced security',
        'SLA guarantees'
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
    <div className="flex flex-col min-h-[100dvh] text-gray-900 dark:text-white transition-colors duration-300">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-14 md:py-12 lg:py-16 xl:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col w-full gap-y-24">
              <div className="flex flex-col justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <Badge variant="secondary" className="mx-auto mb-4">
                    {t('business.badge')}
                  </Badge>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {t('business.badge.description')}
                  </p>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    {t('business.hero.title')}
                  </h1>
                  <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl">
                    {t('business.hero.description')}
                  </p>
                </div>
                <div className="flex w-full justify-center gap-4 flex-wrap">
                  <Link href="/dashboard">
                    <Button className="flex justify-center items-center px-8 py-2.5 h-10 bg-[#2E9987] hover:bg-[#267a6d] dark:bg-[hsl(var(--chart-1))] dark:hover:bg-[hsl(var(--chart-1)/0.9)] shadow-[0_0_0_6px_rgba(50,169,151,0.1),0_0_0_2px_rgba(50,169,151,0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_0_0_6px_rgba(50,169,151,0.2),0_0_0_2px_rgba(50,169,151,0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] dark:shadow-[0_0_0_6px_hsl(var(--chart-1)/0.1),0_0_0_2px_hsl(var(--chart-1)/0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_0_6px_hsl(var(--chart-1)/0.2),0_0_0_2px_hsl(var(--chart-1)/0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] rounded-xl transition-all duration-200">
                      <span className="font-medium text-sm text-white">{t('business.cta')}</span>
                    </Button>
                  </Link>
                  <Button variant="outline" className="flex justify-center items-center px-8 py-2.5 h-10">
                    <span className="font-medium text-sm">{t('business.cta.secondary')}</span>
                  </Button>
                </div>
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl font-bold text-[#2E9987] dark:text-[hsl(var(--chart-1))]">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
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
        <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {t('business.usecases.title')}
              </h2>
              <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl mt-4">
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

        {/* Benefits Section */}
        <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {t('business.benefits.title')}
              </h2>
              <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl mt-4">
                {t('business.benefits.description')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-[#2E9987] dark:bg-[hsl(var(--chart-1))] rounded-lg flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section id="roadmap" className="w-full py-6 md:py-12 lg:py-16 xl:py-24 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center mb-4">
                <Badge variant="secondary" className="mr-2">
                  {t('business.roadmap.beta')}
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('business.roadmap.beta.description')}
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {t('business.roadmap.title')}
              </h2>
              <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl mt-4">
                {t('business.roadmap.description')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {roadmap.map((item, index) => (
                <Card key={index} className="border-2 hover:border-[#2E9987] dark:hover:border-[hsl(var(--chart-1))] transition-colors duration-200">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-[#2E9987] dark:bg-[hsl(var(--chart-1))] rounded-lg flex items-center justify-center">
                        <item.icon className="w-6 h-6 text-white" />
                      </div>
                      <Badge 
                        variant={item.status === 'completed' ? 'default' : item.status === 'inProgress' ? 'secondary' : 'outline'}
                        className={item.status === 'completed' ? 'bg-green-500' : item.status === 'inProgress' ? 'bg-blue-500' : 'bg-gray-500'}
                      >
                        {item.status === 'completed' ? t('business.roadmap.completed') : 
                         item.status === 'inProgress' ? t('business.roadmap.inProgress') : 
                         t('business.roadmap.coming')}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{item.quarter}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base mb-4">
                      {item.description}
                    </CardDescription>
                    <ul className="space-y-2">
                      {item.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-[#2E9987] dark:text-[hsl(var(--chart-1))]" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {t('business.testimonials.title')}
              </h2>
              <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl mt-4">
                {t('business.testimonials.description')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="border-2 hover:border-[#2E9987] dark:hover:border-[hsl(var(--chart-1))] transition-colors duration-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <blockquote className="text-lg mb-4">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>
                    <div>
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {testimonial.role}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {t('business.pricing.title')}
              </h2>
              <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl mt-4">
                {t('business.pricing.description')}
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <Card className="border-2 border-[#2E9987] dark:border-[hsl(var(--chart-1))]">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl">{t('business.pricing.custom')}</CardTitle>
                  <CardDescription className="text-lg">
                    {t('business.pricing.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-[#2E9987] dark:text-[hsl(var(--chart-1))]" />
                      <span>{t('business.pricing.features')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-[#2E9987] dark:text-[hsl(var(--chart-1))]" />
                      <span>{t('business.pricing.dedicated')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-[#2E9987] dark:text-[hsl(var(--chart-1))]" />
                      <span>{t('business.pricing.onboarding')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-[#2E9987] dark:text-[hsl(var(--chart-1))]" />
                      <span>{t('business.pricing.sla')}</span>
                    </div>
                  </div>
                  <div className="text-center pt-6">
                    <Button className="bg-[#2E9987] hover:bg-[#267a6d] dark:bg-[hsl(var(--chart-1))] dark:hover:bg-[hsl(var(--chart-1)/0.9)]">
                      {t('business.pricing.contact')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
              {t('business.cta.demo.title')}
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl mb-8">
              {t('business.cta.demo.description')}
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button className="bg-[#2E9987] hover:bg-[#267a6d] dark:bg-[hsl(var(--chart-1))] dark:hover:bg-[hsl(var(--chart-1)/0.9)]">
                {t('business.cta.demo.button')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline">
                {t('business.cta.contact.button')}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}