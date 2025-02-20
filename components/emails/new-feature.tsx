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

interface NewFeaturesEmailProps {
  firstName: string;
}

export default function NewFeaturesEmail({ firstName = 'trader' }: NewFeaturesEmailProps) {
  const youtubeId = 'oGdJ6XlKgjo';
  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

  return (
    <Html>
      <Head />
      <Preview>Nouvelles fonctionnalités Deltalytix - Améliorez votre suivi de trading</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-20 px-4">
            <Section className="bg-white rounded-lg shadow-lg px-8 py-10">
              <Heading className="text-2xl font-bold text-gray-900 mb-6">
                Bonjour {firstName},
              </Heading>
              
              <Text className="text-gray-800 mb-4 leading-6">
                Nous sommes ravis de vous annoncer le déploiement de nouvelles fonctionnalités sur Deltalytix !
              </Text>

              <Text className="text-gray-800 mb-4 leading-6">
                Voici ce qui vous attend dans cette mise à jour :
              </Text>

              <Section className="mb-6">
                <Text className="text-gray-800 leading-6 mb-2">
                  • Analyse approfondie des performances par paire de trading
                </Text>
                <Text className="text-gray-800 leading-6 mb-2">
                  • Nouveaux graphiques de visualisation des résultats
                </Text>
                <Text className="text-gray-800 leading-6 mb-2">
                  • Export des données au format CSV
                </Text>
                <Text className="text-gray-800 leading-6 mb-2">
                  • Interface optimisée pour une meilleure expérience utilisateur
                </Text>
              </Section>

              <Section className="mb-8">
                <Link href={`https://youtu.be/${youtubeId}`}>
                  <Img
                    src={thumbnailUrl}
                    alt="Présentation des nouvelles fonctionnalités"
                    className="rounded-lg w-full mb-4"
                  />
                </Link>
                <Button
                  className="bg-black text-white px-6 py-3 rounded-lg font-medium box-border"
                  href={`https://youtu.be/${youtubeId}`}
                >
                  Découvrir les nouvelles fonctionnalités en vidéo
                </Button>
              </Section>

              <Text className="text-gray-800 mb-4 leading-6">
                Ces améliorations ont été développées en tenant compte de vos retours et suggestions. Nous espérons qu'elles vous aideront à optimiser davantage votre trading.
              </Text>

              <Text className="text-gray-800 mb-4 leading-6">
                N'hésitez pas à nous faire part de vos impressions sur ces nouveautés !
              </Text>

              <Button 
                className="bg-black text-white px-6 py-3 rounded-lg font-medium mb-8 box-border"
                href="https://deltalytix.com/dashboard"
              >
                Accéder à mon tableau de bord
              </Button>

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