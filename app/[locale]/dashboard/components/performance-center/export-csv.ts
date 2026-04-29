import type { FormattedTrade, PerformanceMetrics } from "./compute-metrics";
import { parseISO, format } from "date-fns";

function escapeCsv(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowToCsv(row: unknown[]): string {
  return row.map(escapeCsv).join(",");
}

export function exportPerformanceCsv(
  trades: FormattedTrade[],
  metrics: PerformanceMetrics
): void {
  const lines: string[] = [];

  // --- Summary section ---
  lines.push("# Performance Summary");
  lines.push(rowToCsv(["Metric", "Value"]));
  lines.push(rowToCsv(["Total Trades", metrics.totalTrades]));
  lines.push(rowToCsv(["Win Rate (%)", metrics.winRate.toFixed(2)]));
  lines.push(rowToCsv(["Net P&L ($)", metrics.netPnl.toFixed(2)]));
  lines.push(rowToCsv(["Gross P&L ($)", metrics.totalPnl.toFixed(2)]));
  lines.push(rowToCsv(["Total Commissions ($)", metrics.totalCommissions.toFixed(2)]));
  lines.push(rowToCsv(["Avg Win ($)", metrics.avgWin.toFixed(2)]));
  lines.push(rowToCsv(["Avg Loss ($)", metrics.avgLoss.toFixed(2)]));
  lines.push(rowToCsv(["Profit Factor", isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : "Inf"]));
  lines.push(rowToCsv(["Expectancy ($)", metrics.expectancy.toFixed(2)]));
  lines.push(rowToCsv(["Avg R:R", metrics.avgRR.toFixed(2)]));
  lines.push(rowToCsv(["Max Drawdown ($)", metrics.maxDrawdown.toFixed(2)]));
  lines.push(rowToCsv(["Max Drawdown (%)", metrics.maxDrawdownPct.toFixed(2)]));
  lines.push(rowToCsv(["Sharpe Ratio (ann.)", metrics.sharpeRatio.toFixed(2)]));
  lines.push("");

  // --- Trades section ---
  lines.push("# Trades");
  lines.push(rowToCsv([
    "Date", "Instrument", "Account", "Side", "Quantity",
    "P&L ($)", "Commission ($)", "Net P&L ($)", "MAE ($)", "MFE ($)",
  ]));

  const sorted = [...trades].sort(
    (a, b) => parseISO(a.entryDate).getTime() - parseISO(b.entryDate).getTime()
  );

  for (const t of sorted) {
    lines.push(rowToCsv([
      format(parseISO(t.entryDate), "yyyy-MM-dd HH:mm"),
      t.instrument,
      t.accountNumber,
      t.side ?? "",
      t.quantity ?? "",
      t.pnl.toFixed(2),
      (t.commission ?? 0).toFixed(2),
      (t.pnl - (t.commission ?? 0)).toFixed(2),
      t.mae != null ? Math.abs(t.mae).toFixed(2) : "",
      t.mfe != null ? (t.mfe as number).toFixed(2) : "",
    ]));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `performance-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
