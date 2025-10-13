import * as React from 'react';
import {
  Body,
  Button,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface NewsletterEmailProps {
  firstName?: string;
  email?: string;
  youtubeId: string;
  introMessage: string;
  features: string[];
  unsubscribeUrl: string;
}

export default function NewsletterEmail({
  youtubeId,
  introMessage,
  features,
  firstName,
  unsubscribeUrl,
}: NewsletterEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const thumbnailUrl = `${baseUrl}/api/email/thumbnail/${youtubeId}/maxresdefault`;
  return (
    <Html>
      <Head />
      <Preview>Nouveautés sur Deltalytix - Votre plateforme de suivi de trading</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Section className="bg-white max-w-[600px] mx-auto rounded-lg shadow-xs">
            <Section className="px-6 py-8">
              <Heading className="text-2xl font-bold text-gray-900 mb-6">
                Bonjour {firstName},
              </Heading>
              
              <Text className="text-gray-800 mb-6 leading-6">
                {introMessage}
              </Text>

              <Section className="mb-8">
                <Link href={`https://youtu.be/${youtubeId}`}>
                  <Img
                    src={thumbnailUrl}
                    alt="Dernière vidéo Deltalytix"
                    className="rounded-lg w-full mb-4 shadow-xs"
                  />
                </Link>
                <Button
                  className="bg-black text-white text-sm px-4 py-2 rounded-md font-medium box-border"
                  href={`https://youtu.be/${youtubeId}`}
                >
                  ▶️ Voir la dernière vidéo
                </Button>
              </Section>

              <Section className="mb-6">
                {features.map((feature, index) => (
                  <Text key={index} className="text-gray-800 mb-4 leading-6">
                    • {feature}
                  </Text>
                ))}
              </Section>

              <Text className="text-gray-800 mb-4 leading-6">
                Si vous avez la moindre question ou besoin d&apos;un coup de main pour démarrer, n&apos;hésitez pas à me faire signe, je serai ravi de vous aider.
              </Text>

              <Text className="text-gray-800 mb-6 leading-6">
                Bon trading et à bientôt !
              </Text>

              <Section className="text-center">
                <Button 
                  className="bg-black text-white text-sm px-6 py-2.5 rounded-md font-medium box-border"
                  href="https://deltalytix.app/dashboard"
                >
                  Accéder à mon tableau de bord →
                </Button>
              </Section>

              <Text className="text-gray-800 mt-8 mb-4">
                Hugo DEMENEZ
                <br />
                <span className="text-gray-600">Fondateur de Deltalytix</span>
              </Text>

              <Hr className="border-gray-200 my-8" />

              <Text className="text-gray-400 text-xs text-center">
                Cet email vous a été envoyé par Deltalytix
                {' • '}
                <Link href={unsubscribeUrl} className="text-gray-400 underline">
                  Se désabonner
                </Link>
              </Text>
            </Section>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
}