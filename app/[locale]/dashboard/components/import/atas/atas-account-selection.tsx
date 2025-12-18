import React, { useMemo, useEffect, useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/locales/client";
import { Trade } from "@prisma/client";

interface AtasAccountSelectionProps {
  processedTrades: Partial<Trade>[];
  selectedAccountNumbers: string[];
  setSelectedAccountNumbers: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AtasAccountSelection({
  processedTrades,
  selectedAccountNumbers,
  setSelectedAccountNumbers,
}: AtasAccountSelectionProps) {
  const t = useI18n();
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const hasInitialized = useRef(false);

  // Get available accounts from processed trades
  useEffect(() => {
    if (processedTrades && processedTrades.length > 0) {
      setAvailableAccounts(
        Array.from(new Set(processedTrades.map((trade) => trade.accountNumber))) as string[]
      );
    }
  }, [processedTrades]);

  // Count trades per account
  const tradesPerAccount = useMemo(() => {
    return processedTrades.reduce(
      (counts, trade) => {
        if (!trade.accountNumber) return counts;
        counts[trade.accountNumber] = (counts[trade.accountNumber] || 0) + 1;
        return counts;
      },
      {} as { [key: string]: number }
    );
  }, [processedTrades]);

  // Select all accounts by default only on initial load
  useEffect(() => {
    if (availableAccounts.length > 0 && !hasInitialized.current && !selectedAccountNumbers.length) {
      setSelectedAccountNumbers(
        availableAccounts.filter((account) => account !== undefined) as string[]
      );
      hasInitialized.current = true;
    }
  }, [availableAccounts, selectedAccountNumbers, setSelectedAccountNumbers]);

  if (availableAccounts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-muted-foreground">No accounts found in the file</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-2">
        <Label className="text-lg font-semibold">
          {t("import.account.selectAccount")}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t("import.account.selectAccountDescription")}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto mt-4 py-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableAccounts.map((account) => {
            if (!account) return null;
            const tradeCount = tradesPerAccount[account] || 0;
            const isSelected = selectedAccountNumbers.includes(account);

            return (
              <Card
                key={account}
                className={cn(
                  "p-6 cursor-pointer hover:border-primary transition-colors relative group",
                  isSelected ? "border-primary bg-primary/5" : ""
                )}
                onClick={() => {
                  // If already selected, remove it
                  if (isSelected) {
                    setSelectedAccountNumbers(
                      selectedAccountNumbers.filter((a) => a !== account)
                    );
                  } else {
                    setSelectedAccountNumbers([
                      ...selectedAccountNumbers,
                      account,
                    ]);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="font-medium">{account}</p>
                    <p className="text-sm text-muted-foreground">
                      {tradeCount} {tradeCount === 1 ? "trade" : "trades"}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
