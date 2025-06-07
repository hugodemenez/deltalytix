'use client'
import React from 'react'
import PricingPlans from '@/components/pricing-plans'
import { useI18n } from "@/locales/client"

export default function PricingPage() {
  const t = useI18n()

  return (
    <div>
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-4">{t('pricing.heading')}</h1>
        <p className="text-xl text-center text-gray-600 mb-12">{t('pricing.subheading')}</p>

        <PricingPlans />
      </main>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">{t('pricing.faq.heading')}</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer">{t('pricing.faq.question1')}</summary>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{t('pricing.faq.answer1')}</p>
            </details>
            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer">{t('pricing.faq.question2')}</summary>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{t('pricing.faq.answer2')}</p>
            </details>
          </div>
        </div>
      </section>
    </div>
  )
}