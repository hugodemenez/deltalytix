import { formatInTimeZone } from "date-fns-tz";
import {
  parseISO,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  isValid,
} from "date-fns";
import { getTimeRangeKey } from "./time-range";

// Minimal input types so the lib does not depend on Prisma
export interface EquityChartTradeInput {
  entryDate: Date | string;
  accountNumber: string;
  instrument: string;
  pnl: number;
  commission?: number | null;
  timeInPosition: number;
  tags: string[];
}

export interface EquityChartPayoutInput {
  date: Date | string;
  amount: number;
  status: string;
}

export interface EquityChartAccountInput {
  number: string;
  groupId: string | null;
  startingBalance?: number | null;
  resetDate: Date | string | null;
  payouts?: EquityChartPayoutInput[];
}

export interface EquityChartGroupInput {
  id: string;
  name: string;
  accounts: { number: string }[];
}

export interface ChartDataPoint {
  date: string;
  [key: `equity_${string}`]: number | undefined;
  equity?: number;
  dailyPnL?: number | undefined;
  dailyCommissions?: number | undefined;
  netPnL?: number | undefined;
  [key: `payout_${string}`]: boolean;
  [key: `reset_${string}`]: boolean;
  [key: `payoutStatus_${string}`]: string;
  [key: `payoutAmount_${string}`]: number;
}

interface ChartEvent {
  date: Date;
  amount: number;
  isPayout: boolean;
  isReset?: boolean;
  payoutStatus?: string;
  accountNumber: string;
}

export interface EquityChartParams {
  instruments: string[];
  accountNumbers: string[];
  dateRange?: { from: string; to: string };
  pnlRange: { min?: number; max?: number };
  tickRange: { min?: number; max?: number };
  timeRange: { range: string | null };
  tickFilter: { value: string | null };
  weekdayFilter: { days: number[] };
  hourFilter: { hour: number | null };
  tagFilter: { tags: string[] };
  timezone: string;
  showIndividual: boolean;
  maxAccounts: number;
  dataSampling: "all" | "sample";
  selectedAccounts: string[];
}

export interface EquityChartResult {
  chartData: ChartDataPoint[];
  accountNumbers: string[];
  dateRange: { startDate: string; endDate: string };
}

export function computeEquityChartData(
  trades: EquityChartTradeInput[],
  accounts: EquityChartAccountInput[],
  groups: EquityChartGroupInput[],
  params: EquityChartParams
): EquityChartResult {
  const hiddenGroup = groups.find((g) => g.name === "Hidden Accounts");
  const hiddenAccountNumbers = accounts
    .filter((a) => a.groupId === hiddenGroup?.id)
    .map((a) => a.number);

  const filteredTrades = trades
    .filter((trade) => {
      if (hiddenAccountNumbers.includes(trade.accountNumber)) {
        return false;
      }

      if (
        params.accountNumbers.length > 0 &&
        !params.accountNumbers.includes(trade.accountNumber)
      ) {
        return false;
      }

      if (!params.showIndividual) {
        return true;
      }

      const entryDate = new Date(
        formatInTimeZone(
          new Date(trade.entryDate),
          params.timezone,
          "yyyy-MM-dd HH:mm:ssXXX"
        )
      );
      if (!isValid(entryDate)) return false;

      if (
        params.instruments.length > 0 &&
        !params.instruments.includes(trade.instrument)
      ) {
        return false;
      }

      if (
        params.accountNumbers.length > 0 &&
        !params.accountNumbers.includes(trade.accountNumber)
      ) {
        return false;
      }

      if (params.dateRange?.from || params.dateRange?.to) {
        const tradeDate = startOfDay(entryDate);

        if (params.dateRange?.from) {
          const fromDate = startOfDay(new Date(params.dateRange.from));
          if (entryDate < fromDate) {
            return false;
          }
        }

        if (params.dateRange?.to) {
          const toDate = endOfDay(new Date(params.dateRange.to));
          if (entryDate > toDate) {
            return false;
          }
        }

        if (params.dateRange?.from && params.dateRange?.to) {
          const fromDate = startOfDay(new Date(params.dateRange.from));
          const toDate = startOfDay(new Date(params.dateRange.to));
          if (fromDate.getTime() === toDate.getTime()) {
            if (tradeDate.getTime() !== fromDate.getTime()) {
              return false;
            }
          }
        }
      }

      if (
        (params.pnlRange.min !== undefined &&
          trade.pnl < params.pnlRange.min) ||
        (params.pnlRange.max !== undefined && trade.pnl > params.pnlRange.max)
      ) {
        return false;
      }

      if (
        params.timeRange.range &&
        getTimeRangeKey(trade.timeInPosition) !== params.timeRange.range
      ) {
        return false;
      }

      if (
        params.weekdayFilter?.days &&
        params.weekdayFilter.days.length > 0
      ) {
        const dayOfWeek = entryDate.getDay();
        if (!params.weekdayFilter.days.includes(dayOfWeek)) {
          return false;
        }
      }

      if (params.hourFilter?.hour !== null) {
        const hour = entryDate.getHours();
        if (hour !== params.hourFilter.hour) {
          return false;
        }
      }

      if (params.tagFilter.tags.length > 0) {
        if (
          !trade.tags.some((tag) => params.tagFilter.tags.includes(tag))
        ) {
          return false;
        }
      }

      return true;
    })
    .sort(
      (a, b) =>
        parseISO(String(a.entryDate)).getTime() -
        parseISO(String(b.entryDate)).getTime()
    );

  if (!filteredTrades.length) {
    return {
      chartData: [],
      accountNumbers: [],
      dateRange: { startDate: "", endDate: "" },
    };
  }

  const allAccountNumbers = Array.from(
    new Set(filteredTrades.map((trade) => trade.accountNumber))
  );

  const hasAccountSelection = params.selectedAccounts.length > 0;
  const chartAccountNumbers = hasAccountSelection
    ? allAccountNumbers.filter((acc) =>
        params.selectedAccounts.includes(acc)
      )
    : allAccountNumbers;

  const limitedAccountNumbers = params.showIndividual
    ? chartAccountNumbers.slice(0, params.maxAccounts)
    : chartAccountNumbers;

  const accountMap = new Map(accounts.map((acc) => [acc.number, acc]));

  const finalFilteredTrades = filteredTrades.filter((trade) => {
    const isWhitelistedAccount =
      limitedAccountNumbers.includes(trade.accountNumber);

    if (!isWhitelistedAccount) {
      return false;
    }

    const account = accountMap.get(trade.accountNumber);
    if (!account) return true;

    if (account.resetDate) {
      return new Date(trade.entryDate) >= new Date(account.resetDate);
    }

    return true;
  });

  if (!finalFilteredTrades.length) {
    return {
      chartData: [],
      accountNumbers: allAccountNumbers,
      dateRange: { startDate: "", endDate: "" },
    };
  }

  const dates = finalFilteredTrades.map((t) =>
    formatInTimeZone(new Date(t.entryDate), params.timezone, "yyyy-MM-dd")
  );
  const startDate = dates.reduce((min, date) => (date < min ? date : min));
  const endDate = dates.reduce((max, date) => (date > max ? date : max));

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  end.setDate(end.getDate() + 1);

  const allDates = eachDayOfInterval({ start, end });

  const datesToProcess =
    params.dataSampling === "sample" && allDates.length > 100
      ? allDates.filter((_, index) => index % 2 === 0)
      : allDates;

  const tradesMap = new Map<string, EquityChartTradeInput[]>();

  finalFilteredTrades.forEach((trade) => {
    const dateKey = formatInTimeZone(
      new Date(trade.entryDate),
      params.timezone,
      "yyyy-MM-dd"
    );
    if (!tradesMap.has(dateKey)) {
      tradesMap.set(dateKey, []);
    }
    tradesMap.get(dateKey)!.push(trade);
  });

  const allEvents: ChartEvent[] = [];

  finalFilteredTrades.forEach((trade) => {
    allEvents.push({
      date: new Date(trade.entryDate),
      amount: trade.pnl - (trade.commission || 0),
      isPayout: false,
      isReset: false,
      accountNumber: trade.accountNumber,
    });
  });

  limitedAccountNumbers.forEach((accountNumber) => {
    const account = accountMap.get(accountNumber);
    if (!account) return;

    account.payouts?.forEach((payout) => {
      allEvents.push({
        date: new Date(payout.date),
        amount: ["PENDING", "VALIDATED", "PAID"].includes(payout.status)
          ? -payout.amount
          : 0,
        isPayout: true,
        isReset: false,
        payoutStatus: payout.status,
        accountNumber: accountNumber,
      });
    });

    if (account.resetDate) {
      allEvents.push({
        date: new Date(account.resetDate),
        amount: 0,
        isPayout: false,
        isReset: true,
        accountNumber: accountNumber,
      });
    }
  });

  allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  const accountEquities: Record<string, number> = {};
  const accountFirstActivity: Record<string, string | null> = {};

  limitedAccountNumbers.forEach((acc) => {
    accountEquities[acc] = 0;
    accountFirstActivity[acc] = null;
  });

  const chartData: ChartDataPoint[] = [];

  datesToProcess.forEach((date) => {
    const dateKey = formatInTimeZone(date, params.timezone, "yyyy-MM-dd");

    let totalEquity = 0;
    const point: ChartDataPoint = {
      date: dateKey,
      equity: 0,
    };

    if (params.showIndividual) {
      limitedAccountNumbers.forEach((acc) => {
        point[`equity_${acc}`] = undefined;
        point[`payout_${acc}`] = false;
        point[`reset_${acc}`] = false;
        point[`payoutStatus_${acc}`] = "";
        point[`payoutAmount_${acc}`] = 0;
      });
    }

    const dateEvents = allEvents.filter(
      (event) =>
        formatInTimeZone(event.date, params.timezone, "yyyy-MM-dd") === dateKey
    );

    for (const accountNumber of limitedAccountNumbers) {
      if (
        hasAccountSelection &&
        !params.selectedAccounts.includes(accountNumber)
      ) {
        continue;
      }

      const accountEvents = dateEvents.filter(
        (event) => event.accountNumber === accountNumber
      );

      accountEvents.forEach((event) => {
        if (event.isReset) {
          accountEquities[accountNumber] = 0;
          point[`reset_${accountNumber}`] = true;
          if (!accountFirstActivity[accountNumber]) {
            accountFirstActivity[accountNumber] = dateKey;
          }
        } else {
          accountEquities[accountNumber] += event.amount;

          if (!accountFirstActivity[accountNumber]) {
            accountFirstActivity[accountNumber] = dateKey;
          }

          if (event.isPayout) {
            point[`payout_${accountNumber}`] = true;
            point[`payoutStatus_${accountNumber}`] = event.payoutStatus || "";
            point[`payoutAmount_${accountNumber}`] = -event.amount;
          }
        }
      });

      if (params.showIndividual) {
        if (
          accountFirstActivity[accountNumber] &&
          accountFirstActivity[accountNumber]! <= dateKey
        ) {
          point[`equity_${accountNumber}`] = accountEquities[accountNumber];
        } else {
          point[`equity_${accountNumber}`] = undefined;
        }
      }
      totalEquity += accountEquities[accountNumber];
    }

    if (!params.showIndividual) {
      point.equity = totalEquity;
    }

    chartData.push(point);
  });

  return {
    chartData,
    accountNumbers: allAccountNumbers,
    dateRange: { startDate, endDate },
  };
}
