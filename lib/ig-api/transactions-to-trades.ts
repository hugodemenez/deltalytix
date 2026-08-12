import type { IgApiTransaction } from "@/lib/ig-api/types";
import {
  mapIgTransactionRecords,
  type IgImportedTrade,
  type IgSkippedRow,
  type IgTransactionRecord,
} from "@/lib/ig-transaction-import";

export function igApiTransactionToRecord(
  tx: IgApiTransaction,
): IgTransactionRecord {
  return {
    instrumentName: tx.instrumentName ?? "",
    reference: tx.reference ?? "",
    openLevel: tx.openLevel ?? "",
    closeLevel: tx.closeLevel ?? "",
    size: tx.size ?? "",
    profitAndLoss: tx.profitAndLoss,
    cashTransaction: tx.cashTransaction,
    dateUtc: tx.dateUtc ?? "",
    openDateUtc: tx.openDateUtc ?? "",
    currency: tx.currency,
  };
}

export function mapIgApiTransactions(
  transactions: IgApiTransaction[],
): { trades: IgImportedTrade[]; skippedRows: IgSkippedRow[] } {
  return mapIgTransactionRecords(transactions.map(igApiTransactionToRecord));
}
