import { parseISO, getHours } from "date-fns";

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  avgRR: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  totalPnl: number;
  totalCommissions: number;
  netPnl: number;
}

export interface FormattedTrade {
  id: string;
  accountNumber: string;
  instrument: string;
  entryDate: string;
  closeDate?: string;
  pnl: number;
  commission?: number;
  side?: string;
  quantity?: number;
  mae?: number;
  mfe?: number;
  [key: string]: unknown;
}

export function computePerformanceMetrics(trades: FormattedTrade[]): PerformanceMetrics {
  if (!trades.length) {
    return {
      totalTrades: 0, winRate: 0, avgWin: 0, avgLoss: 0,
      profitFactor: 0, expectancy: 0, avgRR: 0,
      maxDrawdown: 0, maxDrawdownPct: 0, sharpeRatio: 0,
      totalPnl: 0, totalCommissions: 0, netPnl: 0,
    };
  }

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalCommissions = trades.reduce((s, t) => s + (t.commission ?? 0), 0);
  const netPnl = totalPnl - totalCommissions;

  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;

  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  const expectancy = avgWin * (winRate / 100) - avgLoss * (1 - winRate / 100);

  const rrValues = trades.filter(t => t.mae && t.mae !== 0 && t.mfe).map(t => (t.mfe ?? 0) / Math.abs(t.mae ?? 1));
  const avgRR = rrValues.length ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 0;

  // Drawdown
  let peak = 0;
  let equity = 0;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  const sorted = [...trades].sort((a, b) => parseISO(a.entryDate).getTime() - parseISO(b.entryDate).getTime());
  for (const t of sorted) {
    equity += t.pnl - (t.commission ?? 0);
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }

  // Sharpe (daily returns)
  const dailyMap = new Map<string, number>();
  for (const t of sorted) {
    const day = t.entryDate.slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + t.pnl - (t.commission ?? 0));
  }
  const dailyReturns = Array.from(dailyMap.values());
  const mean = dailyReturns.reduce((s, v) => s + v, 0) / (dailyReturns.length || 1);
  const variance = dailyReturns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (dailyReturns.length || 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;

  return {
    totalTrades: trades.length, winRate, avgWin, avgLoss,
    profitFactor, expectancy, avgRR,
    maxDrawdown, maxDrawdownPct, sharpeRatio,
    totalPnl, totalCommissions, netPnl,
  };
}

export function getWinRateByHour(trades: FormattedTrade[]) {
  const map = new Map<number, { wins: number; total: number; pnl: number }>();
  for (const t of trades) {
    const h = getHours(parseISO(t.entryDate));
    const prev = map.get(h) ?? { wins: 0, total: 0, pnl: 0 };
    map.set(h, {
      wins: prev.wins + (t.pnl > 0 ? 1 : 0),
      total: prev.total + 1,
      pnl: prev.pnl + t.pnl,
    });
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, { wins, total, pnl }]) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      winRate: total > 0 ? (wins / total) * 100 : 0,
      total,
      pnl,
    }));
}

export function getWinRateByWeekday(trades: FormattedTrade[]) {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const map = new Map<number, { wins: number; total: number; pnl: number }>();
  for (const t of trades) {
    const d = parseISO(t.entryDate).getUTCDay();
    const prev = map.get(d) ?? { wins: 0, total: 0, pnl: 0 };
    map.set(d, {
      wins: prev.wins + (t.pnl > 0 ? 1 : 0),
      total: prev.total + 1,
      pnl: prev.pnl + t.pnl,
    });
  }
  return [1, 2, 3, 4, 5].map(d => {
    const entry = map.get(d) ?? { wins: 0, total: 0, pnl: 0 };
    return {
      day: d,
      label: DAYS[d],
      winRate: entry.total > 0 ? (entry.wins / entry.total) * 100 : 0,
      total: entry.total,
      pnl: entry.pnl,
    };
  });
}

export function getWinRateByInstrument(trades: FormattedTrade[]) {
  const map = new Map<string, { wins: number; total: number; pnl: number }>();
  for (const t of trades) {
    const inst = t.instrument ?? "Unknown";
    const prev = map.get(inst) ?? { wins: 0, total: 0, pnl: 0 };
    map.set(inst, {
      wins: prev.wins + (t.pnl > 0 ? 1 : 0),
      total: prev.total + 1,
      pnl: prev.pnl + t.pnl,
    });
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([instrument, { wins, total, pnl }]) => ({
      instrument,
      winRate: total > 0 ? (wins / total) * 100 : 0,
      total,
      pnl,
    }));
}

export function getDrawdownCurve(trades: FormattedTrade[]) {
  const sorted = [...trades].sort((a, b) => parseISO(a.entryDate).getTime() - parseISO(b.entryDate).getTime());
  let peak = 0;
  let equity = 0;
  return sorted.map(t => {
    equity += t.pnl - (t.commission ?? 0);
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    return { date: t.entryDate.slice(0, 10), equity, drawdown: -dd };
  });
}

export function getPeriodStats(trades: FormattedTrade[], period: "week" | "month") {
  const map = new Map<string, { pnl: number; trades: number; wins: number }>();
  for (const t of trades) {
    const date = parseISO(t.entryDate);
    let key: string;
    if (period === "week") {
      const d = new Date(date);
      d.setUTCDate(d.getUTCDate() - d.getUTCDay() + 1);
      key = d.toISOString().slice(0, 10);
    } else {
      key = t.entryDate.slice(0, 7);
    }
    const prev = map.get(key) ?? { pnl: 0, trades: 0, wins: 0 };
    map.set(key, {
      pnl: prev.pnl + t.pnl - (t.commission ?? 0),
      trades: prev.trades + 1,
      wins: prev.wins + (t.pnl > 0 ? 1 : 0),
    });
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, { pnl, trades, wins }]) => ({
      label,
      pnl,
      trades,
      winRate: trades > 0 ? (wins / trades) * 100 : 0,
    }));
}
