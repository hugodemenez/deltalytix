import * as React from 'react';
import {
  Body,
  Button,
  Container,
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
}

export default function WelcomeEmail({ firstName = 'trader' }: WelcomeEmailProps) {
  const youtubeId = 'oGdJ6XlKgjo';
  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

  return (
    <Html>
      <Head />
      <Preview>Bienvenue sur Deltalytix - Votre plateforme de suivi de trading</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-20 px-4">
            <Section className="bg-white rounded-lg shadow-lg px-8 py-10">
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
                <Link href="https://youtu.be/oGdJ6XlKgjo">
                  <Img
                    src={thumbnailUrl}
                    alt="Vidéo de présentation Deltalytix"
                    className="rounded-lg w-full mb-4"
                  />
                </Link>
                <Button
                  className="bg-black text-white px-6 py-3 rounded-lg font-medium box-border"
                  href="https://youtu.be/oGdJ6XlKgjo"
                >
                  Regarder la vidéo de présentation
                </Button>
              </Section>

              <Text className="text-gray-800 mb-4 leading-6">
                Si vous avez la moindre question ou besoin d&apos;un coup de main pour démarrer, n&apos;hésitez pas à me faire signe, je serai ravi de vous aider.
              </Text>

              <Text className="text-gray-800 mb-4 leading-6">
                Bon trading et à bientôt !
              </Text>

              <Hr className="border-gray-200 my-8" />

              <Text className="text-gray-400 text-xs">
                Cet email vous a été envoyé par Deltalytix
                {' • '}
                <Link href="[unsubscribe]" className="text-gray-400 underline">
                  Se désabonner
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}