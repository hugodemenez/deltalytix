"use client";
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Trade as PrismaTrade,
  Group as PrismaGroup,
  Account as PrismaAccount,
  Payout as PrismaPayout,
  DashboardLayout as PrismaDashboardLayout,
  Subscription as PrismaSubscription,
  Tag,
} from "@/prisma/generated/prisma/browser";
import { SharedParams } from "@/server/shared";
import {
  getDashboardLayout,
  getUserData,
  loadSharedData,
  updateIsFirstConnectionAction,
} from "@/server/user-data";
import {
  getTradesAction,
  groupTradesAction,
  saveDashboardLayoutAction,
  ungroupTradesAction,
  updateTradesAction,
} from "@/server/database";
import {
  deletePayoutAction,
  deleteAccountAction,
  setupAccountAction,
  savePayoutAction,
  calculateAccountBalanceAction,
  calculateAccountMetricsAction,
  deleteTradesByIdsAction,
} from "@/server/accounts";
import { computeMetricsForAccounts } from "@/lib/account-metrics";
import {
  saveGroupAction,
  deleteGroupAction,
  moveAccountToGroupAction,
  renameGroupAction,
} from "@/server/groups";
import { createClient } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { signOut, getUserId, updateUserLanguage } from "@/server/auth";
import { DashboardLayoutWithWidgets, useUserStore } from "@/store/user-store";
import { useTickDetailsStore } from "@/store/tick-details-store";
import { useFinancialEventsStore } from "@/store/financial-events-store";
import { useTradesStore } from "@/store/trades-store";
import { getTradesCache, setTradesCache } from "@/lib/indexeddb/trades-cache";
import { endOfDay, isValid, parseISO, set, startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { calculateStatistics, formatCalendarData } from "@/lib/utils";
import { useParams } from "next/navigation";
import { deleteTagAction } from "@/server/tags";
import { useRouter } from "next/navigation";
import { useCurrentLocale } from "@/locales/client";
import { useMoodStore } from "@/store/mood-store";
import { useStripeSubscriptionStore } from "@/store/stripe-subscription-store";
import { getSubscriptionData } from "@/server/billing";
import { defaultLayouts } from "@/lib/default-layouts";

// Types from trades-data.tsx
type StatisticsProps = {
  cumulativeFees: number;
  cumulativePnl: number;
  winningStreak: number;
  winRate: number;
  nbTrades: number;
  nbBe: number;
  nbWin: number;
  nbLoss: number;
  totalPositionTime: number;
  averagePositionTime: string;
  profitFactor: number;
  grossLosses: number;
  grossWin: number;
  totalPayouts: number;
  nbPayouts: number;
};

type CalendarData = {
  [date: string]: {
    pnl: number;
    tradeNumber: number;
    longNumber: number;
    shortNumber: number;
    trades: PrismaTrade[];
  };
};

interface DateRange {
  from?: Date;
  to?: Date;
}

interface TickRange {
  min: number | undefined;
  max: number | undefined;
}

interface PnlRange {
  min: number | undefined;
  max: number | undefined;
}

// Add new interface for time range
interface TimeRange {
  range: string | null;
}

// Add new interface for tick filter
interface TickFilter {
  value: string | null;
}

// Update WeekdayFilter interface to use array of numbers
interface WeekdayFilter {
  days: number[];
}

// Add new interface for hour filter
interface HourFilter {
  hour: number | null;
}

// Add tag filter interface
interface TagFilter {
  tags: string[];
}

export interface Group extends PrismaGroup {
  accounts: PrismaAccount[];
}

// Update Account type to include payouts, balanceToDate, and all computed metrics
export interface Account extends Omit<PrismaAccount, "payouts" | "group"> {
  payouts?: PrismaPayout[];
  balanceToDate?: number;
  group?: PrismaGroup | null;
  aboveBuffer?: number;
  // Filtered trades used for metrics/charts (not to be sent to server actions)
  trades?: PrismaTrade[];

  // Computed metrics
  metrics?: {
    // Balance and progress
    currentBalance: number;
    remainingToTarget: number;
    progress: number;
    isConfigured: boolean;

    // Drawdown metrics
    drawdownProgress: number;
    remainingLoss: number;
    highestBalance: number;
    drawdownLevel: number;

    // Consistency metrics
    totalProfit: number;
    maxAllowedDailyProfit: number | null;
    highestProfitDay: number;
    isConsistent: boolean;
    hasProfitableData: boolean;
    dailyPnL: { [key: string]: number };
    totalProfitableDays: number;

    // Trading days metrics
    totalTradingDays: number;
    validTradingDays: number;
  };

  // Daily metrics for account table
  dailyMetrics?: Array<{
    date: Date;
    pnl: number;
    totalBalance: number;
    percentageOfTarget: number;
    isConsistent: boolean;
    payout?: {
      id: string;
      amount: number;
      date: Date;
      status: string;
    };
  }>;
}


// Combined Context Type
interface DataContextType {
  refreshTrades: () => Promise<void>;
  refreshTradesOnly: (options?: { force?: boolean }) => Promise<void>;
  refreshUserDataOnly: (options?: { force?: boolean; includeStripe?: boolean }) => Promise<void>;
  refreshAllData: (options?: { force?: boolean }) => Promise<void>;
  isPlusUser: () => boolean;
  isLoading: boolean;
  isMobile: boolean;
  isSharedView: boolean;
  changeIsFirstConnection: (isFirstConnection: boolean) => void;
  isFirstConnection: boolean;
  setIsFirstConnection: (isFirstConnection: boolean) => void;
  sharedParams: SharedParams | null;
  setSharedParams: React.Dispatch<React.SetStateAction<SharedParams | null>>;

  // Formatted trades and filters
  formattedTrades: PrismaTrade[];
  instruments: string[];
  setInstruments: React.Dispatch<React.SetStateAction<string[]>>;
  accountNumbers: string[];
  setAccountNumbers: React.Dispatch<React.SetStateAction<string[]>>;
  dateRange: DateRange | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  tickRange: TickRange;
  setTickRange: React.Dispatch<React.SetStateAction<TickRange>>;
  pnlRange: PnlRange;
  setPnlRange: React.Dispatch<React.SetStateAction<PnlRange>>;
  timeRange: TimeRange;
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>;
  tickFilter: TickFilter;
  setTickFilter: React.Dispatch<React.SetStateAction<TickFilter>>;
  weekdayFilter: WeekdayFilter;
  setWeekdayFilter: React.Dispatch<React.SetStateAction<WeekdayFilter>>;
  hourFilter: HourFilter;
  setHourFilter: React.Dispatch<React.SetStateAction<HourFilter>>;
  tagFilter: TagFilter;
  setTagFilter: React.Dispatch<React.SetStateAction<TagFilter>>;

  // Statistics and calendar
  statistics: StatisticsProps;
  calendarData: CalendarData;

  // Mutations
  // Trades
  updateTrades: (
    tradeIds: string[],
    update: Partial<PrismaTrade>
  ) => Promise<void>;
  deleteTrades: (tradeIds: string[]) => Promise<void>;
  groupTrades: (tradeIds: string[]) => Promise<void>;
  ungroupTrades: (tradeIds: string[]) => Promise<void>;

  // Accounts
  deleteAccount: (account: Account) => Promise<void>;
  saveAccount: (account: Account) => Promise<void>;

  // Groups
  saveGroup: (name: string) => Promise<Group | undefined>;
  renameGroup: (groupId: string, name: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  moveAccountToGroup: (
    accountId: string,
    targetGroupId: string | null
  ) => Promise<void>;
  moveAccountsToGroup: (
    accountIds: string[],
    targetGroupId: string | null
  ) => Promise<void>;

  // Payouts
  savePayout: (payout: PrismaPayout) => Promise<void>;
  deletePayout: (payoutId: string) => Promise<void>;

  // Dashboard layout
  saveDashboardLayout: (layout: PrismaDashboardLayout) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Add this hook before the UserDataProvider component
function useIsMobileDetection() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mobileQuery = window.matchMedia("(max-width: 768px)");
    const checkMobile = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);

    // Check immediately
    checkMobile(mobileQuery);

    // Add listener for changes
    mobileQuery.addEventListener("change", checkMobile);
    return () => mobileQuery.removeEventListener("change", checkMobile);
  }, []);

  return isMobile;
}

const supabase = createClient();

export const DataProvider: React.FC<{
  children: React.ReactNode;
  isSharedView?: boolean;
  adminView?: {
    userId: string;
  };
}> = ({ children, isSharedView = false, adminView = null }) => {
  const router = useRouter();
  const params = useParams();
  const isMobile = useIsMobileDetection();

  // Get store values
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const setSubscription = useUserStore((state) => state.setSubscription);
  const setTags = useUserStore((state) => state.setTags);
  const setAccounts = useUserStore((state) => state.setAccounts);
  const setGroups = useUserStore((state) => state.setGroups);
  const setDashboardLayout = useUserStore((state) => state.setDashboardLayout);
  const setMoods = useMoodStore((state) => state.setMoods);
  const supabaseUser = useUserStore((state) => state.supabaseUser);
  const timezone = useUserStore((state) => state.timezone);
  const groups = useUserStore((state) => state.groups);
  const accounts = useUserStore((state) => state.accounts);
  const setSupabaseUser = useUserStore((state) => state.setSupabaseUser);
  const subscription = useUserStore((state) => state.subscription);
  const setTickDetails = useTickDetailsStore((state) => state.setTickDetails);
  const tickDetails = useTickDetailsStore((state) => state.tickDetails);
  const setEvents = useFinancialEventsStore((state) => state.setEvents);
  const trades = useTradesStore((state) => state.trades);
  const setTrades = useTradesStore((state) => state.setTrades);
  const dashboardLayout = useUserStore((state) => state.dashboardLayout);
  const locale = useCurrentLocale();
  const isLoading = useUserStore((state) => state.isLoading);
  const setIsLoading = useUserStore((state) => state.setIsLoading);

  // Stripe subscription store
  const setStripeSubscription = useStripeSubscriptionStore(
    (state) => state.setStripeSubscription
  );
  const setStripeSubscriptionLoading = useStripeSubscriptionStore(
    (state) => state.setIsLoading
  );
  const setStripeSubscriptionError = useStripeSubscriptionStore(
    (state) => state.setError
  );

  // Local states
  const [sharedParams, setSharedParams] = useState<SharedParams | null>(null);

  // Filter states
  const [instruments, setInstruments] = useState<string[]>([]);
  const [accountNumbers, setAccountNumbers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tickRange, setTickRange] = useState<TickRange>({
    min: undefined,
    max: undefined,
  });
  const [pnlRange, setPnlRange] = useState<PnlRange>({
    min: undefined,
    max: undefined,
  });
  const [timeRange, setTimeRange] = useState<TimeRange>({ range: null });
  const [tickFilter, setTickFilter] = useState<TickFilter>({ value: null });
  const [weekdayFilter, setWeekdayFilter] = useState<WeekdayFilter>({
    days: [],
  });
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
          const processedSharedTrades = sharedData.trades.map((trade) => ({
            ...trade,
            utcDateStr: formatInTimeZone(
              new Date(trade.entryDate),
              timezone,
              "yyyy-MM-dd"
            ),
          }));

          // Batch state updates
          const updates = async () => {
            setTrades(processedSharedTrades);
            setSharedParams(sharedData.params);

            setDashboardLayout(defaultLayouts);

            if (sharedData.params.tickDetails) {
              setTickDetails(sharedData.params.tickDetails);
            }

            const accountsWithMetrics = await calculateAccountMetricsAction(
              sharedData.groups?.flatMap((group) => group.accounts) || []
            );
            setGroups(sharedData.groups || []);
            setAccounts(accountsWithMetrics);
          };

          await updates();
        }
        setIsLoading(false);
        return;
      }

      if (adminView) {
        const trades = await getTradesAction(adminView.userId as string, false);
        setTrades(trades as PrismaTrade[]);
        // RESET ALL OTHER STATES
        setUser(null);
        setSubscription(null);
        setTags([]);
        setGroups([]);
        setMoods([]);
        setEvents([]);
        setTickDetails([]);
        setAccounts([]);
        setGroups([]);
        setDashboardLayout({
          id: "admin-layout",
          userId: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
          desktop: defaultLayouts.desktop,
          mobile: defaultLayouts.mobile,
        });
        return;
      }

      // Step 1: Get Supabase user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        await signOut();
        setIsLoading(false);
        return;
      }

      setSupabaseUser(user);

      // CRITICAL: Get dashboard layout first
      // But check if the layout is already in the state
      // TODO: Cache layout client side (lightweight)
      if (!dashboardLayout) {
        const userId = await getUserId();
        const dashboardLayoutResponse = await getDashboardLayout(userId);
        if (dashboardLayoutResponse) {
          setDashboardLayout(
            dashboardLayoutResponse as unknown as DashboardLayoutWithWidgets
          );
        } else {
          // If no layout exists in database, use default layout
          setDashboardLayout(defaultLayouts);
        }
      }

      // Step 2: Fetch trades (with caching server side)
      // I think we could make basic computations server side to offload inital stats computations
      // Dev: prefer local IndexedDB to avoid hitting remote DB on reloads
      const userId = await getUserId();
      if (
        process.env.NODE_ENV === "development" &&
        userId &&
        !params?.isSharedView // avoid caching shared/public views
      ) {
        const cachedTrades = await getTradesCache(userId);
        if (cachedTrades && Array.isArray(cachedTrades) && cachedTrades.length > 0) {
          setTrades(cachedTrades);
        } else {
          const trades = await getTradesAction(userId, false);
          const safeTrades = Array.isArray(trades) ? trades : [];
          setTrades(safeTrades);
          setTradesCache(userId, safeTrades).catch((err) =>
            console.error("[DataProvider] Failed to cache trades in IndexedDB (loadData)", err),
          );
        }
      } else {
        const trades = await getTradesAction();
        setTrades(Array.isArray(trades) ? trades : []);
      }

      // Step 3: Fetch user data
      // TODO: Check what we could cache client side
      const data = await getUserData();

      if (!data) {
        await signOut();
        setIsLoading(false);
        return;
      }

      // Calculate metrics for each account
      const accountsWithMetrics = await calculateAccountMetricsAction(
        data.accounts || []
      );
      setAccounts(accountsWithMetrics);

      setUser(data.userData);
      setSubscription(data.subscription as PrismaSubscription | null);
      setTags(data.tags);
      setGroups(data.groups);
      setMoods(data.moodHistory);
      setEvents(data.financialEvents);
      setTickDetails(data.tickDetails);
      setIsFirstConnection(data.userData?.isFirstConnection || false);
    } catch (error) {
      console.error("Error loading data:", error);
      // Optionally handle specific error cases here
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    isSharedView,
    params?.slug,
    timezone,
    supabaseUser,
    isLoading,
    setIsLoading,
  ]);

  // Load data on mount and when isSharedView changes
  useEffect(() => {
    let mounted = true;

    const loadDataIfMounted = async () => {
      if (!mounted) return;
      await loadData();
      // Load Stripe subscription data
      try {
        setStripeSubscriptionLoading(true);
        const stripeSubscriptionData = await getSubscriptionData();
        setStripeSubscription(stripeSubscriptionData);
        setStripeSubscriptionError(null);
      } catch (error) {
        console.error("Error loading Stripe subscription:", error);
        setStripeSubscriptionError(
          error instanceof Error ? error.message : "Failed to load subscription"
        );
        setStripeSubscription(null);
      } finally {
        setStripeSubscriptionLoading(false);
      }
    };

    loadDataIfMounted();

    return () => {
      mounted = false;
    };
  }, [isSharedView]); // Only depend on isSharedView

  // Persist language changes without blocking UI
  useEffect(() => {
    const updateLanguage = async () => {
      if (!supabaseUser?.id || !locale) return;
      // Fire and forget; do not block UI
      await updateUserLanguage(locale).catch((e) => {
        console.error("[DataProvider] Failed to update user language", e);
      });
    };
    updateLanguage();
  }, [locale, supabaseUser?.id]);

  const loadStripeSubscription = useCallback(async () => {
    try {
      setStripeSubscriptionLoading(true);
      const stripeSubscriptionData = await getSubscriptionData();
      setStripeSubscription(stripeSubscriptionData);
      setStripeSubscriptionError(null);
    } catch (error) {
      console.error("Error loading Stripe subscription:", error);
      setStripeSubscriptionError(
        error instanceof Error ? error.message : "Failed to load subscription"
      );
      setStripeSubscription(null);
    } finally {
      setStripeSubscriptionLoading(false);
    }
  }, []);

  const refreshTradesOnly = useCallback(
    async (options?: { force?: boolean; withLoading?: boolean }) => {
      if (!supabaseUser?.id) return;
      const { force = false, withLoading = true } = options || {};

      if (withLoading) setIsLoading(true);

      try {
        const userId = await getUserId();
        if (!userId) return;

        // Dev-only: serve trades from IndexedDB to avoid DB hits when possible
        if (process.env.NODE_ENV === "development" && !force) {
          const cachedTrades = await getTradesCache(userId);
          if (cachedTrades && Array.isArray(cachedTrades) && cachedTrades.length > 0) {
            setTrades(cachedTrades);
            if (withLoading) setIsLoading(false);
            return;
          }
        }

        const trades = await getTradesAction(userId, force);
        const safeTrades = Array.isArray(trades) ? trades : [];
        setTrades(safeTrades);

        if (process.env.NODE_ENV === "development") {
          // Best-effort cache write; do not block UI on failure
          setTradesCache(userId, safeTrades).catch((err) =>
            console.error("[refreshTradesOnly] Failed to cache trades in IndexedDB", err),
          );
        }
      } catch (error) {
        console.error("Error refreshing trades:", error);
      } finally {
        if (withLoading) setIsLoading(false);
      }
    },
    [supabaseUser?.id, setTrades]
  );

  const refreshUserDataOnly = useCallback(
    async (
      options?: { force?: boolean; includeStripe?: boolean; withLoading?: boolean }
    ) => {
      if (!supabaseUser?.id) return;
      const {
        force = false,
        includeStripe = false,
        withLoading = true,
      } = options || {};

      if (withLoading) setIsLoading(true);

      try {
        const data = await getUserData(force);

        if (!data) {
          await signOut();
          return;
        }

        const accountsWithMetrics = await calculateAccountMetricsAction(
          data.accounts || []
        );
        setAccounts(accountsWithMetrics);

        setUser(data.userData);
        setSubscription(data.subscription as PrismaSubscription | null);
        setTags(data.tags);
        setGroups(data.groups);
        setMoods(data.moodHistory);
        setEvents(data.financialEvents);
        setTickDetails(data.tickDetails);
        setIsFirstConnection(data.userData?.isFirstConnection || false);

        if (includeStripe) {
          await loadStripeSubscription();
        }
      } catch (error) {
        console.error("Error refreshing user data:", error);
      } finally {
        if (withLoading) setIsLoading(false);
      }
    },
    [
      supabaseUser?.id,
      setAccounts,
      setUser,
      setSubscription,
      setTags,
      setGroups,
      setMoods,
      setEvents,
      setTickDetails,
      setIsFirstConnection,
      loadStripeSubscription,
    ]
  );

  const refreshAllData = useCallback(
    async (options?: { force?: boolean }) => {
      if (!supabaseUser?.id) return;
      const force = options?.force ?? false;

      setIsLoading(true);
      try {
        await refreshTradesOnly({ force, withLoading: false });
        await refreshUserDataOnly({
          force,
          includeStripe: true,
          withLoading: false,
        });
        console.log("[refreshAllData] Successfully refreshed trades and user data");
      } catch (error) {
        console.error("Error refreshing all data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [refreshTradesOnly, refreshUserDataOnly, supabaseUser?.id]
  );

  // Dev-only: persist trades store into IndexedDB so reloads avoid DB hits
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!supabaseUser?.id) return;
    if (!Array.isArray(trades)) return;
    if (trades.length === 0) return; // avoid caching empty and blocking future fetches

    const timer = window.setTimeout(() => {
      setTradesCache(supabaseUser.id, trades).catch((err) =>
        console.error("[DataProvider] Failed to sync trades to IndexedDB", err),
      );
    }, 200);

    return () => window.clearTimeout(timer);
  }, [trades, supabaseUser?.id]);

  const formattedTrades = useMemo(() => {
    // Early return if no trades or if trades is not an array
    if (!trades || !Array.isArray(trades) || trades.length === 0)
      return [];

    // Get hidden accounts for filtering
    const hiddenGroup = groups.find((g) => g.name === "Hidden Accounts");
    const hiddenAccountNumbers = accounts
      .filter((a) => a.groupId === hiddenGroup?.id)
      .map((a) => a.number);

    // Apply all filters in a single pass
    return trades
      .filter((trade) => {
        // Skip trades from hidden accounts
        if (hiddenAccountNumbers.includes(trade.accountNumber)) {
          return false;
        }

        // We should identify when accounts pass their buffer
        // We can get the index of the first trade whihch is after the buffer date of its account
        const tradeAccount = accounts.find(
          (acc) => acc.number === trade.accountNumber
        );

        // Validate entry date
        const entryDate = new Date(
          formatInTimeZone(
            new Date(trade.entryDate),
            timezone,
            "yyyy-MM-dd HH:mm:ssXXX"
          )
        );
        if (!isValid(entryDate)) return false;

        // Filter trades before reset date if shouldConsiderTradesBeforeReset is false
        if (tradeAccount?.resetDate && tradeAccount.shouldConsiderTradesBeforeReset === false) {
          const resetDate = startOfDay(new Date(tradeAccount.resetDate));
          const tradeDate = startOfDay(entryDate);
          if (tradeDate < resetDate) {
            return false;
          }
        }

        // Instrument filter
        if (instruments.length > 0 && !instruments.includes(trade.instrument)) {
          return false;
        }

        // Account filter
        if (
          accountNumbers.length > 0 &&
          !accountNumbers.includes(trade.accountNumber)
        ) {
          return false;
        }

        // Date range filter
        if (dateRange?.from || dateRange?.to) {
          const tradeDate = startOfDay(entryDate);

          // Filter from date (keep all trades from this date forward)
          if (dateRange?.from) {
            const fromDate = startOfDay(dateRange.from);
            if (entryDate < fromDate) {
              return false;
            }
          }

          // Filter to date (keep all trades up to this date)
          if (dateRange?.to) {
            const toDate = endOfDay(dateRange.to);
            if (entryDate > toDate) {
              return false;
            }
          }

          // If both are set and it's a single day, ensure exact match
          if (dateRange?.from && dateRange?.to) {
            const fromDate = startOfDay(dateRange.from);
            const toDate = endOfDay(dateRange.to);
            if (fromDate.getTime() === startOfDay(toDate).getTime()) {
              // Single day selection - already handled above, but ensure exact match
              if (tradeDate.getTime() !== fromDate.getTime()) {
                return false;
              }
            }
          }
        }

        // PnL range filter
        if (
          (pnlRange.min !== undefined && trade.pnl < pnlRange.min) ||
          (pnlRange.max !== undefined && trade.pnl > pnlRange.max)
        ) {
          return false;
        }

        // Tick filter
        if (tickFilter?.value) {
          // Fix ticker matching logic - sort by length descending to match longer tickers first
          // This prevents "ES" from matching "MES" trades
          const matchingTicker = Object.keys(tickDetails)
            .sort((a, b) => b.length - a.length) // Sort by length descending
            .find((ticker) => trade.instrument.includes(ticker));
          const tickValue = matchingTicker
            ? tickDetails[matchingTicker].tickValue
            : 1;
          const pnlPerContract = Number(trade.pnl) / Number(trade.quantity);
          const tradeTicks = Math.round(pnlPerContract / tickValue);
          const filterValue = tickFilter.value;
          if (
            filterValue &&
            tradeTicks !== Number(filterValue.replace("+", ""))
          ) {
            return false;
          }
        }

        // Time range filter
        if (
          timeRange.range &&
          getTimeRangeKey(trade.timeInPosition) !== timeRange.range
        ) {
          return false;
        }

        // Weekday filter
        if (weekdayFilter?.days && weekdayFilter.days.length > 0) {
          const dayOfWeek = entryDate.getDay();
          if (!weekdayFilter.days.includes(dayOfWeek)) {
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
          if (!trade.tags.some((tag) => tagFilter.tags.includes(tag))) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) =>
          parseISO(a.entryDate).getTime() - parseISO(b.entryDate).getTime()
      );
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
    timezone,
    isLoading,
  ]);

  const statistics = useMemo(() => {
    const stats = calculateStatistics(formattedTrades, accounts);

    // Calculate gross profits and gross losses including commissions
    const grossProfits = formattedTrades.reduce((sum, trade) => {
      const totalPnL = trade.pnl - trade.commission;
      return totalPnL > 0 ? sum + totalPnL : sum;
    }, 0);

    const grossLosses = Math.abs(
      formattedTrades.reduce((sum, trade) => {
        const totalPnL = trade.pnl - trade.commission;
        return totalPnL < 0 ? sum + totalPnL : sum;
      }, 0)
    );

    // Calculate profit factor (handle division by zero)
    const profitFactor =
      grossLosses === 0
        ? grossProfits > 0
          ? Number.POSITIVE_INFINITY
          : 1
        : grossProfits / grossLosses;

    return {
      ...stats,
      profitFactor,
    };
  }, [formattedTrades, accounts]);

  const calendarData = useMemo(
    () => formatCalendarData(formattedTrades, accounts),
    [formattedTrades, accounts]
  );

  const isPlusUser = () => {
    // Use Stripe subscription store for more accurate subscription status
    const stripeSubscription =
      useStripeSubscriptionStore.getState().stripeSubscription;
    if (stripeSubscription) {
      const planName = stripeSubscription.plan?.name?.toLowerCase() || "";
      return planName.includes("plus") || planName.includes("pro");
    }

    // Fallback to database subscription
    return Boolean(
      subscription?.status === "active" &&
        ["plus", "pro"].includes(
          subscription?.plan?.split("_")[0].toLowerCase() || ""
        )
    );
  };

  const saveAccount = useCallback(
    async (newAccount: Account) => {
      if (!supabaseUser?.id) return;

      try {
        // Get the current account to preserve other properties
        const { accounts } = useUserStore.getState();
        const currentAccount = accounts.find(
          (acc) => acc.number === newAccount.number
        ) as Account;
        // If the account is not found, create it
        if (!currentAccount) {
          // Never send client-only fields to server
          const { trades: _trades, ...serverAccount } = newAccount;
          const considerBuffer = newAccount.considerBuffer ?? true;
          const createdAccount = await setupAccountAction(
            serverAccount as Account
          );

          // Recalculate metrics for the new account (optimistic, client-side)
          const accountsWithMetrics = computeMetricsForAccounts(
            [
              {
                ...createdAccount,
                considerBuffer: createdAccount.considerBuffer ?? considerBuffer,
              },
            ],
            trades
          );
          const accountWithMetrics = accountsWithMetrics[0];

          setAccounts([...accounts, accountWithMetrics]);

          // If the new account has a groupId, update the groups state to include it
          if (accountWithMetrics.groupId) {
            setGroups(
              groups.map((group) => {
                if (group.id === accountWithMetrics.groupId) {
                  return {
                    ...group,
                    accounts: [...group.accounts, accountWithMetrics],
                  };
                }
                return group;
              })
            );
          }
          return;
        }

        // Update the account in the database
        // Strip client-only fields
        const { trades: _trades2, ...serverAccount2 } = newAccount;
        const considerBuffer = newAccount.considerBuffer ?? true;
        const updatedAccount = await setupAccountAction(
          serverAccount2 as Account
        );

        // Recalculate metrics for the updated account (optimistic, client-side)
        const accountsWithMetrics = computeMetricsForAccounts(
          [
            {
              ...updatedAccount,
              considerBuffer: updatedAccount.considerBuffer ?? considerBuffer,
            },
          ],
          trades
        );
        const accountWithMetrics = accountsWithMetrics[0];

        // Check if groupId changed
        const oldGroupId = currentAccount.groupId;
        const newGroupId = accountWithMetrics.groupId;
        const groupIdChanged = oldGroupId !== newGroupId;

        // Update the account in the local state with recalculated metrics
        const updatedAccounts = accounts.map((account: Account) => {
          if (account.number === accountWithMetrics.number) {
            return accountWithMetrics;
          }
          return account;
        });
        setAccounts(updatedAccounts);

        // Update groups state if groupId changed
        if (groupIdChanged) {
          // Get fresh groups from store to avoid stale closure references
          const currentGroups = useUserStore.getState().groups;

          // Check if the target group exists in the groups array
          const targetGroupExists = currentGroups.some(
            (g) => g.id === newGroupId
          );

          if (targetGroupExists) {
            // Update existing groups
            setGroups(
              currentGroups.map((group) => {
                // If this is the new target group, add the account only if it's not already there
                if (group.id === newGroupId) {
                  const accountExists = group.accounts.some(
                    (acc) =>
                      acc.id === accountWithMetrics.id ||
                      acc.number === accountWithMetrics.number
                  );
                  return {
                    ...group,
                    accounts: accountExists
                      ? group.accounts
                      : [...group.accounts, accountWithMetrics],
                  };
                }
                // For all other groups (including the old group), remove the account if it exists
                return {
                  ...group,
                  accounts: group.accounts.filter(
                    (acc) =>
                      acc.id !== accountWithMetrics.id &&
                      acc.number !== accountWithMetrics.number
                  ),
                };
              })
            );
          } else if (newGroupId) {
            // If the group doesn't exist yet (just created), we need to add it
            // This can happen if a group was just created and saveAccount is called immediately
            // Try to fetch the group from the database, or create a minimal group object
            try {
              const { getGroupsAction } = await import("@/server/groups");
              const allGroups = await getGroupsAction();
              const foundGroup = allGroups.find((g) => g.id === newGroupId);

              if (foundGroup) {
                // Use the actual group from database
                const updatedGroups = currentGroups.map((group) => ({
                  ...group,
                  accounts: group.accounts.filter(
                    (acc) =>
                      acc.id !== accountWithMetrics.id &&
                      acc.number !== accountWithMetrics.number
                  ),
                }));
                setGroups([
                  ...updatedGroups,
                  { ...foundGroup, accounts: [accountWithMetrics] },
                ]);
              } else {
                // Fallback: create minimal group object (shouldn't happen, but just in case)
                const newGroup = {
                  id: newGroupId,
                  name: "New Group", // Temporary name
                  userId: supabaseUser.id,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  accounts: [accountWithMetrics],
                };

                const updatedGroups = currentGroups.map((group) => ({
                  ...group,
                  accounts: group.accounts.filter(
                    (acc) =>
                      acc.id !== accountWithMetrics.id &&
                      acc.number !== accountWithMetrics.number
                  ),
                }));

                setGroups([...updatedGroups, newGroup]);
              }
            } catch (error) {
              console.error("Error fetching group:", error);
              // Fallback: create minimal group object
              const newGroup = {
                id: newGroupId,
                name: "New Group",
                userId: supabaseUser.id,
                createdAt: new Date(),
                updatedAt: new Date(),
                accounts: [accountWithMetrics],
              };

              const updatedGroups = currentGroups.map((group) => ({
                ...group,
                accounts: group.accounts.filter(
                  (acc) =>
                    acc.id !== accountWithMetrics.id &&
                    acc.number !== accountWithMetrics.number
                ),
              }));

              setGroups([...updatedGroups, newGroup]);
            }
          } else {
            // Removing from group (groupId is null)
            setGroups(
              currentGroups.map((group) => ({
                ...group,
                accounts: group.accounts.filter(
                  (acc) =>
                    acc.id !== accountWithMetrics.id &&
                    acc.number !== accountWithMetrics.number
                ),
              }))
            );
          }
        }
      } catch (error) {
        console.error("Error updating account:", error);
        throw error;
      }
    },
    [supabaseUser?.id, accounts, setAccounts, groups, setGroups, trades]
  );

  // Add createGroup function
  const saveGroup = useCallback(
    async (name: string) => {
      if (!supabaseUser?.id) return;
      try {
        const newGroup = await saveGroupAction(name);
        setGroups([...groups, newGroup]);
        return newGroup;
      } catch (error) {
        console.error("Error creating group:", error);
        throw error;
      }
    },
    [supabaseUser?.id, accounts, groups, setGroups]
  );

  const renameGroup = useCallback(
    async (groupId: string, name: string) => {
      if (!supabaseUser?.id) return;
      try {
        setGroups(
          groups.map((group) =>
            group.id === groupId ? { ...group, name } : group
          )
        );
        await renameGroupAction(groupId, name);
      } catch (error) {
        console.error("Error renaming group:", error);
        throw error;
      }
    },
    [supabaseUser?.id, groups, setGroups]
  );

  // Add deleteGroup function
  const deleteGroup = useCallback(
    async (groupId: string) => {
      try {
        // Remove groupdId from accounts
        const updatedAccounts = accounts.map((account: Account) => {
          if (account.groupId === groupId) {
            return { ...account, groupId: null };
          }
          return account;
        });
        setAccounts(updatedAccounts);
        setGroups(groups.filter((group) => group.id !== groupId));
        await deleteGroupAction(groupId);
      } catch (error) {
        console.error("Error deleting group:", error);
        throw error;
      }
    },
    [accounts, setAccounts]
  );

  // Add moveAccountToGroup function
  const moveAccountToGroup = useCallback(
    async (accountId: string, targetGroupId: string | null) => {
      try {
        const { accounts: currentAccounts, groups: currentGroups } =
          useUserStore.getState();
        if (!currentAccounts || currentAccounts.length === 0) {
          console.error("No accounts available to move");
          return;
        }

        // Update accounts state using the freshest snapshot
        const updatedAccounts = currentAccounts.map((account: Account) => {
          if (account.id === accountId) {
            return { ...account, groupId: targetGroupId };
          }
          return account;
        });
        setAccounts(updatedAccounts);

        // Update groups state using the freshest snapshot
        const accountToMove = currentAccounts.find(
          (acc) => acc.id === accountId
        );
        if (accountToMove) {
          // We have to ensure that the target group is created
          if (targetGroupId) {
            const targetGroup = currentGroups.find(
              (group) => group.id === targetGroupId
            );
            if (!targetGroup) {
              const newGroup = await saveGroup(targetGroupId);
              if (newGroup) {
                setGroups(
                  currentGroups.map((group) =>
                    group.id === targetGroupId
                      ? {
                          ...group,
                          accounts: [...group.accounts, accountToMove],
                        }
                      : group
                  )
                );
              }
            } else {
              setGroups(
                currentGroups.map((group) => {
                  // If this is the target group, add the account only if it's not already there
                  if (group.id === targetGroupId) {
                    const accountExists = group.accounts.some(
                      (acc) => acc.id === accountId
                    );
                    return {
                      ...group,
                      accounts: accountExists
                        ? group.accounts
                        : [...group.accounts, accountToMove],
                    };
                  }
                  // For all other groups, remove the account if it exists
                  return {
                    ...group,
                    accounts: group.accounts.filter(
                      (acc) => acc.id !== accountId
                    ),
                  };
                })
              );
            }
          }
        }

        await moveAccountToGroupAction(accountId, targetGroupId);
      } catch (error) {
        console.error("Error moving account to group:", error);
        throw error;
      }
    },
    [setAccounts, setGroups]
  );

  const moveAccountsToGroup = useCallback(
    async (accountIds: string[], targetGroupId: string | null) => {
      try {
        const { accounts: currentAccounts, groups: currentGroups } =
          useUserStore.getState();
        if (
          !currentAccounts ||
          currentAccounts.length === 0 ||
          accountIds.length === 0
        )
          return;

        const idSet = new Set(accountIds);
        const accountsToMove = currentAccounts.filter((acc) =>
          idSet.has(acc.id)
        );

        // Update accounts state using the freshest snapshot
        const updatedAccounts = currentAccounts.map((account) =>
          idSet.has(account.id)
            ? { ...account, groupId: targetGroupId }
            : account
        );
        setAccounts(updatedAccounts);

        // Update groups state using the freshest snapshot
        setGroups(
          currentGroups.map((group) => {
            const remainingAccounts = group.accounts.filter(
              (acc) => !idSet.has(acc.id)
            );
            if (group.id === targetGroupId) {
              const missingToAdd = accountsToMove.filter(
                (acc) =>
                  !remainingAccounts.some((existing) => existing.id === acc.id)
              );
              return {
                ...group,
                accounts: [...remainingAccounts, ...missingToAdd],
              };
            }
            return { ...group, accounts: remainingAccounts };
          })
        );

        await Promise.all(
          accountIds.map((id) => moveAccountToGroupAction(id, targetGroupId))
        );
      } catch (error) {
        console.error("Error moving accounts to group:", error);
        throw error;
      }
    },
    [setAccounts, setGroups]
  );

  // Add savePayout function
  const savePayout = useCallback(
    async (payout: PrismaPayout) => {
      if (!supabaseUser?.id || isSharedView) return;

      try {
        // Add to database
        const newPayout = await savePayoutAction(payout);

        // Update the account with the new/updated payout
        const updatedAccounts = accounts.map((account: Account) => {
          if (account.number === payout.accountNumber) {
            const existingPayouts = account.payouts || [];
            const isUpdate =
              payout.id && existingPayouts.some((p) => p.id === payout.id);

            if (isUpdate) {
              // Update existing payout
              return {
                ...account,
                payouts: existingPayouts.map((p) =>
                  p.id === payout.id ? newPayout : p
                ),
              };
            } else {
              // Add new payout
              return {
                ...account,
                payouts: [...existingPayouts, newPayout],
              };
            }
          }
          return account;
        });

        // Recalculate metrics for the affected account (optimistic, client-side)
        const affectedAccount = updatedAccounts.find(
          (acc) => acc.number === payout.accountNumber
        );
        if (affectedAccount) {
          const accountsWithMetrics = computeMetricsForAccounts(
            [affectedAccount],
            trades
          );
          const accountWithMetrics = accountsWithMetrics[0];

          // Update accounts with recalculated metrics
          setAccounts(
            updatedAccounts.map((acc) =>
              acc.number === payout.accountNumber ? accountWithMetrics : acc
            )
          );
        } else {
          setAccounts(updatedAccounts);
        }
      } catch (error) {
        console.error("Error saving payout:", error);
        throw error;
      }
    },
    [supabaseUser?.id, isSharedView, accounts, setAccounts, trades]
  );

  // Add deleteAccount function
  const deleteAccount = useCallback(
    async (account: Account) => {
      if (!supabaseUser?.id || isSharedView) return;

      try {
        // Update local state
        setAccounts(accounts.filter((acc) => acc.id !== account.id));
        // Delete from database
        await deleteAccountAction(account);
      } catch (error) {
        console.error("Error deleting account:", error);
        throw error;
      }
    },
    [supabaseUser?.id, isSharedView, accounts, setAccounts]
  );

  // Add deletePayout function
  const deletePayout = useCallback(
    async (payoutId: string) => {
      if (!supabaseUser?.id || isSharedView) return;

      try {
        // Find the account that has this payout
        const affectedAccount = accounts.find((account) =>
          account.payouts?.some((p) => p.id === payoutId)
        );

        // Update accounts with removed payout
        const updatedAccounts = accounts.map((account: Account) => ({
          ...account,
          payouts: account.payouts?.filter((p) => p.id !== payoutId) || [],
        }));

        // Delete from database
        await deletePayoutAction(payoutId);

        // Recalculate metrics for the affected account (optimistic, client-side)
        if (affectedAccount) {
          const accountToRecalculate = updatedAccounts.find(
            (acc) => acc.id === affectedAccount.id
          );
          if (accountToRecalculate) {
            const accountsWithMetrics = computeMetricsForAccounts(
              [accountToRecalculate],
              trades
            );
            const accountWithMetrics = accountsWithMetrics[0];

            // Update accounts with recalculated metrics
            setAccounts(
              updatedAccounts.map((acc) =>
                acc.id === affectedAccount.id ? accountWithMetrics : acc
              )
            );
          } else {
            setAccounts(updatedAccounts);
          }
        } else {
          setAccounts(updatedAccounts);
        }
      } catch (error) {
        console.error("Error deleting payout:", error);
        throw error;
      }
    },
    [supabaseUser?.id, isSharedView, accounts, setAccounts, trades]
  );

  const changeIsFirstConnection = useCallback(
    async (isFirstConnection: boolean) => {
      if (!supabaseUser?.id) return;
      // Update the user in the database
      setIsFirstConnection(isFirstConnection);
      await updateIsFirstConnectionAction(isFirstConnection);
    },
    [supabaseUser?.id, setIsFirstConnection]
  );

  const updateTrades = useCallback(
    async (tradeIds: string[], update: Partial<PrismaTrade>) => {
      if (!supabaseUser?.id) return;
      const updatedTrades = trades.map((trade) =>
        tradeIds.includes(trade.id)
          ? {
              ...trade,
              ...update,
            }
          : trade
      );
      setTrades(updatedTrades);
      await updateTradesAction(tradeIds, update);
    },
    [supabaseUser?.id, trades, setTrades]
  );

  const groupTrades = useCallback(
    async (tradeIds: string[]) => {
      if (!supabaseUser?.id) return;
      setTrades(
        trades.map((trade) => ({
          ...trade,
          groupId: tradeIds[0],
        }))
      );
      await groupTradesAction(tradeIds);
    },
    [supabaseUser?.id, trades, setTrades]
  );

  const ungroupTrades = useCallback(
    async (tradeIds: string[]) => {
      if (!supabaseUser?.id) return;
      setTrades(
        trades.map((trade) => ({
          ...trade,
          groupId: null,
        }))
      );
      await ungroupTradesAction(tradeIds);
    },
    [supabaseUser?.id, trades, setTrades]
  );

  const deleteTrades = useCallback(
    async (tradeIds: string[]) => {
      if (!supabaseUser?.id) return;
      
      // Optimistically remove trades from local state immediately
      // Use startTransition to mark the expensive recalculation as non-urgent
      // This keeps the UI responsive while formattedTrades recalculates
      const remainingTrades = trades.filter(
        (trade) => !tradeIds.includes(trade.id)
      );
      
      // Update state in a transition so it doesn't block the UI
        setTrades(remainingTrades);
      
      try {
        // Delete from database
        await deleteTradesByIdsAction(tradeIds);
      } catch (error) {
        // On error, refresh to restore the correct state
        console.error("Error deleting trades:", error);
        await refreshAllData();
        throw error;
      }
    },
    [supabaseUser?.id, trades, setTrades, refreshAllData]
  );

  const saveDashboardLayout = useCallback(
    async (layout: PrismaDashboardLayout) => {
      if (!supabaseUser?.id) return;

      try {
        setDashboardLayout(layout as unknown as DashboardLayoutWithWidgets);
        await saveDashboardLayoutAction(layout);
      } catch (error) {
        console.error("Error saving dashboard layout:", error);
        throw error;
      }
    },
    [supabaseUser?.id, setDashboardLayout]
  );

  const contextValue: DataContextType = {
    isPlusUser,
    isLoading,
    isMobile,
    isSharedView,
    sharedParams,
    setSharedParams,
    refreshTrades: refreshAllData,
    refreshTradesOnly,
    refreshUserDataOnly,
    refreshAllData,
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
    deleteTrades,
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
    moveAccountsToGroup,

    // Payout functions
    deletePayout,
    savePayout,

    // Dashboard layout
    saveDashboardLayout,
  };

  return (
    <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

// Add getTimeRangeKey function at the top level
function getTimeRangeKey(timeInPosition: number): string {
  const minutes = timeInPosition / 60; // Convert seconds to minutes
  if (minutes < 1) return "under1min";
  if (minutes >= 1 && minutes < 5) return "1to5min";
  if (minutes >= 5 && minutes < 10) return "5to10min";
  if (minutes >= 10 && minutes < 15) return "10to15min";
  if (minutes >= 15 && minutes < 30) return "15to30min";
  if (minutes >= 30 && minutes < 60) return "30to60min";
  if (minutes >= 60 && minutes < 120) return "1to2hours";
  if (minutes >= 120 && minutes < 300) return "2to5hours";
  return "over5hours";
}
