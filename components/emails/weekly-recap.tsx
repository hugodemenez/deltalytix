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
}

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
    return `${(value / 1000).toFixed(1)}K`
  }
  // For values between -1000 and 1000, show at most 2 decimal places
  return value.toFixed(Math.abs(value) < 10 ? 2 : 1)
}

export default function TraderStatsEmail({
  email,
  firstName = "trader",
  dailyPnL,
  winLossStats,
  resultAnalysisIntro,
  tipsForNextWeek,
}: TraderStatsEmailProps) {
  const unsubscribeUrl = email 
    ? `https://deltalytix.app/api/email/unsubscribe?email=${encodeURIComponent(email)}`
    : '#';
  
  // Calculate win rate percentage
  const totalTrades = winLossStats.wins + winLossStats.losses;
  const winRate = ((winLossStats.wins / totalTrades) * 100).toFixed(1);
  
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
      <Preview>Vos statistiques de trading de la semaine - Deltalytix</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Section className="bg-white max-w-[600px] mx-auto rounded-lg shadow-sm">
            <Section className="px-6 py-8">
              <Heading className="text-2xl font-bold text-gray-900 mb-6">
                Bonjour {firstName},
              </Heading>
              
              <Text className="text-gray-800 mb-6 leading-6">
                {resultAnalysisIntro}
              </Text>

              {/* Calendar View */}
              <Section className="mb-8">
                <Heading className="text-xl font-semibold text-gray-900 mb-4">
                  Performances Journalières
                </Heading>
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                  <tr className="bg-gray-50">
                    <td className="w-1/5 p-2 text-center text-sm text-gray-600 border border-gray-200">Lun</td>
                    <td className="w-1/5 p-2 text-center text-sm text-gray-600 border border-gray-200">Mar</td>
                    <td className="w-1/5 p-2 text-center text-sm text-gray-600 border border-gray-200">Mer</td>
                    <td className="w-1/5 p-2 text-center text-sm text-gray-600 border border-gray-200">Jeu</td>
                    <td className="w-1/5 p-2 text-center text-sm text-gray-600 border border-gray-200">Ven</td>
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
                              <Text className={`text-sm font-semibold ${getPnLColor(day.pnl)} w-full text-center`}>
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
                  Distribution Gains/Pertes
                </Heading>
                <Section className="bg-gray-50 rounded-lg p-4 mb-4">
                  <table className="w-full">
                    <tr>
                      <td className="w-1/2 text-center">
                        <Text className="text-2xl font-bold text-green-600 mb-2">
                          {winLossStats.wins}
                        </Text>
                        <Text className="text-sm text-gray-600">Gains</Text>
                      </td>
                      <td className="w-1/2 text-center">
                        <Text className="text-2xl font-bold text-red-600 mb-2">
                          {winLossStats.losses}
                        </Text>
                        <Text className="text-sm text-gray-600">Pertes</Text>
                      </td>
                    </tr>
                  </table>
                  <Text className="text-lg font-semibold mt-4">
                    Taux de réussite: {winRate}%
                  </Text>
                </Section>
              </Section>


              <Text className="text-gray-800 mb-6 leading-6">
                {tipsForNextWeek}
              </Text>

              <Section className="text-center mb-8">
                <Button 
                  className="bg-black text-white text-sm px-6 py-2.5 rounded-md font-medium box-border"
                  href="https://deltalytix.app/dashboard"
                >
                  Voir mes statistiques détaillées →
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

TraderStatsEmail.PreviewProps = {
  firstName: "Jean",
  dailyPnL: [
    { date: "01/05", pnl: 250.50, weekday: 0 },
    { date: "02/05", pnl: -120.30, weekday: 1 },
    { date: "03/05", pnl: 340.80, weekday: 2 },
    { date: "04/05", pnl: 180.20, weekday: 3 },
    { date: "05/05", pnl: -90.40, weekday: 4 },
    { date: "08/05", pnl: 220.60, weekday: 0 },
    { date: "09/05", pnl: 150.30, weekday: 1 },
    { date: "10/05", pnl: -80.20, weekday: 2 },
    { date: "11/05", pnl: 290.40, weekday: 3 },
    { date: "12/05", pnl: 175.90, weekday: 4 },
  ],
  winLossStats: {
    wins: 7,
    losses: 3
  }
};