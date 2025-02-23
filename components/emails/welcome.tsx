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

interface WelcomeEmailProps {
  firstName: string;
  email?: string;
}

export default function WelcomeEmail({ firstName = 'trader', email }: WelcomeEmailProps) {
  const youtubeId = 'p2pYl6GMGbk';
  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
  const unsubscribeUrl = email 
    ? `https://deltalytix.app/api/email/unsubscribe?email=${encodeURIComponent(email)}`
    : '#';

  return (
    <Html>
      <Head />
      <Preview>Bienvenue sur Deltalytix - Votre plateforme de suivi de trading</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Section className="bg-white max-w-[600px] mx-auto rounded-lg shadow-sm">
            <Section className="px-6 py-8">
              <Heading className="text-2xl font-bold text-gray-900 mb-6">
                Bonjour {firstName},
              </Heading>
              
              <Text className="text-gray-800 mb-4 leading-6">
                Ravi de vous compter parmi les utilisateurs de Deltalytix !
              </Text>

              <Text className="text-gray-800 mb-4 leading-6">
                L&apos;objectif de la plateforme est de vous aider à suivre et analyser vos performances de trading de manière simple et efficace.
              </Text>

              <Text className="text-gray-800 mb-6 leading-6">
                J&apos;espère que vous avez déjà pu explorer un peu l&apos;interface.
              </Text>

              <Section className="mb-8">
                <Link href={`https://youtu.be/${youtubeId}`}>
                  <Img
                    src={thumbnailUrl}
                    alt="Dernière vidéo Deltalytix"
                    className="rounded-lg w-full mb-4 shadow-sm"
                  />
                </Link>
                <Button
                  className="bg-black text-white text-sm px-4 py-2 rounded-md font-medium box-border"
                  href={`https://youtu.be/${youtubeId}`}
                >
                  ▶️ Voir la dernière vidéo
                </Button>
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