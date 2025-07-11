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

interface BusinessInvitationEmailProps {
  email: string;
  businessName: string;
  inviterName: string;
  inviterEmail: string;
  joinUrl: string;
  language?: string;
}

const content = {
  en: {
    preview: "You've been invited to join a business on Deltalytix",
    greeting: "Hello",
    invitation: "You've been invited to join a business on Deltalytix",
    businessName: "Business Name",
    inviter: "Invited by",
    joinDescription: "Join this business to collaborate with your team and access shared analytics.",
    joinButton: "Join Business →",
    footer: "This email was sent by Deltalytix",
    unsubscribe: "Unsubscribe",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"]
  },
  fr: {
    preview: "Vous avez été invité à rejoindre une entreprise sur Deltalytix",
    greeting: "Bonjour",
    invitation: "Vous avez été invité à rejoindre une entreprise sur Deltalytix",
    businessName: "Nom de l'entreprise",
    inviter: "Invité par",
    joinDescription: "Rejoignez cette entreprise pour collaborer avec votre équipe et accéder aux analyses partagées.",
    joinButton: "Rejoindre l'entreprise →",
    footer: "Cet email vous a été envoyé par Deltalytix",
    unsubscribe: "Se désabonner",
    days: ["Lun", "Mar", "Mer", "Jeu", "Ven"]
  }
};

export default function BusinessInvitationEmail({
  email = "jean.dupont@example.com",
  businessName = "My Business",
  inviterName = "trader",
  inviterEmail = "trader@example.com",
  joinUrl = "https://deltalytix.app/business/join",
  language = "fr",
}: BusinessInvitationEmailProps) {
  const lang = language === "en" ? "en" : "fr";
  const t = content[lang];
  const unsubscribeUrl = email
    ? `https://deltalytix.app/api/email/unsubscribe?email=${encodeURIComponent(email)}`
    : '#';

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Section className="bg-white max-w-[600px] mx-auto rounded-lg shadow-sm">
            <Section className="px-6 py-8">
              <Heading className="text-2xl font-bold text-gray-900 mb-6">
                {t.greeting},
              </Heading>

              <Text className="text-gray-800 mb-6 leading-6">
                {t.invitation}
              </Text>

              {/* Business Information */}
              <Section className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Text className="text-sm text-gray-600 mb-1">{t.businessName}</Text>
                    <Text className="text-lg font-semibold text-gray-900">{businessName}</Text>
                  </div>
                  <div className="text-right">
                    <Text className="text-sm text-gray-600 mb-1">{t.inviter}</Text>
                    <Text className="text-sm font-medium text-gray-900">{inviterName}</Text>
                    <Text className="text-xs text-gray-500">{inviterEmail}</Text>
                  </div>
                </div>
              </Section>

              <Text className="text-gray-800 mb-6 leading-6">
                {t.joinDescription}
              </Text>

              <Section className="text-center mb-8">
                <Button
                  className="bg-[#3b82f6] text-white text-sm px-[24px] py-[10px] rounded-[4px] font-medium box-border"
                  href={joinUrl}
                >
                  {t.joinButton}
                </Button>
              </Section>

              <Text className="text-gray-800 mt-8 mb-4">
                Hugo DEMENEZ
                <br />
                <span className="text-gray-600">Founder of Deltalytix</span>
              </Text>

              <Hr className="border-gray-200 my-8" />

              <Text className="text-gray-400 text-xs text-center">
                {t.footer}
                <br />
                {' • '}
                <Link href={unsubscribeUrl} className="text-gray-400 underline">
                  {t.unsubscribe}
                </Link>
                {' • '}
                © {new Date().getFullYear()} Deltalytix
              </Text>
            </Section>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
} 