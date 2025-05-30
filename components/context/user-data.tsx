'use client'
import { createClient, signOut } from '@/server/auth'
import { User } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { Trade as PrismaTrade, Tag, Group as PrismaGroup, Account as PrismaAccount, FinancialEvent, Mood, Payout } from '@prisma/client'
import { calculateStatistics, formatCalendarData } from '@/lib/utils'
import { parseISO, isValid, startOfDay, endOfDay } from 'date-fns'
import { SharedParams } from '@/server/shared'
import { formatInTimeZone } from 'date-fns-tz'
import { loadInitialData, loadSharedData, LayoutItem as ServerLayoutItem, Layouts as ServerLayouts } from '@/server/user-data'
import { saveDashboardLayout } from '@/server/database'
import { WidgetType, WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { setupAccount, getAccounts, deletePayout as deletePayoutAction, addPayout as addPayoutAction, updatePayout as updatePayoutAction, deleteAccount as deleteAccountAction } from '@/app/[locale]/dashboard/data/actions/actions'
import { createGroup as createGroupAction, updateGroup as updateGroupAction, deleteGroup as deleteGroupAction, getGroups, moveAccountToGroup as moveAccountToGroupAction } from '@/server/groups'

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
  grossLosses: number
  grossWin: number
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

interface Group extends PrismaGroup {
  accounts: PrismaAccount[]
}

// Update Account type to include payouts and balanceToDate
export interface Account extends Omit<PrismaAccount, 'payouts'> {
  payouts?: Payout[]
  balanceToDate?: number
}

// Add after the interfaces and before the UserDataContext
const defaultLayouts: Layouts = {
  desktop: [
    {
      i: "calendarWidget",
      type: "calendarWidget" as WidgetType,
      size: "large" as WidgetSize,
      x: 0,
      y: 1,
      w: 6,
      h: 8
    },
    {
      i: "equityChart",
      type: "equityChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 6,
      y: 1,
      w: 6,
      h: 4
    },
    {
      i: "pnlChart",
      type: "pnlChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 6,
      y: 5,
      w: 6,
      h: 4
    },
    {
      i: "cumulativePnl",
      type: "cumulativePnl" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 0,
      w: 3,
      h: 1
    },
    {
      i: "longShortPerformance",
      type: "longShortPerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 3,
      y: 0,
      w: 3,
      h: 1
    },
    {
      i: "tradePerformance",
      type: "tradePerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 6,
      y: 0,
      w: 3,
      h: 1
    },
    {
      i: "averagePositionTime",
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
      i: "calendarWidget",
      type: "calendarWidget" as WidgetType,
      size: "large" as WidgetSize,
      x: 0,
      y: 2,
      w: 12,
      h: 6
    },
    {
      i: "equityChart",
      type: "equityChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 8,
      w: 12,
      h: 6
    },
    {
      i: "cumulativePnl",
      type: "cumulativePnl" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 0,
      w: 12,
      h: 1
    },
    {
      i: "tradePerformance",
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
  thorToken: string | null
  subscription: {
    isActive: boolean
    plan: string | null
    status: string
    endDate: Date | null
    trialEndsAt: Date | null
  } | null
  isPlusUser: () => boolean
  isLoading: boolean
  isInitialLoad: boolean
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
  setSharedParams: React.Dispatch<React.SetStateAction<SharedParams | null>>
  
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

  // Layout related - updated to nullable
  layouts: Layouts
  setLayouts: React.Dispatch<React.SetStateAction<Layouts | null>>
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
  accounts: Account[]
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>

  // New functions
  updateAccount: (accountNumber: string, updates: { propfirm?: string }) => Promise<void>

  // Add groups related properties
  groups: Group[]
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>
  refreshGroups: () => Promise<void>
  createGroup: (name: string) => Promise<void>
  updateGroup: (groupId: string, name: string) => Promise<void>
  deleteGroup: (groupId: string) => Promise<void>
  moveAccountToGroup: (accountId: string, targetGroupId: string | null) => Promise<void>

  // Add financial events related properties
  financialEvents: FinancialEvent[]
  setFinancialEvents: React.Dispatch<React.SetStateAction<FinancialEvent[]>>

  // Add mood history related properties
  moodHistory: Mood[]
  setMoodHistory: React.Dispatch<React.SetStateAction<Mood[]>>

  // Add deletePayout function
  deletePayout: (payoutId: string) => Promise<void>

  // Add payout and account management functions
  addPayout: (data: { accountNumber: string; date: Date; amount: number; status: string }) => Promise<void>
  updatePayout: (data: { id: string; date: Date; amount: number; status: string }) => Promise<void>
  deleteAccount: (accountNumber: string) => Promise<void>
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
// Cache data for 1 hour to reduce unnecessary API calls while keeping data relatively fresh
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

interface CachedData {
  timestamp: number;
  user: User | null;
  etpToken: string | null;
  thorToken: string | null;
  subscription: UserDataContextType['subscription'];
  trades: TradeWithUTC[];
  tickDetails: Record<string, number>;
  tags: Tag[];
  accounts: Account[];
  layouts: Layouts;
  groups: Group[];
  financialEvents: FinancialEvent[];
  moodHistory: Mood[];
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
  } catch (error) {
    console.error('Error parsing cache:', error);
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

// Add this function before the UserDataProvider component
function calculateAccountBalance(account: Account, trades: TradeWithUTC[]): number {
  // Start with the account's starting balance
  let balance = account.startingBalance || 0;

  // Add all trades' PnL for this account
  const accountTrades = trades.filter(trade => trade.accountNumber === account.number);
  const tradesPnL = accountTrades.reduce((sum, trade) => sum + (trade.pnl - trade.commission), 0);
  balance += tradesPnL;

  // Add all payouts for this account
  const payouts = account.payouts || [];
  const payoutsSum = payouts.reduce((sum, payout) => sum + payout.amount, 0);
  balance += payoutsSum;

  return balance;
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
  const [thorToken, setThorToken] = useState<string | null>(null);
  const [isFirstConnection, setIsFirstConnection] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<UserDataContextType['subscription']>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tickDetails, setTickDetails] = useState<Record<string, number>>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [moodHistory, setMoodHistory] = useState<Mood[]>([]);

  // Trades state
  const [trades, setTrades] = useState<TradeWithUTC[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [accountNumbers, setAccountNumbers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tickRange, setTickRange] = useState<TickRange>({ min: undefined, max: undefined });
  const [pnlRange, setPnlRange] = useState<PnlRange>({ min: undefined, max: undefined });
  const [sharedParams, setSharedParams] = useState<SharedParams | null>(null);

  // Initialize layouts with null to prevent flashing
  const [layouts, setLayouts] = useState<Layouts | null>(null);

  // Financial events
  const [financialEvents, setFinancialEvents] = useState<FinancialEvent[]>([]);

  // Create a wrapped version of setLayouts that also updates the cache
  const setLayoutsWithCache = useCallback((newLayouts: React.SetStateAction<Layouts | null>) => {
    setLayouts((prevLayouts) => {
      const resolvedLayouts = typeof newLayouts === 'function' ? newLayouts(prevLayouts) : newLayouts;
      
      // Update the cache if we have valid layouts
      if (resolvedLayouts) {
        const existingCache = getLocalCache();
        if (existingCache) {
          setLocalCache({
            ...existingCache,
            layouts: resolvedLayouts
          });
        }
      }
      
      return resolvedLayouts;
    });
  }, []);

  // Add loading state for initial data load
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
  const [accounts, setAccounts] = useState<Account[]>([])

  // Add groups state
  const [groups, setGroups] = useState<Group[]>([])

  // Initialize state from cache
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsInitialLoad(true);
        if (isSharedView) {
          // In shared view, always fetch fresh data
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

            // Calculate balanceToDate for each account
            const accountsWithBalance = sharedData.groups?.flatMap(group => 
              group.accounts.map(account => ({
                ...account,
                balanceToDate: calculateAccountBalance(account, processedSharedTrades)
              }))
            ) || [];
            setGroups(sharedData.groups || []);
            setAccounts(accountsWithBalance);
          }
          return;
        }

        // For non-shared views, check cache first
        const cached = getLocalCache();
        const shouldFetch = !cached || Date.now() - cached.timestamp > CACHE_EXPIRY;

        if (!shouldFetch && cached) {
          // Restore from cache without loading state
          const {
            user,
            etpToken,
            thorToken,
            subscription,
            trades,
            tickDetails,
            tags,
            accounts,
            layouts,
            groups,
            financialEvents,
            moodHistory,
          } = cached;

          if (!user) {
            localStorage.removeItem('deltalytix_user_data')
            signOut()
          }

          setUser(user);
          setEtpToken(etpToken);
          setThorToken(thorToken);
          setSubscription(subscription);
          setTrades(trades);
          setTickDetails(tickDetails);
          setTags(tags);
          
          // Calculate balanceToDate for each account
          const accountsWithBalance = accounts.map(account => ({
            ...account,
            balanceToDate: calculateAccountBalance(account, trades)
          }));
          setAccounts(accountsWithBalance);
          
          setLayouts(layouts);
          setGroups(groups);
          setFinancialEvents(financialEvents);
          setMoodHistory(moodHistory);

          // Update date range if needed
          if (trades?.length > 0) {
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
          return;
        }

        // Fetch fresh data if needed
        setIsLoading(true);
        let fetchedData;
        try {
          fetchedData = await loadInitialData();
        } catch (error) {
          console.error('Error loading initial data:', error);
          fetchedData = {
            user: null,
            isFirstConnection: false,
            etpToken: null,
            thorToken: null,
            subscription: null,
            trades: [],
            tickDetails: {},
            layouts: null,
            tags: [],
            accounts: [],
            groups: [],
            financialEvents: [],
            moodHistory: [],
            error: 'Failed to load initial data'
          };
        }
        
        if (fetchedData && !fetchedData.error) {
          const processedTrades = fetchedData.trades.map(trade => ({
            ...trade,
            utcDateStr: formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd')
          }));

          // Update state
          setUser(fetchedData.user);
          setEtpToken(fetchedData.etpToken);
          setThorToken(fetchedData.thorToken);
          setIsFirstConnection(fetchedData.isFirstConnection);
          setSubscription(fetchedData.subscription);
          setTrades(processedTrades);
          setTickDetails(fetchedData.tickDetails || {});
          setTags(fetchedData.tags || []);
          
          // Calculate balanceToDate for each account
          const accountsWithBalance = (fetchedData.accounts || []).map(account => ({
            ...account,
            balanceToDate: calculateAccountBalance(account, processedTrades)
          }));
          setAccounts(accountsWithBalance);
          
          setGroups(fetchedData.groups || []);
          setFinancialEvents(fetchedData.financialEvents || []);
          setMoodHistory(fetchedData.moodHistory || []);

          // Handle layouts
          const newLayouts = fetchedData.layouts || defaultLayouts;
          setLayouts(newLayouts);

          // Update cache with fresh data
          setLocalCache({
            user: fetchedData.user,
            etpToken: fetchedData.etpToken,
            thorToken: fetchedData.thorToken,
            subscription: fetchedData.subscription,
            trades: processedTrades,
            tickDetails: fetchedData.tickDetails || {},
            tags: fetchedData.tags || [],
            accounts: accountsWithBalance,
            layouts: newLayouts,
            groups: fetchedData.groups || [],
            financialEvents: fetchedData.financialEvents || [],
            moodHistory: fetchedData.moodHistory || [],
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
        console.error('Error loading data:', error);
        const supabase = await createClient()
        await supabase.auth.signOut()
      } finally {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    };

    loadData();
  }, [isSharedView, params?.slug, timezone]);

  // Update saveLayouts to handle shared views
  const saveLayouts = useCallback(async (newLayouts: Layouts) => {
    if (!user?.id || isSharedView) return; // Don't save layouts in shared view
    try {
      console.log('Saving layouts:', newLayouts);
      // Ensure the new layouts have both desktop and mobile arrays
      const safeNewLayouts = {
        desktop: Array.isArray(newLayouts.desktop) ? newLayouts.desktop : defaultLayouts.desktop,
        mobile: Array.isArray(newLayouts.mobile) ? newLayouts.mobile : defaultLayouts.mobile,
      };
      console.log('Safe new layouts:', safeNewLayouts);
      await saveDashboardLayout(user.id, safeNewLayouts);
      setLayouts(safeNewLayouts);
      
      // Update the localStorage cache
      const existingCache = getLocalCache();
      console.log('Existing cache:', existingCache);
      if (existingCache) {
        setLocalCache({
          ...existingCache,
          layouts: safeNewLayouts
        });
        console.log('Updated cache with new layouts');
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
        setAccounts(data.accounts || []);
        setGroups(data.groups || []);
        setLayoutsWithCache(data.layouts || defaultLayouts);
        setFinancialEvents(data.financialEvents || []);

        // Update cache
        setLocalCache({
          trades: processedTrades,
          tickDetails: data.tickDetails || {},
          tags: data.tags || [],
          accounts: data.accounts || [],
          groups: data.groups || [],
          financialEvents: data.financialEvents || [],
          moodHistory: data.moodHistory || [],
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
    setTrades(prevTrades => {
      const updatedTrades = prevTrades.map(trade => 
        trade.id === tradeId ? { 
          ...trade, 
          ...updates,
          // Ensure tags are properly handled
          // tags: updates.tags || trade.tags,
          utcDateStr: updates.entryDate 
            ? formatInTimeZone(new Date(updates.entryDate), timezone, 'yyyy-MM-dd')
            : trade.utcDateStr
        } : trade
      );

      // Update the cache with the new trades
      const existingCache = getLocalCache();
      if (existingCache) {
        setLocalCache({
          ...existingCache,
          trades: updatedTrades
        });
      }

      return updatedTrades;
    });
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
    if (!trades || trades.length === 0) return [];
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

    // Find the hidden group
    const hiddenGroup = groups.find(g => g.name === "Hidden Accounts");
    const hiddenAccountNumbers = hiddenGroup ? new Set(hiddenGroup.accounts.map(a => a.number)) : new Set();

    return tagFiltered
      .filter(trade => {
        // Exclude trades from hidden accounts
        if (hiddenAccountNumbers.has(trade.accountNumber)) {
          return false;
        }

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
  }, [tagFiltered, instruments, accountNumbers, dateRange, pnlRange, isSharedView, timezone, groups]);

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
      setThorToken(data.thorToken);
      setIsFirstConnection(data.isFirstConnection);
      setSubscription(data.subscription);
      setTags(data.tags || []);
      setAccounts(data.accounts || []);
      setGroups(data.groups || []);
      setMoodHistory(data.moodHistory || []);

      // Update cache
      setLocalCache({
        user: data.user,
        etpToken: data.etpToken,
        thorToken: data.thorToken,
        subscription: data.subscription,
        tags: data.tags || [],
        accounts: data.accounts || [],
        groups: data.groups || [],
        moodHistory: data.moodHistory || [],
      });
    }
  }, [isSharedView]);

  const updateAccount = useCallback(async (accountNumber: string, updates: { propfirm?: string }) => {
    if (!user?.id) return

    try {
      // Get the current account to preserve other properties
      const currentAccount = accounts.find(acc => acc.number === accountNumber)
      if (!currentAccount) return

      // Update the account in the database
      await setupAccount({
        ...currentAccount,
        number: accountNumber,
        userId: user.id,
        propfirm: updates.propfirm ?? currentAccount.propfirm,
        profitTarget: currentAccount.profitTarget ?? 0,
        drawdownThreshold: currentAccount.drawdownThreshold ?? 0,
        startingBalance: currentAccount.startingBalance ?? 0,
        isPerformance: currentAccount.isPerformance ?? false,
        trailingDrawdown: currentAccount.trailingDrawdown ?? false,
        trailingStopProfit: currentAccount.trailingStopProfit ?? null,
        resetDate: currentAccount.resetDate ?? null,
        consistencyPercentage: currentAccount.consistencyPercentage ?? 30,
        accountSize: currentAccount.accountSize ?? '',
        accountSizeName: currentAccount.accountSizeName ?? '',
        price: currentAccount.price ?? 0,
        priceWithPromo: currentAccount.priceWithPromo ?? 0,
        evaluation: currentAccount.evaluation ?? false,
        minDays: currentAccount.minDays ?? 0,
        dailyLoss: currentAccount.dailyLoss ?? 0,
        rulesDailyLoss: currentAccount.rulesDailyLoss ?? '',
        trailing: currentAccount.trailing ?? '',
        tradingNewsAllowed: currentAccount.tradingNewsAllowed ?? false,
        activationFees: currentAccount.activationFees ?? 0,
        isRecursively: currentAccount.isRecursively ?? '',
        payoutBonus: currentAccount.payoutBonus ?? 0,
        profitSharing: currentAccount.profitSharing ?? 0,
        payoutPolicy: currentAccount.payoutPolicy ?? '',
        balanceRequired: currentAccount.balanceRequired ?? 0,
        minTradingDaysForPayout: currentAccount.minTradingDaysForPayout ?? 0,
        minPayout: currentAccount.minPayout ?? 0,
        maxPayout: currentAccount.maxPayout ?? '',
        maxFundedAccounts: currentAccount.maxFundedAccounts ?? null,
        createdAt: currentAccount.createdAt ?? new Date(),
        payoutCount: currentAccount.payoutCount ?? 0
      })
      // Update the account in the local state
      setAccounts(accounts.map(acc => acc.number === accountNumber ? { ...acc, ...updates } : acc))

      // Update cache
      const existingCache = getLocalCache()
      if (existingCache) {
        setLocalCache({
          ...existingCache,
          accounts: accounts
        })
      }
    } catch (error) {
      console.error('Error updating account:', error)
      throw error
    }
  }, [user?.id, accounts])

  // Add refreshGroups function
  const refreshGroups = useCallback(async () => {
    if (!user?.id || isSharedView) return
    try {
      const fetchedGroups = await getGroups(user.id)
      setGroups(fetchedGroups)
      
      // Update cache
      const existingCache = getLocalCache()
      if (existingCache) {
        setLocalCache({
          ...existingCache,
          groups: fetchedGroups
        })
      }
    } catch (error) {
      console.error('Error refreshing groups:', error)
    }
  }, [user?.id, isSharedView])

  // Add createGroup function
  const createGroup = useCallback(async (name: string) => {
    if (!user?.id) return
    try {
      await createGroupAction(user.id, name)
      await refreshGroups()
    } catch (error) {
      console.error('Error creating group:', error)
      throw error
    }
  }, [user?.id, refreshGroups])

  // Add updateGroup function
  const updateGroup = useCallback(async (groupId: string, name: string) => {
    try {
      await updateGroupAction(groupId, name)
      await refreshGroups()
    } catch (error) {
      console.error('Error updating group:', error)
      throw error
    }
  }, [refreshGroups])

  // Add deleteGroup function
  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      await deleteGroupAction(groupId)
      await refreshGroups()
    } catch (error) {
      console.error('Error deleting group:', error)
      throw error
    }
  }, [refreshGroups])

  // Add moveAccountToGroup function
  const moveAccountToGroup = useCallback(async (accountId: string, targetGroupId: string | null) => {
    try {
      await moveAccountToGroupAction(accountId, targetGroupId)
      await refreshGroups()
    } catch (error) {
      console.error('Error moving account to group:', error)
      throw error
    }
  }, [refreshGroups])

  // Update the setTags function to handle cache
  const setTagsWithCache: React.Dispatch<React.SetStateAction<Tag[]>> = (value) => {
    setTags((prevTags) => {
      const newTags = typeof value === 'function' ? value(prevTags) : value;
      // Update cache
      const existingCache = getLocalCache();
      if (existingCache) {
        setLocalCache({
          ...existingCache,
          tags: newTags
        });
      }
      return newTags;
    });
  };

  // Add wrapped version of setMoodHistory
  const setMoodHistoryWithCache: React.Dispatch<React.SetStateAction<Mood[]>> = (value) => {
    setMoodHistory((prevMoodHistory) => {
      const newMoodHistory = typeof value === 'function' ? value(prevMoodHistory) : value;
      // Update cache
      const existingCache = getLocalCache();
      if (existingCache) {
        setLocalCache({
          ...existingCache,
          moodHistory: newMoodHistory
        });
      }
      return newMoodHistory;
    });
  };

  // Add wrapped version of setAccounts to handle cache
  const setAccountsWithCache: React.Dispatch<React.SetStateAction<Account[]>> = (value) => {
    setAccounts((prevAccounts) => {
      const newAccounts = typeof value === 'function' ? value(prevAccounts) : value;
      // Update cache
      const existingCache = getLocalCache();
      if (existingCache) {
        setLocalCache({
          ...existingCache,
          accounts: newAccounts
        });
      }
      return newAccounts;
    });
  };

  // Add addPayout function
  const addPayout = useCallback(async (data: { accountNumber: string; date: Date; amount: number; status: string }) => {
    if (!user?.id || isSharedView) return;

    try {
      // Add to database
      const newPayout = await addPayoutAction(data);

      // Update local state
      setAccounts(prevAccounts => {
        const updatedAccounts = prevAccounts.map(account => {
          if (account.number === data.accountNumber) {
            return {
              ...account,
              payouts: [...(account.payouts || []), newPayout]
            };
          }
          return account;
        });

        // Update cache
        const existingCache = getLocalCache();
        if (existingCache) {
          setLocalCache({
            ...existingCache,
            accounts: updatedAccounts
          });
        }

        return updatedAccounts;
      });
    } catch (error) {
      console.error('Error adding payout:', error);
      throw error;
    }
  }, [user?.id, isSharedView]);

  // Add updatePayout function
  const updatePayout = useCallback(async (data: { id: string; date: Date; amount: number; status: string }) => {
    if (!user?.id || isSharedView) return;

    try {
      // Update in database
      const updatedPayout = await updatePayoutAction(data);

      // Update local state
      setAccounts(prevAccounts => {
        const updatedAccounts = prevAccounts.map(account => ({
          ...account,
          payouts: account.payouts?.map(p => 
            p.id === data.id ? { ...p, ...updatedPayout } : p
          ) || []
        }));

        // Update cache
        const existingCache = getLocalCache();
        if (existingCache) {
          setLocalCache({
            ...existingCache,
            accounts: updatedAccounts
          });
        }

        return updatedAccounts;
      });
    } catch (error) {
      console.error('Error updating payout:', error);
      throw error;
    }
  }, [user?.id, isSharedView]);

  // Add deleteAccount function
  const deleteAccount = useCallback(async (accountNumber: string) => {
    if (!user?.id || isSharedView) return;

    try {
      // Delete from database
      await deleteAccountAction(accountNumber);

      // Update local state
      setAccounts(prevAccounts => {
        const updatedAccounts = prevAccounts.filter(acc => acc.number !== accountNumber);

        // Update cache
        const existingCache = getLocalCache();
        if (existingCache) {
          setLocalCache({
            ...existingCache,
            accounts: updatedAccounts
          });
        }

        return updatedAccounts;
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }, [user?.id, isSharedView]);

  // Add deletePayout function
  const deletePayout = useCallback(async (payoutId: string) => {
    if (!user?.id || isSharedView) return;

    try {
      // Delete from database
      await deletePayoutAction(payoutId);

      // Update local state
      setAccounts(prevAccounts => {
        const updatedAccounts = prevAccounts.map(account => ({
          ...account,
          payouts: account.payouts?.filter(p => p.id !== payoutId) || []
        }));

        // Update cache
        const existingCache = getLocalCache();
        if (existingCache) {
          setLocalCache({
            ...existingCache,
            accounts: updatedAccounts
          });
        }

        return updatedAccounts;
      });
    } catch (error) {
      console.error('Error deleting payout:', error);
      throw error;
    }
  }, [user?.id, isSharedView]);

  const contextValue = {
    // User related
    user,
    etpToken,
    thorToken,
    subscription,
    isPlusUser,
    isLoading,
    isInitialLoad,
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
    setSharedParams,

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
    layouts: layouts || (isSharedView ? defaultLayouts : { desktop: [], mobile: [] }),
    setLayouts: setLayoutsWithCache,
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
    setTags: setTagsWithCache,

    // Add propfirm accounts
    accounts,
    setAccounts: setAccountsWithCache,

    // New functions
    updateAccount,

    // Add groups related values
    groups,
    setGroups,
    refreshGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    moveAccountToGroup,

    // Add financial events related values
    financialEvents,
    setFinancialEvents,

    // Add mood history related values
    moodHistory,
    setMoodHistory: setMoodHistoryWithCache,

    // Add deletePayout function
    deletePayout,

    // Add payout and account management functions
    addPayout,
    updatePayout,
    deleteAccount,
  };

  // If we're still loading initial data, return null or a loading state
  if (isInitialLoad) {
    return null; // Or return a loading spinner component if you have one
  }

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