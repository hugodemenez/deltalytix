'use client';

import React from 'react';
import { useI18n } from '@/locales/client';

export default function TermsOfService() {
  const t = useI18n();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('terms.title')}</h1>
      
      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">{t('terms.sections.companyInfo.title')}</h2>
        <p>{t('terms.sections.companyInfo.content')}</p>
        <p>{t('terms.sections.companyInfo.contact')}<a href="mailto:contact@deltalytix.app">contact@deltalytix.app</a></p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">{t('terms.sections.services.title')}</h2>
        <p>{t('terms.sections.services.content')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">{t('terms.sections.userAccounts.title')}</h2>
        <p>{t('terms.sections.userAccounts.content')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">{t('terms.sections.subscriptionPayments.title')}</h2>
        <p>{t('terms.sections.subscriptionPayments.content')}</p>
        
        <h3 className="text-lg font-semibold mt-4 mb-2">{t('terms.sections.subscriptionPayments.storageClarification')}</h3>
        <p className="mb-3">{t('terms.sections.subscriptionPayments.fairUse')}</p>
        
        <h3 className="text-lg font-semibold mt-4 mb-2">{t('terms.sections.subscriptionPayments.lifetimePlan.title')}</h3>
        <p>{t('terms.sections.subscriptionPayments.lifetimePlan.description')}</p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>{t('terms.sections.subscriptionPayments.lifetimePlan.condition1')}</li>
          <li>{t('terms.sections.subscriptionPayments.lifetimePlan.condition2')}</li>
          <li>{t('terms.sections.subscriptionPayments.lifetimePlan.condition3')}</li>
          <li>{t('terms.sections.subscriptionPayments.lifetimePlan.condition4')}</li>
          <li>{t('terms.sections.subscriptionPayments.lifetimePlan.condition5')}</li>
          <li>{t('terms.sections.subscriptionPayments.lifetimePlan.condition6')}</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">{t('terms.sections.intellectualProperty.title')}</h2>
        <p>{t('terms.sections.intellectualProperty.content')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">{t('terms.sections.dataProtection.title')}</h2>
        <p>{t('terms.sections.dataProtection.content')}</p>
        <p className="mt-2">{t('terms.sections.dataProtection.dataExport')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">{t('terms.sections.liability.title')}</h2>
        <p>{t('terms.sections.liability.content')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">{t('terms.sections.termination.title')}</h2>
        <p>{t('terms.sections.termination.content')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">{t('terms.sections.serviceAvailability.title')}</h2>
        <p>{t('terms.sections.serviceAvailability.description')}</p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>{t('terms.sections.serviceAvailability.condition1')}</li>
          <li>{t('terms.sections.serviceAvailability.condition2')}</li>
          <li>{t('terms.sections.serviceAvailability.condition3')}</li>
        </ul>
        <p className="mt-2">{t('terms.sections.serviceAvailability.notice')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">{t('terms.sections.governingLaw.title')}</h2>
        <p>{t('terms.sections.governingLaw.content')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">{t('terms.sections.changesTerms.title')}</h2>
        <p>{t('terms.sections.changesTerms.content')}</p>
      </section>

      <p className="mt-8 text-sm">{t('terms.lastUpdated')}{new Date().toISOString().split('T')[0]}</p>
    </div>
  );
}