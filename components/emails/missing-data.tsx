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

interface MissingYouEmailProps {
  email: string;
  firstName?: string;
}

export default function MissingYouEmail({
  email="jean.dupont@example.com",
  firstName = "trader",
}: MissingYouEmailProps) {
  const unsubscribeUrl = email 
    ? `https://deltalytix.app/api/email/unsubscribe?email=${encodeURIComponent(email)}`
    : '#';

  return (
    <Html>
      <Head />
      <Preview>Nous manquons de vous voir sur Deltalytix</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Section className="bg-white max-w-[600px] mx-auto rounded-lg shadow-sm">
            <Section className="px-6 py-8">
              <Heading className="text-2xl font-bold text-gray-900 mb-6">
                Bonjour {firstName},
              </Heading>

              <Text className="text-gray-800 mb-6 leading-6">
                Nous avons remarqué que vous n&apos;avez pas encore importé vos données de trading sur Deltalytix.
              </Text>

              <Text className="text-gray-800 mb-6 leading-6">
                Sans vos données, nous ne pouvons pas vous offrir les analyses détaillées et les insights personnalisés qui pourraient transformer votre approche du trading.
              </Text>

              {/* Empty Calendar View to show what they're missing */}
              <Section className="mb-8">
                <Heading className="text-xl font-semibold text-gray-900 mb-4">
                  Vos Performances Journalières
                </Heading>
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                  <tr className="bg-gray-50">
                    <td className="w-1/5 p-2 text-center text-sm text-gray-600 border border-gray-200">Lun</td>
                    <td className="w-1/5 p-2 text-center text-sm text-gray-600 border border-gray-200">Mar</td>
                    <td className="w-1/5 p-2 text-center text-sm text-gray-600 border border-gray-200">Mer</td>
                    <td className="w-1/5 p-2 text-center text-sm text-gray-600 border border-gray-200">Jeu</td>
                    <td className="w-1/5 p-2 text-center text-sm text-gray-600 border border-gray-200">Ven</td>
                  </tr>
                  {[0, 1].map((weekIndex) => (
                    <tr key={weekIndex}>
                      {[0, 1, 2, 3, 4].map((dayIndex) => (
                        <td key={dayIndex} className="w-1/5 p-2 text-center border border-gray-200 min-w-[80px]">
                          <div className="flex items-center justify-center min-h-[48px]">
                            <Text className="text-xs text-gray-400">-</Text>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </table>
              </Section>

              {/* Empty Win/Loss Distribution */}
              <Section className="mb-8 text-center">
                <Heading className="text-xl font-semibold text-gray-900 mb-4">
                  Distribution Gains/Pertes
                </Heading>
                <Section className="bg-gray-50 rounded-lg p-4 mb-4">
                  <table className="w-full">
                    <tr>
                      <td className="w-1/2 text-center">
                        <Text className="text-2xl font-bold text-gray-400 mb-2">
                          ?
                        </Text>
                        <Text className="text-sm text-gray-600">Gains</Text>
                      </td>
                      <td className="w-1/2 text-center">
                        <Text className="text-2xl font-bold text-gray-400 mb-2">
                          ?
                        </Text>
                        <Text className="text-sm text-gray-600">Pertes</Text>
                      </td>
                    </tr>
                  </table>
                  <Text className="text-lg font-semibold mt-4 text-gray-400">
                    Taux de réussite: ?%
                  </Text>
                </Section>
              </Section>

              <Text className="text-gray-800 mb-6 leading-6">
                Avec Deltalytix, vous pourriez :
              </Text>

              <ul className="list-disc pl-6 mb-6">
                <li className="text-gray-800 mb-2">
                  <Text className="text-gray-800">
                    Visualiser vos performances quotidiennes
                  </Text>
                </li>
                <li className="text-gray-800 mb-2">
                  <Text className="text-gray-800">
                    Analyser votre ratio gains/pertes
                  </Text>
                </li>
                <li className="text-gray-800 mb-2">
                  <Text className="text-gray-800">
                    Recevoir des conseils personnalisés pour améliorer vos résultats
                  </Text>
                </li>
                <li className="text-gray-800 mb-2">
                  <Text className="text-gray-800">
                    Identifier vos points forts et vos axes d&apos;amélioration
                  </Text>
                </li>
              </ul>

              <Text className="text-gray-800 mb-6 leading-6">
                Commencez dès aujourd&apos;hui en important vos données et découvrez comment Deltalytix peut transformer votre approche du trading.
              </Text>

              <Section className="text-center mb-8">
                <Button 
                  className="bg-black text-white text-sm px-6 py-2.5 rounded-md font-medium box-border"
                  href="https://deltalytix.app/import"
                >
                  Importer mes données →
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
                <br />
                {' • '}
                <Link href={unsubscribeUrl} className="text-gray-400 underline">
                  Se désabonner
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

