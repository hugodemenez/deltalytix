import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Tailwind,
  Body,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Link,
} from '@react-email/components';

const copy = {
  en: {
    preview: 'Black Friday: 50€ off Deltalytix Lifetime - Until Nov 30th',
    greeting: 'Hello {firstName},',
    intro:
      "I wanted to reach out personally about a special Black Friday offer for Deltalytix users.",
    offer:
      "This week only, I'm offering 50€ off our Lifetime Plan. Instead of 300€, you can upgrade for 250€ and get lifetime access to all current and future features.",
    highlightTitle: 'Black Friday Special',
    highlightDeadline: 'Valid until Sunday, November 30th at midnight',
    planDetails:
      "The Lifetime Plan includes unlimited trade tracking, advanced analytics, real-time insights, and priority support. It's designed for serious traders who want comprehensive performance analysis without recurring fees.",
    motivation:
      "If you've been considering upgrading to get more detailed insights into your trading performance, this is a good opportunity to do so at a reduced cost.",
    cta: 'Upgrade to Lifetime Plan',
    support:
      'As always, if you have any questions about the platform or need help with your trading analysis, feel free to reach out.',
    closingLine1: 'Best regards,',
    closingLine2: 'The Deltalytix Team',
    unsubscribe: 'Unsubscribe',
  },
  fr: {
    preview: 'Black Friday : 50€ de réduction sur Deltalytix Lifetime - Jusqu’au 30 nov.',
    greeting: 'Bonjour {firstName},',
    intro:
      "Je voulais vous écrire personnellement pour vous parler d'une offre Black Friday réservée aux utilisateurs de Deltalytix.",
    offer:
      "Cette semaine uniquement, j'offre 50€ de réduction sur notre offre Lifetime. Au lieu de 300€, vous pouvez passer à 250€ et bénéficier d'un accès à vie à toutes les fonctionnalités actuelles et futures.",
    highlightTitle: 'Offre spéciale Black Friday',
    highlightDeadline: 'Valable jusqu’au dimanche 30 novembre à minuit',
    planDetails:
      "Le plan Lifetime inclut un suivi illimité des trades, des analyses avancées, des insights en temps réel et un support prioritaire. Il est pensé pour les traders sérieux qui veulent une analyse complète sans frais récurrents.",
    motivation:
      "Si vous envisagiez de passer à une analyse plus détaillée de vos performances, c’est le moment idéal pour le faire à tarif réduit.",
    cta: 'Passer au plan Lifetime',
    support:
      "Comme toujours, si vous avez des questions sur la plateforme ou besoin d'aide pour analyser vos trades, n'hésitez pas à répondre à ce message.",
    closingLine1: 'À bientôt,',
    closingLine2: "Hugo",
    unsubscribe: 'Se désabonner',
  },
};

type Locale = keyof typeof copy;

const formatCopy = (text: string, firstName: string) =>
  text.replace('{firstName}', firstName);

const BlackFridayEmail = (props: { firstName: string; locale?: Locale }) => {
  const { firstName, locale = 'en' } = props;
  const content = copy[locale] ?? copy.en;

  return (
    <Html>
      <Head />
      <Preview>{content.preview}</Preview>
      <Tailwind>
        <Body className="bg-white font-sans py-[40px]">
          <Section className="bg-white max-w-[600px] mx-auto">
            <Section className="px-[24px] py-[32px]">
              <Heading className="text-[24px] font-bold text-black mb-[24px]">
                {formatCopy(content.greeting, firstName)}
              </Heading>

              <Text className="text-black mb-[16px] leading-6">
                {content.intro}
              </Text>

              <Text className="text-black mb-[24px] leading-6">
                {content.offer}
              </Text>

              <Section className="bg-gray-50 border border-gray-200 rounded-[8px] p-[24px] mb-[24px] text-center">
                <Text className="text-[18px] font-semibold text-black mb-[8px] m-0">
                  {content.highlightTitle}
                </Text>
                <Text className="text-[36px] font-bold mb-[4px] m-0">
                  <span className="line-through text-gray-400 mr-[12px]">300€</span>
                  <span className="text-[#007BFF]">250€</span>
                </Text>
                <Text className="text-[14px] text-gray-600 m-0">
                  {content.highlightDeadline}
                </Text>
              </Section>

              <Text className="text-black mb-[24px] leading-6">
                {content.planDetails}
              </Text>

              <Text className="text-black mb-[24px] leading-6">
                {content.motivation}
              </Text>

              <Section className="text-center mb-[32px]">
                <Button
                  className="bg-[#007BFF] text-white text-[16px] px-[24px] py-[12px] rounded-[6px] font-medium box-border"
                  href="https://deltalytix.app/pricing"
                >
                  {content.cta}
                </Button>
              </Section>

              <Text className="text-black mb-[16px] leading-6">
                {content.support}
              </Text>

              <Text className="text-black mb-[24px] leading-6">
                {content.closingLine1}
                <br />
                {content.closingLine2}
              </Text>

              <Hr className="border-gray-200 my-[24px]" />

              <Text className="text-gray-500 text-[12px] text-center m-0">
                <Link href="https://deltalytix.app" className="text-gray-500 underline">
                  Deltalytix
                </Link>
                {' • '}
                <Link href="#" className="text-gray-500 underline">
                  {content.unsubscribe}
                </Link>
              </Text>
            </Section>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
};

BlackFridayEmail.PreviewProps = {
  firstName: 'Trader',
  locale: 'en' as Locale,
};

export default BlackFridayEmail;