'use client'
import { createClient } from '@/hooks/auth';
import { User } from '@supabase/supabase-js';
import { useRouter, useParams } from 'next/navigation';
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { getSubscriptionDetails } from "@/server/subscription"
import { getTrades } from '@/server/database'
import { Trade as PrismaTrade, Tag } from '@prisma/client'
import { getTickDetails } from '@/server/tick-details'
import { calculateStatistics, formatCalendarData } from '@/lib/utils'
import { parseISO, isValid, startOfDay, endOfDay } from 'date-fns'
import { getShared, SharedParams } from '@/server/shared'
import { formatInTimeZone } from 'date-fns-tz'
import { loadInitialData, loadSharedData, LayoutItem as ServerLayoutItem, Layouts as ServerLayouts } from '@/server/user-data'
import { saveDashboardLayout } from '@/server/database'
import { WidgetType, WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard'
import type { Account as PropFirmAccount } from '@prisma/client'
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
  profitFactor: number
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

// Add new interface for time range
interface TimeRange {
  range: string | null
}

interface TradeWithUTC extends PrismaTrade {
  utcDateStr: string;
}

interface LayoutItem extends ServerLayoutItem {}

interface Layouts extends ServerLayouts {}

// Add new interface for tick filter
interface TickFilter {
  value: string | null
}

// Update WeekdayFilter interface to use numbers
interface WeekdayFilter {
  day: number | null
}

// Add new interface for hour filter
interface HourFilter {
  hour: number | null
}

// Add tag filter interface
interface TagFilter {
  tags: string[]
}

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
      i: "widget1734881236127",
      type: "pnlChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 6,
      y: 5,
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
    },
    {
      i: "widget1734881251266",
      type: "longShortPerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 3,
      y: 0,
      w: 3,
      h: 1
    },
    {
      i: "widget1734881254352",
      type: "tradePerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 6,
      y: 0,
      w: 3,
      h: 1
    },
    {
      i: "widget1734881263452",
      type: "averagePositionTime" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 9,
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
      h: 6
    },
    {
      i: "widget1734881247979",
      type: "cumulativePnl" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 0,
      w: 12,
      h: 1
    },
    {
      i: "widget1734881254352",
      type: "tradePerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 1,
      w: 12,
      h: 1
    }
  ]
};

// Combined Context Type
interface UserDataContextType {
  // User related
  user: User | null
  etpToken: string | null
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
  isFirstConnection: boolean
  setIsFirstConnection: (isFirstConnection: boolean) => void
  refreshUser: () => Promise<void>

  // Trades related
  trades: TradeWithUTC[]
  setTrades: React.Dispatch<React.SetStateAction<TradeWithUTC[]>>
  refreshTrades: () => Promise<void>
  updateTrade: (tradeId: string, updates: Partial<TradeWithUTC>) => void
  sharedParams: SharedParams | null
  
  // Tick details
  tickDetails: Record<string, number>
  
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

  // Time range related
  timeRange: TimeRange
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>

  // Tick filter related
  tickFilter: TickFilter
  setTickFilter: React.Dispatch<React.SetStateAction<TickFilter>>

  // Weekday filter related
  weekdayFilter: WeekdayFilter
  setWeekdayFilter: React.Dispatch<React.SetStateAction<WeekdayFilter>>

  // Hour filter related
  hourFilter: HourFilter
  setHourFilter: React.Dispatch<React.SetStateAction<HourFilter>>

  // Add timezone management
  timezone: string
  setTimezone: React.Dispatch<React.SetStateAction<string>>

  // Add tag filter
  tagFilter: TagFilter
  setTagFilter: React.Dispatch<React.SetStateAction<TagFilter>>

  // New functions
  updateTrades: (updates: { id: string, updates: Partial<TradeWithUTC> }[]) => void
  removeTagFromAllTrades: (tagToRemove: string) => void

  // New properties
  tags: Tag[]
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>

  // Add propfirm accounts
  propfirmAccounts: PropFirmAccount[]
  setPropfirmAccounts: React.Dispatch<React.SetStateAction<PropFirmAccount[]>>
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

const CACHE_KEY = 'deltalytix_user_data';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CachedData {
  timestamp: number;
  user: User | null;
  etpToken: string | null;
  subscription: UserDataContextType['subscription'];
  trades: TradeWithUTC[];
  tickDetails: Record<string, number>;
  tags: Tag[];
  propfirmAccounts: PropFirmAccount[];
  layouts: Layouts;
}

// Add this function before the UserDataProvider
function getLocalCache(): CachedData | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  
  try {
    const parsedCache = JSON.parse(cached);
    if (Date.now() - parsedCache.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsedCache;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setLocalCache(data: Partial<CachedData>) {
  if (typeof window === 'undefined') return;
  const existing = getLocalCache();
  const newCache = {
    ...existing,
    ...data,
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
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
  const [etpToken, setEtpToken] = useState<string | null>(null);
  const [isFirstConnection, setIsFirstConnection] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<UserDataContextType['subscription']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tickDetails, setTickDetails] = useState<Record<string, number>>({});
  const [tags, setTags] = useState<Tag[]>([]);

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

  // Time range state
  const [timeRange, setTimeRange] = useState<TimeRange>({ range: null });

  // Add tick filter state
  const [tickFilter, setTickFilter] = useState<TickFilter>({ value: null });

  // Add weekday filter state
  const [weekdayFilter, setWeekdayFilter] = useState<WeekdayFilter>({ day: null });

  // Add hour filter state
  const [hourFilter, setHourFilter] = useState<HourFilter>({ hour: null });

  // Add timezone state
  const [timezone, setTimezone] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedTimezone = localStorage.getItem('userTimezone');
      return savedTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return 'UTC';
  });

  // Save timezone to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userTimezone', timezone);
    }
  }, [timezone]);

  // Update userTimeZone to use the selected timezone
  const userTimeZone = useMemo(() => timezone, [timezone]);

  // Add tag filter state
  const [tagFilter, setTagFilter] = useState<TagFilter>({ tags: [] })

  // Add propfirm accounts state
  const [propfirmAccounts, setPropfirmAccounts] = useState<PropFirmAccount[]>([])

  // Initialize state from cache
  useEffect(() => {
    if (!isSharedView) {
      const cached = getLocalCache();
      if (cached) {
        // Set loading state while restoring from cache
        setIsLoading(true);
        
        // Restore all state from cache
        setUser(cached.user);
        setEtpToken(cached.etpToken);
        setSubscription(cached.subscription);
        setTrades(cached.trades);
        setTickDetails(cached.tickDetails);
        setTags(cached.tags);
        setPropfirmAccounts(cached.propfirmAccounts);
        setLayouts(cached.layouts);
        
        // Update date range if needed
        if (cached.trades?.length > 0) {
          const dates = cached.trades
            .map(trade => new Date(formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd HH:mm:ssXXX')))
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
        
        // Set loading to false after cache restoration
        setIsLoading(false);
      }
    }
  }, [isSharedView, timezone]);

  // Add a new effect to update date range when trades change
  useEffect(() => {
    if (trades.length > 0) {
      const dates = trades
        .map(trade => new Date(formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd HH:mm:ssXXX')))
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
  }, [trades, timezone]);

  // Update fetchData to use cache
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      if (params?.slug) {
        // Load shared data
        const sharedData = await loadSharedData(params.slug as string);
        if (!sharedData.error) {
          const processedSharedTrades = sharedData.trades.map(trade => ({
            ...trade,
            utcDateStr: formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd')
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

          // Set tick details from shared data if available
          if (sharedData.params.tickDetails) {
            setTickDetails(sharedData.params.tickDetails);
          }
        }
      } else if (!isSharedView) {
        // Check cache first
        const cached = getLocalCache();
        const shouldFetch = !cached || Date.now() - cached.timestamp > CACHE_EXPIRY;

        let fetchedData;
        if (shouldFetch) {
          fetchedData = await loadInitialData();
          if (!fetchedData.error) {
            const processedTrades = fetchedData.trades.map(trade => ({
              ...trade,
              utcDateStr: formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd')
            }));

            // Update state
            setUser(fetchedData.user);
            setEtpToken(fetchedData.etpToken);
            setIsFirstConnection(fetchedData.isFirstConnection);
            setSubscription(fetchedData.subscription);
            setTrades(processedTrades);
            setTickDetails(fetchedData.tickDetails || {});
            setTags(fetchedData.tags || []);
            setPropfirmAccounts(fetchedData.propfirmAccounts || []);

            // Handle layouts
            const newLayouts = fetchedData.layouts || defaultLayouts;
            setLayouts(newLayouts);

            // Update cache
            setLocalCache({
              user: fetchedData.user,
              etpToken: fetchedData.etpToken,
              subscription: fetchedData.subscription,
              trades: processedTrades,
              tickDetails: fetchedData.tickDetails || {},
              tags: fetchedData.tags || [],
              propfirmAccounts: fetchedData.propfirmAccounts || [],
              layouts: newLayouts,
            });
          }
        } else {
          // Restore from cache
          setUser(cached.user);
          setEtpToken(cached.etpToken);
          setSubscription(cached.subscription);
          setTrades(cached.trades);
          setTickDetails(cached.tickDetails);
          setTags(cached.tags);
          setPropfirmAccounts(cached.propfirmAccounts);
          setLayouts(cached.layouts);
        }

        // Update date range if needed
        const currentTrades = shouldFetch ? fetchedData?.trades : cached?.trades;
        if (currentTrades && currentTrades.length > 0) {
          const processedTrades = currentTrades.map(trade => ({
            ...trade,
            utcDateStr: formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd')
          }));
          const dates = processedTrades
            .map((trade: TradeWithUTC) => new Date(formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd HH:mm:ssXXX')))
            .filter((date: Date) => isValid(date));

          if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates.map((date: Date) => date.getTime())));
            const maxDate = new Date(Math.max(
              ...dates.map((date: Date) => date.getTime()),
              new Date().getTime()
            ));
            setDateRange({ from: startOfDay(minDate), to: endOfDay(maxDate) });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [params?.slug, isSharedView, timezone]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData, timezone]);

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
      
      // Update the localStorage cache
      const existingCache = getLocalCache();
      if (existingCache) {
        setLocalCache({
          ...existingCache,
          layouts: safeNewLayouts
        });
      }
    } catch (error) {
      console.error('Error saving layouts:', error);
      setLayouts(defaultLayouts);
    }
  }, [user?.id, isSharedView]);

  const refreshTrades = useCallback(async () => {
    if (isSharedView) return;
    setIsLoading(true);
    try {
      const data = await loadInitialData();
      if (!data.error) {
        const processedTrades = data.trades.map(trade => ({
          ...trade,
          utcDateStr: formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd')
        }));

        // Update state
        setTrades(processedTrades);
        setTickDetails(data.tickDetails || {});
        setTags(data.tags || []);
        setPropfirmAccounts(data.propfirmAccounts || []);

        // Update cache
        setLocalCache({
          trades: processedTrades,
          tickDetails: data.tickDetails || {},
          tags: data.tags || [],
          propfirmAccounts: data.propfirmAccounts || [],
        });

        // Update date range if needed
        if (processedTrades.length > 0) {
          const dates = processedTrades
            .map(trade => new Date(formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd HH:mm:ssXXX')))
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
    } catch (error) {
      console.error('Error refreshing trades:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timezone, isSharedView]);

  const updateTrade = useCallback((tradeId: string, updates: Partial<TradeWithUTC>) => {
    setTrades(prevTrades => 
      prevTrades.map(trade => 
        trade.id === tradeId ? { 
          ...trade, 
          ...updates,
          // Ensure tags are properly handled
          tags: updates.tags || trade.tags,
          utcDateStr: updates.entryDate 
            ? formatInTimeZone(new Date(updates.entryDate), timezone, 'yyyy-MM-dd')
            : trade.utcDateStr
        } : trade
      )
    );
  }, [timezone]);

  // Add a function to update multiple trades at once
  const updateTrades = useCallback((updates: { id: string, updates: Partial<TradeWithUTC> }[]) => {
    setTrades(prevTrades => {
      const updatedTrades = [...prevTrades];
      updates.forEach(({ id, updates: tradeUpdates }) => {
        const index = updatedTrades.findIndex(t => t.id === id);
        if (index !== -1) {
          updatedTrades[index] = {
            ...updatedTrades[index],
            ...tradeUpdates,
            tags: tradeUpdates.tags || updatedTrades[index].tags,
            utcDateStr: tradeUpdates.entryDate 
              ? formatInTimeZone(new Date(tradeUpdates.entryDate), timezone, 'yyyy-MM-dd')
              : updatedTrades[index].utcDateStr
          };
        }
      });
      return updatedTrades;
    });
  }, [timezone]);

  // Add a function to remove a tag from all trades
  const removeTagFromAllTrades = useCallback((tagToRemove: string) => {
    setTrades(prevTrades => 
      prevTrades.map(trade => ({
        ...trade,
        tags: trade.tags.filter(tag => tag !== tagToRemove)
      }))
    );
  }, []);

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
        new Date(trade.entryDate),
        timezone,
        'yyyy-MM-dd HH:mm:ssXXX'
      ));

      // For single day selection, compare only the date part
      if (dateRangeBoundaries.from.getTime() === startOfDay(dateRangeBoundaries.to).getTime()) {
        const tradeDate = startOfDay(entryDate);
        return tradeDate.getTime() === dateRangeBoundaries.from.getTime();
      }

      // For date range, use the existing logic
      return entryDate >= dateRangeBoundaries.from && entryDate <= dateRangeBoundaries.to;
    });
  }, [accountFiltered, dateRangeBoundaries, timezone]);

  // Memoize filtered trades by PnL
  const pnlFiltered = useMemo(() => {
    if (pnlRange.min === undefined && pnlRange.max === undefined) return dateFiltered;
    return dateFiltered.filter(trade => 
      (pnlRange.min === undefined || trade.pnl >= pnlRange.min) &&
      (pnlRange.max === undefined || trade.pnl <= pnlRange.max)
    );
  }, [dateFiltered, pnlRange]);

  // Add tick filter to filtering chain
  const tickFiltered = useMemo(() => {
    if (!tickFilter?.value) return pnlFiltered;
    return pnlFiltered.filter(trade => {
      const matchingTicker = Object.keys(tickDetails).find(ticker => 
        trade.instrument.includes(ticker)
      );
      const tickValue = matchingTicker ? tickDetails[matchingTicker] : 1;
      const pnlPerContract = Number(trade.pnl) / Number(trade.quantity);
      const tradeTicks = Math.round(pnlPerContract / tickValue);
      const filterValue = tickFilter.value;
      return filterValue ? tradeTicks === Number(filterValue.replace('+', '')) : false;
    });
  }, [pnlFiltered, tickFilter?.value, tickDetails]);

  // Update timeRangeFiltered to use tickFiltered
  const timeRangeFiltered = useMemo(() => {
    if (!timeRange.range) return tickFiltered;
    return tickFiltered.filter(trade => 
      getTimeRangeKey(trade.timeInPosition) === timeRange.range
    );
  }, [tickFiltered, timeRange]);

  // Add weekday filter to filtering chain
  const weekdayFiltered = useMemo(() => {
    if (weekdayFilter?.day === null) return timeRangeFiltered;
    return timeRangeFiltered.filter(trade => {
      const dayOfWeek = new Date(formatInTimeZone(
        new Date(trade.entryDate),
        timezone,
        'yyyy-MM-dd HH:mm:ssXXX'
      )).getDay();
      return dayOfWeek === weekdayFilter.day;
    });
  }, [timeRangeFiltered, weekdayFilter?.day, timezone]);

  // Add hour filter to filtering chain
  const hourFiltered = useMemo(() => {
    if (hourFilter?.hour === null) return weekdayFiltered;
    return weekdayFiltered.filter(trade => {
      const hour = new Date(formatInTimeZone(
        new Date(trade.entryDate),
        timezone,
        'yyyy-MM-dd HH:mm:ssXXX'
      )).getHours();
      return hour === hourFilter.hour;
    });
  }, [weekdayFiltered, hourFilter?.hour, timezone]);

  // Add tag filtering to the filtering chain
  const tagFiltered = useMemo(() => {
    if (tagFilter.tags.length === 0) return hourFiltered;
    return hourFiltered.filter(trade => {
      // If no tags are selected, show all trades
      if (tagFilter.tags.length === 0) return true;
      
      // Check if the trade has any of the selected tags
      return trade.tags.some(tag => tagFilter.tags.includes(tag));
    });
  }, [hourFiltered, tagFilter.tags]);

  // Update formattedTrades to use the same date filtering logic
  const formattedTrades = useMemo(() => {
    if(isSharedView) {
      return tagFiltered.filter(trade => 
        accountNumbers.length === 0 || accountNumbers.includes(trade.accountNumber)
      );
    }

    return tagFiltered
      .filter(trade => {
        const entryDate = new Date(formatInTimeZone(
          new Date(trade.entryDate),
          timezone,
          'yyyy-MM-dd HH:mm:ssXXX'
        ));
        if (!isValid(entryDate)) return false;

        const matchesInstruments = instruments.length === 0 || instruments.includes(trade.instrument);
        const matchesAccounts = accountNumbers.length === 0 || accountNumbers.includes(trade.accountNumber);
        
        // Update date range matching logic to handle single day
        let matchesDateRange = true;
        if (dateRange?.from && dateRange?.to) {
          if (dateRange.from.getTime() === startOfDay(dateRange.to).getTime()) {
            // Single day selection
            const tradeDate = startOfDay(entryDate);
            matchesDateRange = tradeDate.getTime() === dateRange.from.getTime();
          } else {
            // Date range selection
            matchesDateRange = entryDate >= startOfDay(dateRange.from) && entryDate <= endOfDay(dateRange.to);
          }
        }

        const matchesPnlRange = (
          (pnlRange.min === undefined || trade.pnl >= pnlRange.min) &&
          (pnlRange.max === undefined || trade.pnl <= pnlRange.max)
        );
        
        return matchesInstruments && matchesAccounts && matchesDateRange && matchesPnlRange;
      })
      .sort((a, b) => parseISO(a.entryDate).getTime() - parseISO(b.entryDate).getTime());
  }, [tagFiltered, instruments, accountNumbers, dateRange, pnlRange, isSharedView, timezone]);

  const statistics = useMemo(() => {
    const stats = calculateStatistics(formattedTrades);
    
    // Calculate gross profits and gross losses including commissions
    const grossProfits = formattedTrades.reduce((sum, trade) => {
      const totalPnL = trade.pnl - trade.commission;
      return totalPnL > 0 ? sum + totalPnL : sum;
    }, 0);
    
    const grossLosses = Math.abs(formattedTrades.reduce((sum, trade) => {
      const totalPnL = trade.pnl - trade.commission;
      return totalPnL < 0 ? sum + totalPnL : sum;
    }, 0));

    // Calculate profit factor (handle division by zero)
    const profitFactor = grossLosses === 0 ? 
      grossProfits > 0 ? Number.POSITIVE_INFINITY : 1 : 
      grossProfits / grossLosses;

    return {
      ...stats,
      profitFactor
    };
  }, [formattedTrades]);

  const calendarData = useMemo(() => formatCalendarData(formattedTrades), [formattedTrades]);

  const isPlusUser = () => {
    return Boolean(subscription?.isActive && ['plus', 'pro'].includes(subscription?.plan?.split('_')[0].toLowerCase()||''));
  };

  // Update refreshUser to update cache
  const refreshUser = useCallback(async () => {
    if (isSharedView) return;
    const data = await loadInitialData();
    if (!data.error) {
      setUser(data.user);
      setEtpToken(data.etpToken);
      setIsFirstConnection(data.isFirstConnection);
      setSubscription(data.subscription);
      setTags(data.tags || []);
      setPropfirmAccounts(data.propfirmAccounts || []);

      // Update cache
      setLocalCache({
        user: data.user,
        etpToken: data.etpToken,
        subscription: data.subscription,
        tags: data.tags || [],
        propfirmAccounts: data.propfirmAccounts || [],
      });
    }
  }, [isSharedView]);

  const contextValue = {
    // User related
    user,
    etpToken,
    subscription,
    isPlusUser,
    isLoading,
    isMobile,
    isSharedView,
    isFirstConnection,
    setIsFirstConnection,
    refreshUser,

    // Trades related
    trades,
    setTrades,
    refreshTrades,
    updateTrade,
    sharedParams,

    // Tick details
    tickDetails,

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

    // Time range related
    timeRange,
    setTimeRange,

    // Tick filter related
    tickFilter,
    setTickFilter,

    // Weekday filter related
    weekdayFilter,
    setWeekdayFilter,

    // Hour filter related
    hourFilter,
    setHourFilter,

    // Add timezone management
    timezone,
    setTimezone,

    // Add tag filter
    tagFilter,
    setTagFilter,

    // New functions
    updateTrades,
    removeTagFromAllTrades,

    // New properties
    tags,
    setTags,

    // Add propfirm accounts
    propfirmAccounts,
    setPropfirmAccounts,
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

// Add getTimeRangeKey function at the top level
function getTimeRangeKey(timeInPosition: number): string {
  const minutes = timeInPosition / 60 // Convert seconds to minutes
  if (minutes < 1) return 'under1min'
  if (minutes >= 1 && minutes < 5) return '1to5min'
  if (minutes >= 5 && minutes < 10) return '5to10min'
  if (minutes >= 10 && minutes < 15) return '10to15min'
  if (minutes >= 15 && minutes < 30) return '15to30min'
  if (minutes >= 30 && minutes < 60) return '30to60min'
  if (minutes >= 60 && minutes < 120) return '1to2hours'
  if (minutes >= 120 && minutes < 300) return '2to5hours'
  return 'over5hours'
}