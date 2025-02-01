'use client'
import { createClient } from '@/hooks/auth';
import { User } from '@supabase/supabase-js';
import { useRouter, useParams } from 'next/navigation';
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { getSubscriptionDetails } from "@/server/subscription"
import { getTrades } from '@/server/database'
import { Trade as PrismaTrade } from '@prisma/client'
import { getTickDetails } from '@/server/tick-details'
import { calculateStatistics, formatCalendarData } from '@/lib/utils'
import { parseISO, isValid, startOfDay, endOfDay } from 'date-fns'
import { getShared, SharedParams } from '@/server/shared'
import { formatInTimeZone } from 'date-fns-tz'
import { loadInitialData, loadSharedData, LayoutItem as ServerLayoutItem, Layouts as ServerLayouts } from '@/server/user-data'
import { saveDashboardLayout } from '@/server/database'
import { WidgetType, WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard'

const supabase = createClient();

// Types from trades-data.tsx
type StatisticsProps = {
  cumulativeFees: number
  cumulativePnl: number
  winningStreak: number
  winRate: number
  nbTrades: number
  nbBe: number
  nbWin: number
  nbLoss: number
  totalPositionTime: number
  averagePositionTime: string
}

type CalendarData = {
  [date: string]: {
    pnl: number
    tradeNumber: number
    longNumber: number
    shortNumber: number
    trades: PrismaTrade[]
  }
}

interface DateRange {
  from: Date
  to: Date
}

interface TickRange {
  min: number | undefined
  max: number | undefined
}

interface PnlRange {
  min: number | undefined
  max: number | undefined
}

interface TickDetail {
  ticker: string
  tickValue: number
}

interface TradeWithUTC extends PrismaTrade {
  utcDateStr: string;
}

interface LayoutItem extends ServerLayoutItem {}

interface Layouts extends ServerLayouts {}

// Add after the interfaces and before the UserDataContext
const defaultLayouts: Layouts = {
  desktop: [
    {
      i: "widget1732477563848",
      type: "calendarWidget" as WidgetType,
      size: "large" as WidgetSize,
      x: 0,
      y: 1,
      w: 6,
      h: 8
    },
    {
      i: "widget1732477566865",
      type: "equityChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 6,
      y: 1,
      w: 6,
      h: 4
    },
    {
      i: "widget1734881247979",
      type: "cumulativePnl" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 0,
      w: 3,
      h: 1
    }
  ],
  mobile: [
    {
      i: "widget1732477563848",
      type: "calendarWidget" as WidgetType,
      size: "large" as WidgetSize,
      x: 0,
      y: 2,
      w: 12,
      h: 6
    },
    {
      i: "widget1732477566865",
      type: "equityChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 8,
      w: 12,
      h: 4
    },
    {
      i: "widget1734881247979",
      type: "cumulativePnl" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 0,
      w: 12,
      h: 1
    }
  ]
};

// Combined Context Type
interface UserDataContextType {
  // User related
  user: User | null
  subscription: {
    isActive: boolean
    plan: string | null
    status: string
    endDate: Date | null
    trialEndsAt: Date | null
  } | null
  isPlusUser: () => boolean
  isLoading: boolean
  isMobile: boolean
  isSharedView: boolean

  // Trades related
  trades: TradeWithUTC[]
  setTrades: React.Dispatch<React.SetStateAction<TradeWithUTC[]>>
  refreshTrades: () => Promise<void>
  updateTrade: (tradeId: string, updates: Partial<TradeWithUTC>) => void
  sharedParams: SharedParams | null
  
  // Formatted trades and filters
  formattedTrades: TradeWithUTC[]
  instruments: string[]
  setInstruments: React.Dispatch<React.SetStateAction<string[]>>
  accountNumbers: string[]
  setAccountNumbers: React.Dispatch<React.SetStateAction<string[]>>
  dateRange: DateRange | undefined
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>
  tickRange: TickRange
  setTickRange: React.Dispatch<React.SetStateAction<TickRange>>
  pnlRange: PnlRange
  setPnlRange: React.Dispatch<React.SetStateAction<PnlRange>>
  
  // Statistics and calendar
  statistics: StatisticsProps
  calendarData: CalendarData

  // Layout related - updated to non-nullable
  layouts: Layouts
  setLayouts: React.Dispatch<React.SetStateAction<Layouts>>
  saveLayouts: (newLayouts: Layouts) => Promise<void>
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

// Add this hook before the UserDataProvider component
function useIsMobileDetection() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const checkMobile = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    
    // Check immediately
    checkMobile(mobileQuery);
    
    // Add listener for changes
    mobileQuery.addEventListener('change', checkMobile);
    return () => mobileQuery.removeEventListener('change', checkMobile);
  }, []);

  return isMobile;
}

export const UserDataProvider: React.FC<{ 
  children: React.ReactNode;
  isSharedView?: boolean;
}> = ({ children, isSharedView = false }) => {
  const params = useParams();
  
  // Move isMobile to the top using our new hook
  const isMobile = useIsMobileDetection();
  
  // User state - null for shared views
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<UserDataContextType['subscription']>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Trades state
  const [trades, setTrades] = useState<TradeWithUTC[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [accountNumbers, setAccountNumbers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tickRange, setTickRange] = useState<TickRange>({ min: undefined, max: undefined });
  const [pnlRange, setPnlRange] = useState<PnlRange>({ min: undefined, max: undefined });
  const [sharedParams, setSharedParams] = useState<SharedParams | null>(null);

  // Initialize layouts with default layouts for shared views
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);

  // Update the fetchData function to handle shared views
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      if (params?.slug) {
        // Load shared data
        const sharedData = await loadSharedData(params.slug as string);
        if (!sharedData.error) {
          const processedSharedTrades = sharedData.trades.map(trade => ({
            ...trade,
            utcDateStr: formatInTimeZone(new Date(trade.entryDate), 'UTC', 'yyyy-MM-dd')
          }));
          setTrades(processedSharedTrades);
          setSharedParams(sharedData.params);
          
          // Set layouts from shared data or use defaults
          if (sharedData.params.desktop || sharedData.params.mobile) {
            setLayouts({
              desktop: sharedData.params.desktop || defaultLayouts.desktop,
              mobile: sharedData.params.mobile || defaultLayouts.mobile
            });
          } else {
            setLayouts(defaultLayouts);
          }
        }
      } else if (!isSharedView) {
        // Only load user data if not in shared view
        const data = await loadInitialData();
        if (!data.error) {
          setUser(data.user);
          setSubscription(data.subscription);
          
          // Only set layouts if we have user data
          if (data.layouts) {
            // Ensure loaded layouts are valid
            const loadedLayouts = data.layouts;
            const safeLayouts = {
              desktop: Array.isArray(loadedLayouts.desktop) ? loadedLayouts.desktop : [],
              mobile: Array.isArray(loadedLayouts.mobile) ? loadedLayouts.mobile : [],
            };
            // Only use default layouts if both arrays are empty
            if (safeLayouts.desktop.length === 0 && safeLayouts.mobile.length === 0) {
              setLayouts(defaultLayouts);
            } else {
              setLayouts(safeLayouts);
            }
          } else {
            // No layouts found, use defaults
            setLayouts(defaultLayouts);
          }

          const processedTrades = data.trades.map(trade => ({
            ...trade,
            utcDateStr: formatInTimeZone(new Date(trade.entryDate), 'UTC', 'yyyy-MM-dd')
          }));
          setTrades(processedTrades);

          // Set date range if trades exist
          if (processedTrades.length > 0) {
            const dates = processedTrades
              .map(trade => parseISO(trade.entryDate))
              .filter(date => isValid(date));

            if (dates.length > 0) {
              const minDate = new Date(Math.min(...dates.map(date => date.getTime())));
              const maxDate = new Date(Math.max(
                ...dates.map(date => date.getTime()),
                new Date().getTime()
              ));
              setDateRange({ from: startOfDay(minDate), to: endOfDay(maxDate) });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Don't set default layouts on error - let the UI handle the loading state
    } finally {
      setIsLoading(false);
    }
  }, [params?.slug, isSharedView]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update saveLayouts to handle shared views
  const saveLayouts = useCallback(async (newLayouts: Layouts) => {
    if (!user?.id || isSharedView) return; // Don't save layouts in shared view
    try {
      // Ensure the new layouts have both desktop and mobile arrays
      const safeNewLayouts = {
        desktop: Array.isArray(newLayouts.desktop) ? newLayouts.desktop : defaultLayouts.desktop,
        mobile: Array.isArray(newLayouts.mobile) ? newLayouts.mobile : defaultLayouts.mobile,
      };
      await saveDashboardLayout(user.id, safeNewLayouts);
      setLayouts(safeNewLayouts);
    } catch (error) {
      console.error('Error saving layouts:', error);
      setLayouts(defaultLayouts);
    }
  }, [user?.id, isSharedView]);

  const refreshTrades = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  const updateTrade = useCallback((tradeId: string, updates: Partial<TradeWithUTC>) => {
    setTrades(prevTrades => 
      prevTrades.map(trade => 
        trade.id === tradeId ? { 
          ...trade, 
          ...updates,
          utcDateStr: updates.entryDate 
            ? formatInTimeZone(new Date(updates.entryDate), 'UTC', 'yyyy-MM-dd')
            : trade.utcDateStr
        } : trade
      )
    );
  }, []);

  const userTimeZone = useMemo(() => 
    Intl.DateTimeFormat().resolvedOptions().timeZone
  , []);

  const dateRangeBoundaries = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return null;
    return {
      from: startOfDay(new Date(formatInTimeZone(dateRange.from, userTimeZone, 'yyyy-MM-dd HH:mm:ssXXX'))),
      to: endOfDay(new Date(formatInTimeZone(dateRange.to, userTimeZone, 'yyyy-MM-dd HH:mm:ssXXX')))
    };
  }, [dateRange, userTimeZone]);

  // Memoize filtered trades by instrument
  const instrumentFiltered = useMemo(() => {
    if (isSharedView) return trades;
    if (instruments.length === 0) return trades;
    return trades.filter(trade => instruments.includes(trade.instrument));
  }, [trades, instruments, isSharedView]);

  // Memoize filtered trades by account
  const accountFiltered = useMemo(() => {
    if (accountNumbers.length === 0) return instrumentFiltered;
    return instrumentFiltered.filter(trade => accountNumbers.includes(trade.accountNumber));
  }, [instrumentFiltered, accountNumbers]);

  // Memoize filtered trades by date
  const dateFiltered = useMemo(() => {
    if (!dateRangeBoundaries) return accountFiltered;
    return accountFiltered.filter(trade => {
      const entryDate = new Date(formatInTimeZone(
        parseISO(trade.entryDate),
        userTimeZone,
        'yyyy-MM-dd HH:mm:ssXXX'
      ));
      return entryDate >= dateRangeBoundaries.from && entryDate <= dateRangeBoundaries.to;
    });
  }, [accountFiltered, dateRangeBoundaries, userTimeZone]);

  // Memoize filtered trades by PnL
  const pnlFiltered = useMemo(() => {
    if (pnlRange.min === undefined && pnlRange.max === undefined) return dateFiltered;
    return dateFiltered.filter(trade => 
      (pnlRange.min === undefined || trade.pnl >= pnlRange.min) &&
      (pnlRange.max === undefined || trade.pnl <= pnlRange.max)
    );
  }, [dateFiltered, pnlRange]);

  // Remove processedTrades memo since we now process them at load time
  const formattedTrades = useMemo(() => {
    if(isSharedView) {
      return trades.filter(trade => 
        accountNumbers.length === 0 || accountNumbers.includes(trade.accountNumber)
      );
    }

    return trades
      .filter(trade => {
        const entryDate = parseISO(trade.entryDate);
        if (!isValid(entryDate)) return false;

        const matchesInstruments = instruments.length === 0 || instruments.includes(trade.instrument);
        const matchesAccounts = accountNumbers.length === 0 || accountNumbers.includes(trade.accountNumber);
        const matchesDateRange = !dateRange?.from || !dateRange?.to || (
          entryDate >= startOfDay(dateRange.from) && 
          entryDate <= endOfDay(dateRange.to)
        );
        const matchesPnlRange = (
          (pnlRange.min === undefined || trade.pnl >= pnlRange.min) &&
          (pnlRange.max === undefined || trade.pnl <= pnlRange.max)
        );
        
        return matchesInstruments && matchesAccounts && matchesDateRange && matchesPnlRange;
      })
      .sort((a, b) => parseISO(a.entryDate).getTime() - parseISO(b.entryDate).getTime());
  }, [trades, instruments, accountNumbers, dateRange, pnlRange, isSharedView]);

  const statistics = useMemo(() => calculateStatistics(formattedTrades), [formattedTrades]);
  const calendarData = useMemo(() => formatCalendarData(formattedTrades), [formattedTrades]);

  const isPlusUser = () => {
    return Boolean(subscription?.isActive && ['plus', 'pro'].includes(subscription?.plan?.split('_')[0].toLowerCase()||''));
  };

  const contextValue = {
    // User related
    user,
    subscription,
    isPlusUser,
    isLoading,
    isMobile,
    isSharedView,

    // Trades related
    trades,
    setTrades,
    refreshTrades,
    updateTrade,
    sharedParams,

    // Formatted trades and filters
    formattedTrades,
    instruments,
    setInstruments,
    accountNumbers,
    setAccountNumbers,
    dateRange,
    setDateRange,
    tickRange,
    setTickRange,
    pnlRange,
    setPnlRange,

    // Statistics and calendar
    statistics,
    calendarData,

    // Add layout values
    layouts,
    setLayouts,
    saveLayouts,
  };

  return (
    <UserDataContext.Provider value={contextValue}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};