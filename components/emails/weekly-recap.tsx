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

interface TraderStatsEmailProps {
  email: string;
  firstName?: string;
  dailyPnL: {
    date: string;
    pnl: number;
    weekday: number; // 0 = Monday, 4 = Friday
  }[];
  winLossStats: {
    wins: number;
    losses: number;
  };
  resultAnalysisIntro: string;
  tipsForNextWeek: string;
  language?: string;
}

const translations = {
  fr: {
    preview: 'Vos statistiques de trading de la semaine - Deltalytix',
    greeting: 'Bonjour',
    disclaimer: 'Cette analyse, effectuée sur les 14 derniers jours par un algorithme, peut contenir des erreurs.',
    dailyPerformance: 'Performances Journalières',
    winLossDistribution: 'Distribution Gains/Pertes',
    wins: 'Gains',
    losses: 'Pertes',
    successRate: 'Taux de réussite',
    detailedStats: 'Voir mes statistiques détaillées →',
    founder: 'Fondateur de Deltalytix',
    unsubscribe: 'Se désabonner',
    sentBy: 'Cet email vous a été envoyé par Deltalytix',
    days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],
    warmUpMessage: 'Je vois que cette semaine a été difficile. Je serais ravi de discuter avec vous pour comprendre vos défis et vous aider à améliorer vos performances. Prenons rendez-vous pour un appel personnalisé.',
    scheduleCall: 'Planifier un appel →'
  },
  en: {
    preview: 'Your weekly trading statistics - Deltalytix',
    greeting: 'Hello',
    disclaimer: 'This analysis, performed over the last 14 days by an algorithm, may contain errors.',
    dailyPerformance: 'Daily Performance',
    winLossDistribution: 'Win/Loss Distribution',
    wins: 'Wins',
    losses: 'Losses',
    successRate: 'Success Rate',
    detailedStats: 'View my detailed statistics →',
    founder: 'Founder of Deltalytix',
    unsubscribe: 'Unsubscribe',
    sentBy: 'This email was sent to you by Deltalytix',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    warmUpMessage: 'I see this week has been challenging. I\'d love to discuss your challenges and help you improve your performance. Let\'s schedule a personalized call.',
    scheduleCall: 'Schedule a call →'
  }
};

function getWeekNumber(dateStr: string) {
  const [day, month] = dateStr.split('/').map(Number);
  const currentYear = new Date().getFullYear();
  const date = new Date(currentYear, month - 1, day);
  const firstDayOfYear = new Date(currentYear, 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function compareDates(dateA: string, dateB: string) {
  const [dayA, monthA] = dateA.split('/').map(Number);
  const [dayB, monthB] = dateB.split('/').map(Number);
  const currentYear = new Date().getFullYear();
  const dateObjA = new Date(currentYear, monthA - 1, dayA);
  const dateObjB = new Date(currentYear, monthB - 1, dayB);
  return dateObjA.getTime() - dateObjB.getTime();
}

function formatPnL(value: number): string {
  // For values >= 1000 or <= -1000, use K format
  if (Math.abs(value) >= 1000) {
    return `${Math.trunc(value / 1000)}K`
  }
  // For values between -1000 and 1000, show no decimals
  return Math.trunc(value).toString()
}

export default function TraderStatsEmail({
  email,
  firstName = "trader",
  dailyPnL,
  winLossStats,
  resultAnalysisIntro,
  tipsForNextWeek,
  language = "fr",
}: TraderStatsEmailProps) {
  const t = translations[language as keyof typeof translations] || translations.fr;

  const unsubscribeUrl = email
    ? `https://deltalytix.app/api/email/unsubscribe?email=${encodeURIComponent(email)}`
    : '#';

  // Calculate win rate percentage
  const totalTrades = winLossStats.wins + winLossStats.losses;
  const winRate = ((winLossStats.wins / totalTrades) * 100).toFixed(1);

  // Calculate overall PnL
  const overallPnL = dailyPnL.reduce((sum, day) => sum + day.pnl, 0);
  const isPositivePerformance = overallPnL > 0;

  // Helper function to determine PnL color
  const getPnLColor = (pnl: number) => pnl >= 0 ? 'text-green-600' : 'text-red-600';

  // Helper function to format PnL with sign
  const formatPnLWithSign = (pnl: number) => {
    const formatted = formatPnL(Math.abs(pnl));
    return pnl >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  // Sort dailyPnL by date
  const sortedDailyPnL = [...dailyPnL].sort((a, b) => compareDates(a.date, b.date));

  // Group data by weeks and track the week's first date for sorting
  const weekData = sortedDailyPnL.reduce((acc, day) => {
    const weekNum = getWeekNumber(day.date);
    if (!acc[weekNum]) {
      acc[weekNum] = {
        days: Array(5).fill(null),
        firstDate: day.date // Track the first date we see for this week
      };
    }
    acc[weekNum].days[day.weekday] = day;
    // Update firstDate if this date is earlier
    if (compareDates(day.date, acc[weekNum].firstDate) < 0) {
      acc[weekNum].firstDate = day.date;
    }
    return acc;
  }, {} as Record<number, { days: (typeof sortedDailyPnL[0] | null)[], firstDate: string }>);

  // Sort weeks by their first date (ascending order) and get the two most recent weeks
  const sortedWeeks = Object.entries(weekData)
    .sort((a, b) => compareDates(a[1].firstDate, b[1].firstDate)) // Changed sort order to ascending
    .slice(-2) // Take last 2 weeks instead of first 2
    .map(([_, data]) => data.days);

  // If we don't have two weeks, pad with empty week at the beginning
  while (sortedWeeks.length < 2) {
    sortedWeeks.unshift(Array(5).fill(null)); // Add empty weeks at the start
  }

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Section className="bg-white max-w-[600px] mx-auto rounded-lg shadow-sm">
            <Section className="px-6 py-8">
              <Heading className="text-2xl font-bold text-gray-900 mb-6">
                {t.greeting} {firstName},
              </Heading>
              <Text className="text-gray-400 mb-6 leading-6">
                {t.disclaimer}
              </Text>

              {isPositivePerformance ? (
                <>
                  <Text className="text-gray-800 mb-6 leading-6">
                    {resultAnalysisIntro}
                  </Text>
                  {/* Calendar View */}
                  <Section className="mb-8">
                    <Heading className="text-xl font-semibold text-gray-900 mb-4">
                      {t.dailyPerformance}
                    </Heading>
                    <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                      <tr className="bg-gray-50">
                        {t.days.map((day) => (
                          <td key={day} className="w-1/5 p-2 text-center text-sm text-gray-600 border border-gray-200">
                            {day}
                          </td>
                        ))}
                      </tr>
                      {sortedWeeks.map((week, weekIndex) => (
                        <tr key={weekIndex}>
                          {week.map((day, dayIndex) => (
                            <td key={dayIndex} className="w-1/5 p-2 text-center border border-gray-200 min-w-[80px]">
                              {day ? (
                                <div className="flex flex-col items-center justify-center min-h-[48px]">
                                  <Text className="text-xs text-gray-600 mb-1 w-full text-center">
                                    {day.date}
                                  </Text>
                                  <Text className={`text-xs font-semibold ${getPnLColor(day.pnl)} w-full text-center`}>
                                    {formatPnLWithSign(day.pnl)}€
                                  </Text>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center min-h-[48px]">
                                  <Text className="text-xs text-gray-400">-</Text>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </table>
                  </Section>

                  {/* Win/Loss Distribution */}
                  <Section className="mb-8 text-center">
                    <Heading className="text-xl font-semibold text-gray-900 mb-4">
                      {t.winLossDistribution}
                    </Heading>
                    <Section className="bg-gray-50 rounded-lg p-4 mb-4">
                      <table className="w-full">
                        <tr>
                          <td className="w-1/2 text-center">
                            <Text className="text-2xl font-bold text-green-600 mb-2">
                              {winLossStats.wins}
                            </Text>
                            <Text className="text-sm text-gray-600">{t.wins}</Text>
                          </td>
                          <td className="w-1/2 text-center">
                            <Text className="text-2xl font-bold text-red-600 mb-2">
                              {winLossStats.losses}
                            </Text>
                            <Text className="text-sm text-gray-600">{t.losses}</Text>
                          </td>
                        </tr>
                      </table>
                      <Text className="text-lg font-semibold mt-4">
                        {t.successRate}: {winRate}%
                      </Text>
                    </Section>
                  </Section>

                  <Text className="text-gray-800 mb-6 leading-6">
                    {tipsForNextWeek}
                  </Text>

                  <Section className="text-center mb-8">
                    <Button
                      className="bg-[#3b82f6] text-white text-sm px-[24px] py-[10px] rounded-[4px] font-medium box-border"
                      href="https://deltalytix.app/dashboard"
                    >
                      {t.detailedStats}
                    </Button>
                  </Section>
                </>
              ) : (
                <>
                  <Text className="text-gray-800 mb-6 leading-6">
                    {t.warmUpMessage}
                  </Text>
                  <Section className="text-center mb-8">
                    <Button
                      className="bg-[#3b82f6] text-white text-sm px-[24px] py-[10px] rounded-[4px] font-medium box-border"
                      href="https://cal.com/hugo-demenez/deltalytix"
                    >
                      {t.scheduleCall}
                    </Button>
                  </Section>
                </>
              )}

              <Text className="text-gray-800 mt-8 mb-4">
                Hugo DEMENEZ
                <br />
                <span className="text-gray-600">{t.founder}</span>
              </Text>

              <Hr className="border-gray-200 my-8" />

              <Text className="text-gray-400 text-xs text-center">
                {t.sentBy}
                {' • '}
                <Link href={unsubscribeUrl} className="text-gray-400 underline">
                  {t.unsubscribe}
                </Link>
              </Text>
            </Section>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
}

