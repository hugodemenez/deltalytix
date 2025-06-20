'use client'
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo
} from 'react';

import {
  Trade as PrismaTrade,
  Group as PrismaGroup,
  Account as PrismaAccount,
  Payout as PrismaPayout,
  DashboardLayout as PrismaDashboardLayout,
  Subscription as PrismaSubscription,
  Tag,
} from '@prisma/client';

import { SharedParams } from '@/server/shared';
import {
  getDashboardLayout,
  getUserData,
  loadSharedData,
  updateIsFirstConnectionAction
} from '@/server/user-data';
import {
  getTradesAction,
  groupTradesAction,
  revalidateCache,
  saveDashboardLayoutAction,
  ungroupTradesAction,
  updateTradesAction
} from '@/server/database';
import {
  WidgetType,
  WidgetSize,
} from '@/app/[locale]/dashboard/types/dashboard';
import {
  deletePayoutAction,
  deleteAccountAction,
  setupAccountAction,
  savePayoutAction,
} from '@/server/accounts';
import {
  saveGroupAction,
  deleteGroupAction,
  moveAccountToGroupAction,
  renameGroupAction
} from '@/server/groups';
import { createClient } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { ensureUserInDatabase, signOut } from '@/server/auth';
import { useUserStore } from '@/store/user-store';
import { useTickDetailsStore } from '@/store/tick-details-store';
import { useFinancialEventsStore } from '@/store/financial-events-store';
import { useTradesStore } from '@/store/trades-store';
import {
  endOfDay,
  isValid,
  parseISO,
  set,
  startOfDay
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { calculateStatistics, formatCalendarData } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { deleteTagAction } from '@/server/tags';
import { useRouter } from 'next/navigation';
import { useCurrentLocale } from '@/locales/client';
import { useMoodStore } from '@/store/mood-store';

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


// Add new interface for time range
interface TimeRange {
  range: string | null
}

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

export interface Group extends PrismaGroup {
  accounts: PrismaAccount[]
}


// Update Account type to include payouts and balanceToDate
export interface Account extends Omit<PrismaAccount, 'payouts' | 'group'> {
  payouts?: PrismaPayout[]
  balanceToDate?: number
  group?: PrismaGroup | null
}

// Add after the interfaces and before the UserDataContext
export const defaultLayouts: PrismaDashboardLayout = {
  id: '',
  userId: '',
  createdAt: new Date(),
  updatedAt: new Date(),
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
interface DataContextType {
  refreshTrades: () => Promise<void>
  isPlusUser: () => boolean
  isLoading: boolean
  isMobile: boolean
  isSharedView: boolean
  changeIsFirstConnection: (isFirstConnection: boolean) => void
  isFirstConnection: boolean
  setIsFirstConnection: (isFirstConnection: boolean) => void
  sharedParams: SharedParams | null
  setSharedParams: React.Dispatch<React.SetStateAction<SharedParams | null>>

  // Formatted trades and filters
  formattedTrades: PrismaTrade[]
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
  timeRange: TimeRange
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>
  tickFilter: TickFilter
  setTickFilter: React.Dispatch<React.SetStateAction<TickFilter>>
  weekdayFilter: WeekdayFilter
  setWeekdayFilter: React.Dispatch<React.SetStateAction<WeekdayFilter>>
  hourFilter: HourFilter
  setHourFilter: React.Dispatch<React.SetStateAction<HourFilter>>
  tagFilter: TagFilter
  setTagFilter: React.Dispatch<React.SetStateAction<TagFilter>>

  // Statistics and calendar
  statistics: StatisticsProps
  calendarData: CalendarData


  // Mutations
  // Trades
  updateTrades: (tradeIds: string[], update: Partial<PrismaTrade>) => Promise<void>
  groupTrades: (tradeIds: string[]) => Promise<void>
  ungroupTrades: (tradeIds: string[]) => Promise<void>

  // Accounts
  deleteAccount: (account: Account) => Promise<void>
  saveAccount: (account: Account) => Promise<void>

  // Groups
  saveGroup: (name: string) => Promise<Group | undefined>
  renameGroup: (groupId: string, name: string) => Promise<void>
  deleteGroup: (groupId: string) => Promise<void>
  moveAccountToGroup: (accountId: string, targetGroupId: string | null) => Promise<void>

  // Payouts
  savePayout: (payout: PrismaPayout) => Promise<void>
  deletePayout: (payoutId: string) => Promise<void>

  // Dashboard layout
  saveDashboardLayout: (layout: PrismaDashboardLayout) => Promise<void>
}


const DataContext = createContext<DataContextType | undefined>(undefined);

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

// Add this function before the UserDataProvider component
function calculateAccountBalance(account: Account, trades: PrismaTrade[]): number {
  let balance = account.startingBalance || 0;
  const accountTrades = trades.filter(trade => trade.accountNumber === account.number);
  const tradesPnL = accountTrades.reduce((sum, trade) => sum + (trade.pnl - trade.commission), 0);
  balance += tradesPnL;
  const payouts = account.payouts || [];
  const payoutsSum = payouts.reduce((sum, payout) => sum + payout.amount, 0);
  balance += payoutsSum;
  return balance;
}

const supabase = createClient()

export const DataProvider: React.FC<{
  children: React.ReactNode;
  isSharedView?: boolean;
}> = ({ children, isSharedView = false }) => {
  const router = useRouter()
  const params = useParams();
  const isMobile = useIsMobileDetection();

  // Get store values
  const user = useUserStore(state => state.user);
  const setUser = useUserStore(state => state.setUser);
  const setSubscription = useUserStore(state => state.setSubscription);
  const setTags = useUserStore(state => state.setTags);
  const setAccounts = useUserStore(state => state.setAccounts);
  const setGroups = useUserStore(state => state.setGroups);
  const setDashboardLayout = useUserStore(state => state.setDashboardLayout);
  const setMoods = useMoodStore(state => state.setMoods);
  const supabaseUser = useUserStore(state => state.supabaseUser);
  const timezone = useUserStore(state => state.timezone);
  const groups = useUserStore(state => state.groups);
  const accounts = useUserStore(state => state.accounts);
  const setSupabaseUser = useUserStore(state => state.setSupabaseUser);
  const subscription = useUserStore(state => state.subscription);
  const setTickDetails = useTickDetailsStore(state => state.setTickDetails);
  const tickDetails = useTickDetailsStore(state => state.tickDetails);
  const setEvents = useFinancialEventsStore(state => state.setEvents);
  const trades = useTradesStore(state => state.trades);
  const setTrades = useTradesStore(state => state.setTrades);
  const dashboardLayout = useUserStore(state => state.dashboardLayout);
  const locale = useCurrentLocale()
  const isLoading = useUserStore(state => state.isLoading)
  const setIsLoading = useUserStore(state => state.setIsLoading)

  // Local states
  const [sharedParams, setSharedParams] = useState<SharedParams | null>(null);

  // Filter states
  const [instruments, setInstruments] = useState<string[]>([]);
  const [accountNumbers, setAccountNumbers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tickRange, setTickRange] = useState<TickRange>({ min: undefined, max: undefined });
  const [pnlRange, setPnlRange] = useState<PnlRange>({ min: undefined, max: undefined });
  const [timeRange, setTimeRange] = useState<TimeRange>({ range: null });
  const [tickFilter, setTickFilter] = useState<TickFilter>({ value: null });
  const [weekdayFilter, setWeekdayFilter] = useState<WeekdayFilter>({ day: null });
  const [hourFilter, setHourFilter] = useState<HourFilter>({ hour: null });
  const [tagFilter, setTagFilter] = useState<TagFilter>({ tags: [] });
  const [isFirstConnection, setIsFirstConnection] = useState(false);

  // Load data from the server
  const loadData = useCallback(async () => {
    // Prevent multiple simultaneous loads

    try {
      setIsLoading(true);

      if (isSharedView) {
        const sharedData = await loadSharedData(params.slug as string);
        if (!sharedData.error) {
          const processedSharedTrades = sharedData.trades.map(trade => ({
            ...trade,
            utcDateStr: formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd')
          }));

          // Batch state updates
          const updates = () => {
            setTrades(processedSharedTrades);
            setSharedParams(sharedData.params);

            if (sharedData.params.desktop || sharedData.params.mobile) {
              setDashboardLayout({
                id: 'shared-layout',
                userId: 'shared',
                createdAt: new Date(),
                updatedAt: new Date(),
                desktop: sharedData.params.desktop || defaultLayouts.desktop,
                mobile: sharedData.params.mobile || defaultLayouts.mobile
              });
            }

            if (sharedData.params.tickDetails) {
              setTickDetails(sharedData.params.tickDetails);
            }

            const accountsWithBalance = sharedData.groups?.flatMap(group =>
              group.accounts.map(account => ({
                ...account,
                balanceToDate: calculateAccountBalance(account, processedSharedTrades)
              }))
            ) || [];
            setGroups(sharedData.groups || []);
            setAccounts(accountsWithBalance);
          };

          updates();
        }
        setIsLoading(false)
        return;
      }

      // Step 1: Get Supabase user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        await signOut();
        setIsLoading(false)
        return;
      }

      setSupabaseUser(user);

      // CRITICAL: Get dashboard layout first
      // But check if the layout is already in the state
      // TODO: Cache layout client side (lightweight)
      if (!dashboardLayout) {
        const dashboardLayoutResponse = await getDashboardLayout(user.id)
        if (dashboardLayoutResponse) {
          setDashboardLayout(dashboardLayoutResponse)
        }
        else {
          setDashboardLayout(defaultLayouts)
        }
      }

      // Step 2: Fetch trades (with caching server side)
      // I think we could make basic computations server side to offload inital stats computations
      // WE SHOULD NOT USE CLIENT SIDE CACHING FOR TRADES (PREVENTS DATA LEAKAGE / OVERLOAD IN CACHE)
      const trades = await getTradesAction()
      setTrades(Array.isArray(trades) ? trades : []);

      // Step 3: Fetch user data
      // TODO: Check what we could cache client side
      const data = await getUserData()


      if (!data) {
        await signOut();
        setIsLoading(false)
        return;
      }

      setUser(data.userData);
      // If user first connection, set locale
      if (data.userData?.isFirstConnection) {
        await ensureUserInDatabase(user, locale)
      }
      setSubscription(data.subscription as PrismaSubscription | null);
      setTags(data.tags);
      setGroups(data.groups);
      setMoods(data.moodHistory);
      setEvents(data.financialEvents);
      setTickDetails(data.tickDetails);
      setIsFirstConnection(data.userData?.isFirstConnection || false)


      // Calculate balanceToDate for each account 
      const accountsWithBalance = (data.accounts || []).map(account => ({
        ...account,
        balanceToDate: calculateAccountBalance(account, Array.isArray(trades) ? trades : [])
      }));
      setAccounts(accountsWithBalance);

    } catch (error) {
      console.error('Error loading data:', error);
      // Optionally handle specific error cases here
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isSharedView, params?.slug, timezone, supabaseUser, isLoading, setIsLoading]);

  // Load data on mount and when isSharedView changes
  useEffect(() => {
    let mounted = true;

    const loadDataIfMounted = async () => {
      if (!mounted) return;
      await loadData();
    };

    loadDataIfMounted();

    return () => {
      mounted = false;
    };
  }, [isSharedView]); // Only depend on isSharedView

  const refreshTrades = useCallback(async () => {
    if (!user?.id) return
    revalidateCache([`trades-${user.id}`, `user-data-${user.id}-${locale}`])
    await loadData()
  }, [user?.id])

  const formattedTrades = useMemo(() => {
    // Early return if no trades or if trades is not an array
    if (!trades || !Array.isArray(trades) || trades.length === 0) return [];

    // Get hidden accounts for filtering
    const hiddenGroup = groups.find(g => g.name === "Hidden Accounts");
    const hiddenAccountNumbers = accounts
      .filter(a => a.groupId === hiddenGroup?.id)
      .map(a => a.number);

    // Apply all filters in a single pass
    return trades
      .filter((trade) => {
        // Skip trades from hidden accounts
        if (hiddenAccountNumbers.includes(trade.accountNumber)) {
          return false;
        }

        // Validate entry date
        const entryDate = new Date(formatInTimeZone(
          new Date(trade.entryDate),
          timezone,
          'yyyy-MM-dd HH:mm:ssXXX'
        ));
        if (!isValid(entryDate)) return false;

        // Instrument filter
        if (instruments.length > 0 && !instruments.includes(trade.instrument)) {
          return false;
        }

        // Account filter
        if (accountNumbers.length > 0 && !accountNumbers.includes(trade.accountNumber)) {
          return false;
        }

        // Date range filter
        if (dateRange?.from && dateRange?.to) {
          const tradeDate = startOfDay(entryDate);
          const fromDate = startOfDay(dateRange.from);
          const toDate = endOfDay(dateRange.to);

          if (fromDate.getTime() === startOfDay(toDate).getTime()) {
            // Single day selection
            if (tradeDate.getTime() !== fromDate.getTime()) {
              return false;
            }
          } else {
            // Date range selection
            if (entryDate < fromDate || entryDate > toDate) {
              return false;
            }
          }
        }

        // PnL range filter
        if ((pnlRange.min !== undefined && trade.pnl < pnlRange.min) ||
          (pnlRange.max !== undefined && trade.pnl > pnlRange.max)) {
          return false;
        }

        // Tick filter
        if (tickFilter?.value) {
          // Fix ticker matching logic - sort by length descending to match longer tickers first
          // This prevents "ES" from matching "MES" trades
          const matchingTicker = Object.keys(tickDetails)
            .sort((a, b) => b.length - a.length) // Sort by length descending
            .find(ticker => trade.instrument.includes(ticker));
          const tickValue = matchingTicker ? tickDetails[matchingTicker].tickValue : 1;
          const pnlPerContract = Number(trade.pnl) / Number(trade.quantity);
          const tradeTicks = Math.round(pnlPerContract / tickValue);
          const filterValue = tickFilter.value;
          if (filterValue && tradeTicks !== Number(filterValue.replace('+', ''))) {
            return false;
          }
        }

        // Time range filter
        if (timeRange.range && getTimeRangeKey(trade.timeInPosition) !== timeRange.range) {
          return false;
        }

        // Weekday filter
        if (weekdayFilter?.day !== null) {
          const dayOfWeek = entryDate.getDay();
          if (dayOfWeek !== weekdayFilter.day) {
            return false;
          }
        }

        // Hour filter
        if (hourFilter?.hour !== null) {
          const hour = entryDate.getHours();
          if (hour !== hourFilter.hour) {
            return false;
          }
        }

        // Tag filter
        if (tagFilter.tags.length > 0) {
          if (!trade.tags.some(tag => tagFilter.tags.includes(tag))) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => parseISO(a.entryDate).getTime() - parseISO(b.entryDate).getTime());
  }, [
    trades,
    groups,
    accounts,
    instruments,
    accountNumbers,
    dateRange,
    pnlRange,
    tickFilter,
    tickDetails,
    timeRange,
    weekdayFilter,
    hourFilter,
    tagFilter,
    timezone
  ]);

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
    return Boolean(subscription?.status === 'active' && ['plus', 'pro'].includes(subscription?.plan?.split('_')[0].toLowerCase() || ''));
  };


  const saveAccount = useCallback(async (newAccount: Account) => {
    if (!user?.id) return

    try {
      // Get the current account to preserve other properties
      const { accounts } = useUserStore.getState()
      const currentAccount = accounts.find(acc => acc.number === newAccount.number) as Account
      // If the account is not found, create it
      if (!currentAccount) {
        const createdAccount = await setupAccountAction(newAccount)
        setAccounts([...accounts, createdAccount])
        // Revalidate cache for next reload
        revalidateCache([`user-data-${user.id}`])
        return
      }

      // Update the account in the database
      const updatedAccount = await setupAccountAction(newAccount)
      // Update the account in the local state
      const updatedAccounts = accounts.map((account: Account) => {
        if (account.number === updatedAccount.number) {
          return { ...account, ...updatedAccount };
        }
        return account;
      });
      setAccounts(updatedAccounts);
      revalidateCache([`user-data-${user.id}`])
    } catch (error) {
      console.error('Error updating account:', error)
      throw error
    }
  }, [user?.id, accounts, setAccounts])


  // Add createGroup function
  const saveGroup = useCallback(async (name: string) => {
    if (!user?.id) return
    try {
      const newGroup = await saveGroupAction(name)
      setGroups(([...groups, newGroup]))
      return newGroup
    } catch (error) {
      console.error('Error creating group:', error)
      throw error
    }
  }, [user?.id, accounts, groups, setGroups])

  const renameGroup = useCallback(async (groupId: string, name: string) => {
    if (!user?.id) return
    try {
      setGroups(groups.map(group => group.id === groupId ? { ...group, name } : group))
      await renameGroupAction(groupId, name)
    } catch (error) {
      console.error('Error renaming group:', error)
      throw error
    }
  }, [user?.id])

  // Add deleteGroup function
  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      // Remove groupdId from accounts
      const updatedAccounts = accounts.map((account: Account) => {
        if (account.groupId === groupId) {
          return { ...account, groupId: null }
        }
        return account
      })
      setAccounts(updatedAccounts)
      setGroups(groups.filter(group => group.id !== groupId))
      await deleteGroupAction(groupId)
    } catch (error) {
      console.error('Error deleting group:', error)
      throw error
    }
  }, [accounts, setAccounts])

  // Add moveAccountToGroup function
  const moveAccountToGroup = useCallback(async (accountId: string, targetGroupId: string | null) => {
    try {
      if (!accounts || accounts.length === 0) {
        console.error('No accounts available to move');
        return;
      }

      // Update accounts state
      const updatedAccounts = accounts.map((account: Account) => {
        if (account.id === accountId) {
          return { ...account, groupId: targetGroupId }
        }
        return account
      })
      setAccounts(updatedAccounts)

      // Update groups state
      const accountToMove = accounts.find(acc => acc.id === accountId)
      if (accountToMove) {
        setGroups(groups.map(group => {
          // If this is the target group, add the account only if it's not already there
          if (group.id === targetGroupId) {
            const accountExists = group.accounts.some(acc => acc.id === accountId)
            return {
              ...group,
              accounts: accountExists ? group.accounts : [...group.accounts, accountToMove]
            }
          }
          // For all other groups, remove the account if it exists
          return { ...group, accounts: group.accounts.filter(acc => acc.id !== accountId) }
        }))
      }

      await moveAccountToGroupAction(accountId, targetGroupId)
    } catch (error) {
      console.error('Error moving account to group:', error)
      throw error
    }
  }, [accounts, setAccounts, setGroups, groups])

  // Add savePayout function
  const savePayout = useCallback(async (payout: PrismaPayout) => {
    if (!user?.id || isSharedView) return;

    try {
      // Add to database
      const newPayout = await savePayoutAction(payout);

      // Update local state
      setAccounts(accounts.map((account: Account) => {
        if (account.number === payout.accountNumber) {
          return {
            ...account,
            payouts: [...(account.payouts || []), newPayout]
          };
        }
        return account;
      })
      );

    } catch (error) {
      console.error('Error adding payout:', error);
      throw error;
    }
  }, [user?.id, isSharedView, accounts, setAccounts]);

  // Add deleteAccount function
  const deleteAccount = useCallback(async (account: Account) => {
    if (!user?.id || isSharedView) return;

    try {
      // Update local state
      setAccounts(accounts.filter(acc => acc.id !== account.id));
      // Delete from database
      await deleteAccountAction(account);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }, [user?.id, isSharedView, accounts, setAccounts]);

  // Add deletePayout function
  const deletePayout = useCallback(async (payoutId: string) => {
    if (!user?.id || isSharedView) return;

    try {

      // Update local state
      const accounts = useUserStore(state => state.accounts)
      setAccounts(accounts.map((account: Account) => ({
        ...account,
        payouts: account.payouts?.filter(p => p.id !== payoutId) || []
      })
      ));

      // Delete from database
      await deletePayoutAction(payoutId);

    } catch (error) {
      console.error('Error deleting payout:', error);
      throw error;
    }
  }, [user?.id, isSharedView, accounts, setAccounts]);

  const changeIsFirstConnection = useCallback(async (isFirstConnection: boolean) => {
    if (!user?.id) return
    // Update the user in the database
    setIsFirstConnection(isFirstConnection)
    await updateIsFirstConnectionAction(isFirstConnection)
  }, [user?.id, setIsFirstConnection])

  const updateTrades = useCallback(async (tradeIds: string[], update: Partial<PrismaTrade>) => {
    if (!user?.id) return
    const updatedTrades = trades.map(
      trade =>
        tradeIds.includes(trade.id) ? {
          ...trade,
          ...update
        } : trade
    )
    setTrades(updatedTrades)
    await updateTradesAction(tradeIds, update)
  }, [user?.id, trades, setTrades])

  const groupTrades = useCallback(async (tradeIds: string[]) => {
    if (!user?.id) return
    setTrades(trades.map(trade => ({
      ...trade,
      groupId: tradeIds[0]
    })))
    await groupTradesAction(tradeIds)
  }, [user?.id, trades, setTrades])

  const ungroupTrades = useCallback(async (tradeIds: string[]) => {
    if (!user?.id) return
    setTrades(trades.map(trade => ({
      ...trade,
      groupId: null
    })))
    await ungroupTradesAction(tradeIds)
  }, [user?.id, trades, setTrades])

  const saveDashboardLayout = useCallback(async (layout: PrismaDashboardLayout) => {
    if (!user?.id) return
    setDashboardLayout(layout)
    await saveDashboardLayoutAction(layout)
    revalidateCache([`user-data-${user.id}`])
  }, [user?.id, setDashboardLayout])

  const contextValue: DataContextType = {
    isPlusUser,
    isLoading,
    isMobile,
    isSharedView,
    sharedParams,
    setSharedParams,
    refreshTrades,
    changeIsFirstConnection,
    isFirstConnection,
    setIsFirstConnection,

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

    // Tag filter
    tagFilter,
    setTagFilter,

    // Statistics and calendar
    statistics,
    calendarData,

    // Mutations

    // Update trade
    updateTrades,
    groupTrades,
    ungroupTrades,

    // Accounts
    deleteAccount,
    saveAccount,

    // Group functions
    saveGroup,
    renameGroup,
    deleteGroup,
    moveAccountToGroup,

    // Payout functions
    deletePayout,
    savePayout,

    // Dashboard layout
    saveDashboardLayout,
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
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