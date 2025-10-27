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
  Row,
  Column,
  Container,
  Tailwind,
  Text,
} from '@react-email/components';

interface TraderStatsEmailProps {
  email: string;
  firstName?: string;
  dailyPnL: {
    date: Date;
    pnl: number;
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
    weekdays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],
    warmUpMessage: 'Je vois que cette semaine a été difficile. Je serais ravi de discuter avec vous pour comprendre vos défis et vous aider à améliorer vos performances. Prenons rendez-vous pour un appel personnalisé.',
    scheduleCall: 'Planifier un appel* →',
    learningOpportunities: 'Opportunités d\'apprentissage',
    nextStepsTitle: 'Prochaines étapes pour s\'améliorer',
    insightsTitle: 'Principales observations',
    growthMindset: 'Souvenez-vous : Chaque journée difficile est une opportunité d\'apprentissage. Les traders les plus performants considèrent les pertes comme des données précieuses.',
    activityTitle: 'Votre activité de trading',
    tradingActivity: 'Activité de trading',
    daysTraded: 'Jours tradés',
    averageTrades: 'Trades moyens',
    mostActiveDay: 'Jour le plus actif',
    positiveOutlook: 'La constance est la clé du succès. Continuez à trader régulièrement pour améliorer vos compétences.',
    contributions: 'jours d\'activité de trading',
    less: 'Moins',
    more: 'Plus',
    currentStreak: 'Série actuelle',
    longestStreak: 'Plus longue série',
    totalTradingDays: 'Jours de trading totaux',
    daysLabel: 'jours',
    weekLabel: 'Semaine',
    activityLegend: 'activités de trading',
    activityIntensity: 'Intensité de l\'activité',
    weekNumber: (week: number) => `Semaine ${week}`,
    bookCall: 'Réserver un appel*',
    visitDashboard: 'Voir le tableau de bord',
    callDisclaimer: '*Cet appel est 100% gratuit. Profitez-en pour échanger avec un autre trader et réfléchir à votre trading.',
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
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    warmUpMessage: 'I see this week has been challenging. I\'d love to discuss your challenges and help you improve your performance. Let\'s schedule a personalized call.',
    scheduleCall: 'Schedule a call* →',
    learningOpportunities: 'Learning Opportunities',
    nextStepsTitle: 'Next Steps for Improvement',
    insightsTitle: 'Key Insights',
    growthMindset: 'Remember: Every challenging day is a learning opportunity. The most successful traders view losses as valuable data points.',
    activityTitle: 'Your Trading Activity',
    tradingActivity: 'Trading Activity',
    daysTraded: 'Days Traded',
    averageTrades: 'Avg. Trades/Day',
    mostActiveDay: 'Most Active Day',
    positiveOutlook: 'Consistency is key to success. Keep trading regularly to build your skills.',
    contributions: 'days of trading activity',
    less: 'Less',
    more: 'More',
    currentStreak: 'Current streak',
    longestStreak: 'Longest streak',
    totalTradingDays: 'Total trading days',
    daysLabel: 'days',
    weekLabel: 'Week',
    activityLegend: 'trading activities',
    activityIntensity: 'Activity Intensity',
    weekNumber: (week: number) => `Week ${week}`,
    bookCall: 'Book a call*',
    visitDashboard: 'Visit Dashboard',
    callDisclaimer: '*This call is 100% free. Take it as an opportunity to speak with a fellow trader and reflect on your trading.',
  }
};

function getWeekNumber(date: Date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function compareDates(dateA: Date, dateB: Date) {
  return dateA.getTime() - dateB.getTime();
}

function formatPnL(value: number): string {
  // For values >= 1000 or <= -1000, use K format
  if (Math.abs(value) >= 1000) {
    return `${Math.trunc(value / 1000)}K`
  }
  // For values between -1000 and 1000, show no decimals
  return Math.trunc(value).toString()
}

// Helper function to count trading days
function countTradingDays(dailyPnL: TraderStatsEmailProps['dailyPnL']) {
  return dailyPnL.length;
}

// Helper function to find most active day
function findMostActiveDay(dailyPnL: TraderStatsEmailProps['dailyPnL']) {
  if (dailyPnL.length === 0) return '-';

  // In a real scenario, we would count trades per day
  // For now, just return the date with the highest absolute PnL as a proxy for activity
  const mostActiveIndex = dailyPnL.reduce((maxIndex, day, currentIndex, array) => {
    return Math.abs(day.pnl) > Math.abs(array[maxIndex].pnl) ? currentIndex : maxIndex;
  }, 0);

  return dailyPnL[mostActiveIndex].date;
}

// Trading activity cell component like GitHub contribution graph
const TradingActivityCell = ({ level }: { level: number }) => {
  // Level 0-4 representing trading activity intensity with blue color scheme
  const colors = [
    'bg-[#ebedf0]', // No activity
    'bg-[#c6d7f9]', // Low activity
    'bg-[#8badf3]', // Moderate activity
    'bg-[#5a8bec]', // High activity
    'bg-[#3469DF]', // Very high activity - main blue color
  ];

  return (
    <div
      className={`${colors[level]} w-[14px] h-[14px] rounded-[2px] m-px`}
    />
  );
};

// Helper function to parse date in DD/MM format
function parseDate(dateStr: string): Date {
  const [day, month] = dateStr.split('/').map(Number);
  const currentYear = new Date().getFullYear();
  return new Date(currentYear, month - 1, day);
}

interface TradingActivityGridData {
  grid: number[][];
  weekNumbers: number[];
  dayLabels: string[];
}

// Generate trading activity data for the weekly recap
function generateTradingActivityGrid(dailyPnL: TraderStatsEmailProps['dailyPnL']): TradingActivityGridData {
  // Create a 2x5 grid (2 weeks x 5 trading days) with all cells initialized to 0
  const grid = Array(2).fill(0).map(() => Array(5).fill(0));

  if (dailyPnL.length === 0) return { grid, weekNumbers: [], dayLabels: [] };

  // Sort dailyPnL by date
  const sortedDailyPnL = [...dailyPnL].sort((a, b) => compareDates(a.date, b.date));

  // Get the last date from the sorted trades
  const lastDate = sortedDailyPnL[sortedDailyPnL.length - 1].date;
  
  // Set end date to the Friday of the current week
  const endDate = new Date(lastDate);
  const daysTillFriday = 5 - ((lastDate.getDay() + 6) % 7); // Convert Sunday=0 to Monday=0, then find days until Friday
  endDate.setDate(endDate.getDate() + (daysTillFriday <= 0 ? daysTillFriday + 7 : daysTillFriday));

  // Set start date to 2 weeks before end date
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 2 * 7);

  // Create a map of trading activity (date -> activity level based on PnL)
  const activityMap = new Map<string, number>();

  // Find the max absolute PnL to normalize activity levels
  const maxAbsPnL = Math.max(...sortedDailyPnL.map(day => Math.abs(day.pnl)));

  // Map each day's PnL to an activity level (1-4)
  sortedDailyPnL.forEach(day => {
    const level = Math.max(1, Math.min(4, Math.ceil((Math.abs(day.pnl) / maxAbsPnL) * 4)));
    activityMap.set(day.date.toISOString().split('T')[0], level);
  });

  // Get current week number and previous week number
  const currentWeekNumber = getWeekNumber(endDate);
  const previousWeekNumber = currentWeekNumber - 1;

  const weekNumbers = [previousWeekNumber, currentWeekNumber];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // Populate grid with actual trading data
  const currentDate = new Date(startDate);
  let currentRow = 0;

  while (currentDate <= endDate && currentRow < 2) {
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const weekday = (currentDate.getDay() + 6) % 7; // Convert to Monday-based (0-4)
      
      if (activityMap.has(dateKey)) {
        grid[currentRow][weekday] = activityMap.get(dateKey) || 0;
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    
    // If we've reached Friday, move to next week
    if (currentDate.getDay() === 6) { // Saturday
      currentRow++;
      currentDate.setDate(currentDate.getDate() + 2); // Skip to Monday
    }
  }

  return { grid, weekNumbers, dayLabels };
}

// Calculate trading streak
function calculateTradingStreak(dailyPnL: TraderStatsEmailProps['dailyPnL']): { current: number, longest: number } {
  if (dailyPnL.length === 0) return { current: 0, longest: 0 };

  // Sort by date
  const sortedDates = [...dailyPnL]
    .sort((a, b) => compareDates(a.date, b.date))
    .map(day => day.date);

  // For a real streak calculation, we'd need to identify consecutive trading days
  // As a simple approximation, we'll count groups of consecutive dates
  const currentStreak = 1;
  const longestStreak = 1;

  // In a real implementation, you'd use actual consecutive trading days
  // This is just a placeholder calculation
  const hasRecentActivity = sortedDates.length > 0;
  const currentStreakValue = hasRecentActivity ? Math.min(sortedDates.length, 5) : 0;
  const longestStreakValue = hasRecentActivity ? Math.max(5, Math.min(sortedDates.length * 1.5, 15)) : 0;

  return {
    current: Math.round(currentStreakValue),
    longest: Math.round(longestStreakValue)
  };
}

// Reusable ActionButtons component
const ActionButtons = ({ t }: { t: typeof translations.fr }) => (
  <Section className="mb-8">
    <table className="w-full border-collapse mb-[20px]">
      <tbody>
        <tr>
          <td className="w-[50%] pr-[8px]">
            <div className="bg-[#3469DF] rounded-[6px] text-center py-[12px] px-[16px] box-border">
              <Link
                href="https://cal.com/hugo-demenez/deltalytix-discussion"
                className="text-white font-medium no-underline text-[14px]"
              >
                {t.bookCall}
              </Link>
            </div>
          </td>
          <td className="w-[50%] pl-[8px]">
            <div className="bg-white border border-[#3469DF] rounded-[6px] text-center py-[12px] px-[16px] box-border">
              <Link
                href="https://deltalytix.app/dashboard"
                className="text-[#3469DF] font-medium no-underline text-[14px]"
              >
                {t.visitDashboard}
              </Link>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <Text className="text-[12px] text-gray-500 mt-[4px] text-left">
      {t.callDisclaimer}
    </Text>
  </Section>
);

// Helper function to format date to DD/MM
function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit'
  });
}

// Helper function to get weekday (0 = Monday, 4 = Friday)
function getWeekday(date: Date): number {
  return date.getDay() === 0 ? 6 : date.getDay() - 1;
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
        firstDate: day.date
      };
    }
    acc[weekNum].days[getWeekday(day.date)] = {
      ...day,
      formattedDate: formatDate(day.date)
    };
    if (compareDates(day.date, acc[weekNum].firstDate) < 0) {
      acc[weekNum].firstDate = day.date;
    }
    return acc;
  }, {} as Record<number, { days: ((typeof sortedDailyPnL[0] & { formattedDate: string }) | null)[], firstDate: Date }>);

  // Sort weeks by their first date (ascending order) and get the two most recent weeks
  const sortedWeeks = Object.entries(weekData)
    .sort((a, b) => compareDates(a[1].firstDate, b[1].firstDate)) // Changed sort order to ascending
    .slice(-2) // Take last 2 weeks instead of first 2
    .map(([_, data]) => data.days);

  // If we don't have two weeks, pad with empty week at the beginning
  while (sortedWeeks.length < 2) {
    sortedWeeks.unshift(Array(5).fill(null)); // Add empty weeks at the start
  }

  // Calculate trading streaks
  const streaks = calculateTradingStreak(dailyPnL);
  const currentStreak = streaks.current;
  const longestStreak = streaks.longest;
  const totalTradingDays = dailyPnL.length;

  // Generate activity grid data
  const { grid, weekNumbers, dayLabels } = generateTradingActivityGrid(dailyPnL);

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Section className="bg-white max-w-[600px] mx-auto rounded-lg shadow-xs">
            <Section className="px-6 py-8">
              <Heading className="text-2xl font-bold text-gray-900 mb-6">
                {t.greeting} {firstName},
              </Heading>
              <Text className="text-gray-400 mb-6 leading-6">
                {t.disclaimer}
              </Text>

              <Text className="text-gray-800 mb-6 leading-6">
                {resultAnalysisIntro}
              </Text>

              {isPositivePerformance ? (
                <>
                  {/* Calendar View - Only shown for positive performance */}
                  <Section className="mb-8">
                    <Heading className="text-xl font-semibold text-gray-900 mb-4">
                      {t.dailyPerformance}
                    </Heading>
                    <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                      <tr className="bg-gray-50">
                        {t.weekdays.map((day: string) => (
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
                                    {day.formattedDate}
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
                </>
              ) : (
                <>
                  {/* GitHub-style Contribution Graph for trading activity */}
                  <Section className="mb-8">
                    <Heading className="text-xl font-semibold text-gray-900 mb-4">
                      {t.activityTitle}
                    </Heading>
                    <div className="overflow-auto">
                      <table className="mx-auto border-collapse border border-[#d0d7de] rounded-[6px] bg-white" cellPadding="16">
                        <thead>
                          <tr>
                            <th className="text-[12px] text-[#57606a] pr-[8px] text-left"></th>
                            {t.weekdays.map((day: string, index: number) => (
                              <th key={`header-${index}`} className="text-[12px] text-[#57606a] font-normal p-[4px]">
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {grid.map((row: number[], rowIndex: number) => (
                            <tr key={`row-${rowIndex}`}>
                              <td className="text-[13px] font-medium text-[#24292f] pr-[12px]">
                                {t.weekNumber(weekNumbers[rowIndex])}
                              </td>
                              {row.map((level: number, colIndex: number) => (
                                <td key={`cell-${rowIndex}-${colIndex}`} className="p-0">
                                  <TradingActivityCell level={level} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Activity stats */}
                    <div className="mt-[16px] mb-[24px] text-center">
                      <Text className="text-[14px] text-[#57606a] m-0">
                        <strong className="text-[#24292f]">{totalTradingDays}</strong> {t.contributions}
                      </Text>

                      <div className="flex flex-row mt-[8px] items-center justify-center">
                        <Text className="text-[12px] text-[#57606a] mr-[4px] m-0">{t.less}</Text>
                        <div className="bg-[#ebedf0] w-[14px] h-[14px] rounded-[2px] mx-px" />
                        <div className="bg-[#c6d7f9] w-[14px] h-[14px] rounded-[2px] mx-px" />
                        <div className="bg-[#8badf3] w-[14px] h-[14px] rounded-[2px] mx-px" />
                        <div className="bg-[#5a8bec] w-[14px] h-[14px] rounded-[2px] mx-px" />
                        <div className="bg-[#3469DF] w-[14px] h-[14px] rounded-[2px] mx-px" />
                        <Text className="text-[12px] text-[#57606a] ml-[4px] m-0">{t.more}</Text>
                      </div>
                      <Text className="text-[12px] text-[#57606a] mt-[4px] m-0">
                        {t.activityIntensity}
                      </Text>
                    </div>
                  </Section>
                </>
              )}

              {/* Win/Loss Distribution - Only shown for positive performance */}
              {isPositivePerformance && (
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
              )}

              {isPositivePerformance ? (
                <>
                  <Text className="text-gray-800 mb-6 leading-6">
                    {tipsForNextWeek}
                  </Text>

                  <ActionButtons t={t} />
                </>
              ) : (
                <>
                  {/* Growth Mindset Section for Negative Performance */}
                  <Section className="bg-blue-50 rounded-lg p-6 mb-8">
                    <Heading className="text-xl font-semibold text-gray-900 mb-3">
                      {t.insightsTitle}
                    </Heading>
                    <Text className="text-gray-800 mb-4 leading-6">
                      {t.growthMindset}
                    </Text>
                    <Text className="text-gray-800 mb-0 leading-6">
                      {tipsForNextWeek}
                    </Text>
                  </Section>

                  <Section className="mb-8">
                    <Heading className="text-xl font-semibold text-gray-900 mb-4">
                      {t.nextStepsTitle}
                    </Heading>

                    <ActionButtons t={t} />
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

