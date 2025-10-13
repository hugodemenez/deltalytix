import * as React from 'react';
import {
  Body,
  Button,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface RenewalNoticeEmailProps {
  userFirstName: string;
  userEmail: string;
  accountName: string;
  propFirmName: string;
  nextPaymentDate: string;
  daysUntilRenewal: number;
  paymentFrequency: string;
  language?: string;
  unsubscribeUrl?: string;
}

const translations = {
  en: {
    preview: 'Upcoming renewal for your account',
    greeting: 'Hello',
    title: 'Account Renewal Notice',
    intro: 'This is a friendly reminder that your prop firm account renewal is coming up.',
    accountDetails: 'Account Details',
    account: 'Account',
    propFirm: 'Prop Firm',
    nextPayment: 'Next Payment Date',
    frequency: 'Payment Frequency',
    daysRemaining: 'Days Until Renewal',
    actionTitle: 'What you need to do',
    actionDescription: 'Please ensure your payment method is up to date and sufficient funds are available.',
    manageAccountButton: 'Manage Account',
    contactSupport: 'If you have any questions or need to make changes to your account, please contact our support team.',
    supportButton: 'Contact Support',
    autoRenewalNote: 'This account is set to auto-renew. If you want to make changes or cancel, please do so before the renewal date.',
    bestRegards: 'Best regards',
    team: 'The Deltalytix Team',
    unsubscribe: 'Unsubscribe from renewal notifications',
    frequencies: {
      monthly: 'Monthly',
      quarterly: 'Quarterly', 
      biannual: 'Bi-annual',
      annual: 'Annual',
      custom: 'Custom'
    }
  },
  fr: {
    preview: 'Renouvellement prochain pour votre compte',
    greeting: 'Bonjour',
    title: 'Avis de Renouvellement de Compte',
    intro: 'Ceci est un rappel amical que le renouvellement de votre compte prop firm approche.',
    accountDetails: 'Détails du Compte',
    account: 'Compte',
    propFirm: 'Prop Firm',
    nextPayment: 'Prochaine Date de Paiement',
    frequency: 'Fréquence de Paiement',
    daysRemaining: 'Jours Avant Renouvellement',
    actionTitle: 'Ce que vous devez faire',
    actionDescription: 'Veuillez vous assurer que votre méthode de paiement est à jour et que des fonds suffisants sont disponibles.',
    manageAccountButton: 'Gérer le Compte',
    contactSupport: 'Si vous avez des questions ou devez apporter des modifications à votre compte, veuillez contacter notre équipe de support.',
    supportButton: 'Contacter le Support',
    autoRenewalNote: 'Ce compte est configuré pour se renouveler automatiquement. Si vous souhaitez apporter des modifications ou annuler, veuillez le faire avant la date de renouvellement.',
    bestRegards: 'Cordialement',
    team: 'L\'équipe Deltalytix',
    unsubscribe: 'Se désabonner des notifications de renouvellement',
    frequencies: {
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
      biannual: 'Semestriel', 
      annual: 'Annuel',
      custom: 'Personnalisé'
    }
  }
};

export default function RenewalNoticeEmail({
  userFirstName,
  userEmail,
  accountName,
  propFirmName,
  nextPaymentDate,
  daysUntilRenewal,
  paymentFrequency,
  language = 'en',
  unsubscribeUrl
}: RenewalNoticeEmailProps) {
  const t = translations[language as keyof typeof translations] || translations.en;
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
  const supportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/support`;

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Section className="bg-white max-w-[600px] mx-auto rounded-lg shadow-xs">
            <Section className="px-6 py-8">
              <Heading className="text-2xl font-bold text-gray-900 mb-6">
                {t.greeting} {userFirstName},
              </Heading>

              <Heading className="text-xl font-semibold text-gray-900 mb-4">
                {t.title}
              </Heading>

              <Text className="text-gray-800 mb-6 leading-6">
                {t.intro}
              </Text>

              {/* Account Details Card */}
              <Section className="bg-gray-50 rounded-lg p-6 mb-6">
                <Heading className="text-lg font-semibold text-gray-900 mb-4">
                  {t.accountDetails}
                </Heading>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Text className="text-gray-600 margin-0">{t.account}:</Text>
                    <Text className="text-gray-900 font-medium margin-0">{accountName}</Text>
                  </div>
                  
                  <div className="flex justify-between">
                    <Text className="text-gray-600 margin-0">{t.propFirm}:</Text>
                    <Text className="text-gray-900 font-medium margin-0">{propFirmName}</Text>
                  </div>
                  
                  <div className="flex justify-between">
                    <Text className="text-gray-600 margin-0">{t.nextPayment}:</Text>
                    <Text className="text-gray-900 font-medium margin-0">{nextPaymentDate}</Text>
                  </div>
                  
                  <div className="flex justify-between">
                    <Text className="text-gray-600 margin-0">{t.frequency}:</Text>
                    <Text className="text-gray-900 font-medium margin-0">
                      {t.frequencies[paymentFrequency as keyof typeof t.frequencies] || paymentFrequency}
                    </Text>
                  </div>
                  
                  <div className="flex justify-between">
                    <Text className="text-gray-600 margin-0">{t.daysRemaining}:</Text>
                    <Text className={`font-medium margin-0 ${daysUntilRenewal <= 3 ? 'text-red-600' : 'text-orange-600'}`}>
                      {daysUntilRenewal} {daysUntilRenewal === 1 ? 'day' : 'days'}
                    </Text>
                  </div>
                </div>
              </Section>

              {/* Action Section */}
              <Section className="mb-6">
                <Heading className="text-lg font-semibold text-gray-900 mb-3">
                  {t.actionTitle}
                </Heading>
                <Text className="text-gray-800 mb-4 leading-6">
                  {t.actionDescription}
                </Text>
                
                <Button
                  href={dashboardUrl}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-center block w-fit"
                >
                  {t.manageAccountButton}
                </Button>
              </Section>

              {/* Auto-renewal Notice */}
              <Section className="bg-blue-50 rounded-lg p-4 mb-6">
                <Text className="text-blue-800 margin-0 text-sm leading-5">
                  ℹ️ {t.autoRenewalNote}
                </Text>
              </Section>

              {/* Support Section */}
              <Section className="mb-6">
                <Text className="text-gray-800 mb-4 leading-6">
                  {t.contactSupport}
                </Text>
                
                <Button
                  href={supportUrl}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium text-center block w-fit"
                >
                  {t.supportButton}
                </Button>
              </Section>

              <Text className="text-gray-800 mt-8 mb-2">
                {t.bestRegards},
              </Text>
              <Text className="text-gray-800 mb-6">
                {t.team}
              </Text>

              <Hr className="border-gray-200 my-6" />

              {unsubscribeUrl && (
                <Text className="text-gray-400 text-xs text-center margin-0">
                  <Link href={unsubscribeUrl} className="text-gray-400 underline">
                    {t.unsubscribe}
                  </Link>
                </Text>
              )}
            </Section>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
} 