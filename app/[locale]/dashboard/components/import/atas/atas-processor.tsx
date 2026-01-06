"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Trade } from "@/prisma/generated/prisma/browser";
import { useI18n } from "@/locales/client";
import { useTradesStore } from "@/store/trades-store";
import { useUserStore } from "@/store/user-store";
import { generateTradeHash } from "@/lib/utils";
import { PlatformProcessorProps } from "../config/platforms";
import { TradeTableReview } from "../../tables/trade-table-review";
import { createTradeWithDefaults } from "@/lib/trade-factory";

const formatPnl = (
  pnl: string | undefined
): { pnl: number; error?: string } => {
  if (!pnl || String(pnl).trim() === "") {
    console.warn("Invalid PNL value:", pnl);
    return { pnl: 0, error: "Invalid PNL value" };
  }

  let formattedPnl = String(pnl).trim();

  // Remove any currency symbols and commas
  formattedPnl = formattedPnl.replace(/[$,€£]/g, "");

  const numericValue = parseFloat(formattedPnl);

  if (isNaN(numericValue)) {
    console.warn("Unable to parse PNL value:", pnl);
    return { pnl: 0, error: "Unable to parse PNL value" };
  }

  return { pnl: numericValue };
};

const parseAtasDate = (dateValue: any, timezone: string): string | undefined => {
  if (!dateValue || String(dateValue).trim() === "") {
    return undefined;
  }

  try {
    // Excel parses dates and provides them as Date objects or Date object strings
    const dateStr = String(dateValue);

    // Check if it's already a Date object or a string representation of a Date object
    let dateObj: Date | null = null;
    if (dateValue instanceof Date) {
      dateObj = dateValue;
    } else if (typeof dateValue === "string" && (dateStr.includes("GMT") || dateStr.includes("UTC") || dateStr.match(/^\w{3} \w{3} \d{2} \d{4}/))) {
      // Try to parse as a Date object string
      dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) {
        dateObj = null;
      }
    }

    if (dateObj) {
      // Extract UTC components from the Date object
      // Excel parses dates and creates Date objects where the UTC components
      // represent what was in the Excel file. We need to treat those UTC components
      // as being in the user's timezone, then convert to UTC for storage.
      const utcYear = dateObj.getUTCFullYear();
      const utcMonth = dateObj.getUTCMonth() + 1;
      const utcDay = dateObj.getUTCDate();
      const utcHours = dateObj.getUTCHours();
      const utcMinutes = dateObj.getUTCMinutes();
      const utcSeconds = dateObj.getUTCSeconds();
      
      // Now treat these UTC components as being in the user's timezone and convert to UTC
      const dateString = `${utcYear}-${String(utcMonth).padStart(2, "0")}-${String(utcDay).padStart(2, "0")}T${String(utcHours).padStart(2, "0")}:${String(utcMinutes).padStart(2, "0")}:${String(utcSeconds).padStart(2, "0")}`;
      
      // Create a formatter for the target timezone
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      
      // Create a date assuming these components are UTC
      const tempUTC = new Date(dateString + "Z");
      
      // Format the UTC date in the target timezone to see what it displays as
      // Use formatToParts to get structured components instead of parsing a string
      const parts = formatter.formatToParts(tempUTC);
      const tzYear = parseInt(parts.find(p => p.type === "year")?.value || "0");
      const tzMonth = parseInt(parts.find(p => p.type === "month")?.value || "0");
      const tzDay = parseInt(parts.find(p => p.type === "day")?.value || "0");
      const tzHour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
      const tzMinute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
      const tzSecond = parseInt(parts.find(p => p.type === "second")?.value || "0");
      
      // Calculate the timezone offset: what we want (utcHours treated as local time) vs what UTC displays as
      // If we want 15:53:10 in Europe/Paris, and 15:53:10 UTC displays as 17:53:10 in Europe/Paris,
      // we need to subtract 2 hours from UTC to get 13:53:10 UTC, which displays as 15:53:10 in Europe/Paris
      // The offset is: desired local time - what UTC displays as = 15:53:10 - 17:53:10 = -2 hours
      // So we need to ADD this offset to UTC (subtract 2 hours from UTC time)
      const desiredSeconds = utcHours * 3600 + utcMinutes * 60 + utcSeconds;
      const actualSeconds = tzHour * 3600 + tzMinute * 60 + tzSecond;
      const secondsDiff = desiredSeconds - actualSeconds; // This is negative: -7200 seconds
      
      // Also account for day rollover
      let dayOffset = 0;
      if (tzYear !== utcYear || tzMonth !== utcMonth || tzDay !== utcDay) {
        const desiredDate = new Date(utcYear, utcMonth - 1, utcDay, utcHours, utcMinutes, utcSeconds);
        const actualDate = new Date(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
        dayOffset = Math.round((desiredDate.getTime() - actualDate.getTime()) / 1000);
      }
      
      const totalSecondsDiff = dayOffset + secondsDiff;
      
      // Adjust: ADD the offset (which is negative) to get the correct UTC time
      // Example: 15:53:10 UTC + (-7200) = 13:53:10 UTC, which displays as 15:53:10 in Europe/Paris
      const correctUTC = new Date(tempUTC.getTime() + (totalSecondsDiff * 1000));
      
      if (isNaN(correctUTC.getTime())) {
        console.error(`Invalid date created:`, correctUTC);
        return undefined;
      }
      
      return correctUTC.toISOString().replace("Z", "+00:00");
    }

    // Check if it's already in ISO format
    if (dateStr.includes("T") || dateStr.includes("-")) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().replace("Z", "+00:00");
      }
    }

    // If we reach here, the date format is not recognized
    console.error(`Unsupported date format: ${dateStr}`);
    return undefined;
  } catch (error) {
    console.error(`Error parsing ATAS date: ${dateValue}`, error);
    return undefined;
  }
};

// ATAS column mappings - only map fields that exist in the database schema
const atasMappings: { [key: string]: string } = {
  Account: "accountNumber",
  Instrument: "instrument",
  "Open time": "entryDate",
  "Open price": "entryPrice",
  "Open volume": "quantity",
  "Close time": "closeDate",
  "Close price": "closePrice",
  PnL: "pnl",
  Comment: "comment",
};

export default function AtasProcessor({
  csvData,
  headers,
  processedTrades,
  setProcessedTrades,
  accountNumbers,
  selectedAccountNumbers,
  setSelectedAccountNumbers,
}: PlatformProcessorProps) {
  const existingTrades = useTradesStore((state) => state.trades);
  const timezone = useUserStore((state) => state.timezone);
  const [allProcessedTrades, setAllProcessedTrades] = useState<Trade[]>([]);
  const [missingCommissions, setMissingCommissions] = useState<{
    [key: string]: number;
  }>({});
  const [showCommissionPrompt, setShowCommissionPrompt] = useState(false);
  const t = useI18n();

  // Internal state for account selection if not provided via props
  const [internalSelectedAccounts, setInternalSelectedAccounts] = useState<
    string[]
  >([]);

  // Use provided selectedAccountNumbers or fall back to internal state
  const currentSelectedAccounts =
    selectedAccountNumbers || internalSelectedAccounts;
  const setCurrentSelectedAccounts =
    setSelectedAccountNumbers || setInternalSelectedAccounts;

  // Get available accounts from all trades
  const availableAccounts = useMemo(() => {
    return Array.from(
      new Set(
        allProcessedTrades.map((trade) => trade.accountNumber).filter(Boolean)
      )
    ) as string[];
  }, [allProcessedTrades]);

  // Count trades per account
  const tradesPerAccount = useMemo(() => {
    return allProcessedTrades.reduce(
      (counts, trade) => {
        if (!trade.accountNumber) return counts;
        counts[trade.accountNumber] = (counts[trade.accountNumber] || 0) + 1;
        return counts;
      },
      {} as { [key: string]: number }
    );
  }, [allProcessedTrades]);

  // Filter trades based on selected accounts
  const filteredTrades = useMemo(() => {
    if (currentSelectedAccounts.length === 0) {
      return [];
    }
    return allProcessedTrades.filter(
      (trade) =>
        trade.accountNumber &&
        currentSelectedAccounts.includes(trade.accountNumber)
    );
  }, [allProcessedTrades, currentSelectedAccounts]);

  const existingCommissions = useMemo(() => {
    const commissions: { [key: string]: number } = {};
    // Use all existing trades to build commission lookup by accountNumber:instrument
    existingTrades.forEach((trade) => {
      if (trade.accountNumber && trade.instrument && trade.commission && trade.quantity) {
        const key = `${trade.accountNumber}:${trade.instrument}`;
        commissions[key] = trade.commission / trade.quantity;
      }
    });
    return commissions;
  }, [existingTrades]);

  // Get all unique account+instrument combinations from processed trades
  const allAccountInstrumentPairs = useMemo(() => {
    const pairs = new Set<string>();
    allProcessedTrades.forEach((trade) => {
      if (trade.accountNumber && trade.instrument) {
        pairs.add(`${trade.accountNumber}:${trade.instrument}`);
      }
    });
    return Array.from(pairs);
  }, [allProcessedTrades]);

  // Filter account+instrument pairs to only include selected accounts
  const selectedAccountInstrumentPairs = useMemo(() => {
    if (currentSelectedAccounts.length === 0) {
      return [];
    }
    return allAccountInstrumentPairs.filter((pair) => {
      const [accountNumber] = pair.split(":");
      return currentSelectedAccounts.includes(accountNumber);
    });
  }, [allAccountInstrumentPairs, currentSelectedAccounts]);

  // Get all unique instruments from processed trades (for backward compatibility)
  const allInstruments = useMemo(() => {
    return Array.from(
      new Set(
        allProcessedTrades
          .map((trade) => trade.instrument)
          .filter(Boolean)
      )
    ) as string[];
  }, [allProcessedTrades]);

  const processTrades = useCallback(() => {
    const newTrades: Trade[] = [];
    const missingCommissionsTemp: { [key: string]: boolean } = {};

    csvData.forEach((row) => {
      const item: Partial<Trade> = {};
      let quantity = 0;

      headers.forEach((header, index) => {
        if (atasMappings[header]) {
          const key = atasMappings[header] as keyof Trade;
          const cellValue = row[index];

          switch (key) {
            case "quantity":
              quantity = Math.abs(parseFloat(String(cellValue)) || 0);
              item[key] = quantity;
              break;
            case "pnl":
              const { pnl, error } = formatPnl(cellValue);
              if (error) {
                return;
              }
              item[key] = pnl;
              break;
            case "entryDate":
            case "closeDate":
              item[key] = parseAtasDate(cellValue, timezone);
              break;
            case "entryPrice":
            case "closePrice":
              if (cellValue) {
                // Convert to string and remove commas
                const priceString = String(cellValue).replace(/,/g, "");
                item[key] = priceString;
              } else {
                item[key] = "0";
              }
              break;
            case "accountNumber":
              item[key] = cellValue;
              break;
            default:
              // Convert to string for text fields, or keep as is for other types
              if (
                typeof cellValue === "string" ||
                typeof cellValue === "number"
              ) {
                (item as any)[key] = String(cellValue);
              } else {
                (item as any)[key] = cellValue;
              }
          }
        }
      });

      if (!item.entryDate || !item.closeDate) {
        console.warn("Missing required dates");
        return;
      }

      if (!item.instrument || String(item.instrument).trim() === "") {
        return;
      }

      // Ensure instrument is a string
      item.instrument = String(item.instrument).trim();

      // Validate that open and close quantities match (for complete trades)
      const closeQuantityIndex = headers.findIndex((h) => h === "Close volume");
      const closeQuantity =
        closeQuantityIndex >= 0
          ? Math.abs(parseFloat(String(row[closeQuantityIndex])) || 0)
          : 0;

      if (quantity !== closeQuantity) {
        console.warn(
          `Quantity mismatch for ${item.instrument}: open=${quantity}, close=${closeQuantity}`
        );
        // Still process the trade but use the open quantity
      }

      // Determine trade side based on quantity sign in the original data
      const originalOpenVolume = parseFloat(
        String(row[headers.findIndex((h) => h === "Open volume")] || "0")
      );
      const originalCloseVolume = parseFloat(
        String(row[headers.findIndex((h) => h === "Close volume")] || "0")
      );

      if (originalOpenVolume > 0 && originalCloseVolume < 0) {
        item.side = "long";
      } else if (originalOpenVolume < 0 && originalCloseVolume > 0) {
        item.side = "short";
      } else {
        // Default to long if we can't determine
        item.side = "long";
      }

      // Calculate time in position
      if (item.entryDate && item.closeDate) {
        const entryTime = new Date(item.entryDate).getTime();
        const closeTime = new Date(item.closeDate).getTime();
        const timeInPosition = Math.round((closeTime - entryTime) / 1000); // Convert to seconds
        item.timeInPosition = timeInPosition;
      }

      // Handle commissions
      if (item.instrument && item.accountNumber) {
        // Remove the last 6 characters if they exist (e.g., U5@CME)
        // This removes the month code (U5) and exchange suffix (@CME)
        if (item.instrument.length > 6) {
          item.instrument = item.instrument.slice(0, -6);
        }
        // Only apply existing commissions during processing
        // User-set commissions will be applied via separate effect
        const commissionKey = `${item.accountNumber}:${item.instrument}`;
        if (existingCommissions[commissionKey]) {
          item.commission =
            existingCommissions[commissionKey] * item.quantity!;
        } else {
          // Track missing commissions by account+instrument combination
          missingCommissionsTemp[commissionKey] = true;
        }
      }

      // Generate unique IDs for entry and close
      item.entryId = `entry-${generateTradeHash(item)}`;
      item.closeId = `close-${generateTradeHash(item)}`;

      // Generate trade hash for deduplication
      item.id = generateTradeHash(item);

      // Check if trade already exists
      const existingTrade = existingTrades.find(
        (trade) =>
          trade.accountNumber === item.accountNumber &&
          trade.instrument === item.instrument &&
          trade.entryDate === item.entryDate &&
          trade.closeDate === item.closeDate &&
          trade.quantity === item.quantity
      );

      if (!existingTrade) {
        newTrades.push(item as Trade);
      }
    });

    setAllProcessedTrades(newTrades);
    setProcessedTrades(newTrades);

    const missingCommissionKeys = Object.keys(missingCommissionsTemp);
    if (missingCommissionKeys.length > 0) {
      setMissingCommissions((prev) => {
        // Preserve existing commission values, only add new account+instrument pairs with 0
        const updated = { ...prev };
        missingCommissionKeys.forEach((key) => {
          if (updated[key] === undefined) {
            updated[key] = 0;
          }
        });
        return updated;
      });
      setShowCommissionPrompt(true);
    }
  }, [
    csvData,
    headers,
    accountNumbers,
    existingTrades,
    existingCommissions,
    setProcessedTrades,
    t,
  ]);

  const handleCommissionChange = (instrument: string, value: string) => {
    setMissingCommissions((prev) => ({
      ...prev,
      [instrument]: parseFloat(value) || 0,
    }));
  };

  const applyCommissions = useCallback(() => {
    const updatedTrades = allProcessedTrades.map((trade) => {
      if (trade.instrument && trade.accountNumber) {
        const commissionKey = `${trade.accountNumber}:${trade.instrument}`;
        // Use same priority: user-set > existing > 0
        const commissionPerContract =
          missingCommissions[commissionKey] !== undefined
            ? missingCommissions[commissionKey]
            : existingCommissions[commissionKey] || 0;
        
        return {
          ...trade,
          commission: commissionPerContract * trade.quantity,
        };
      }
      return trade;
    });

    setAllProcessedTrades(updatedTrades);
    setProcessedTrades(updatedTrades);
    toast.success(t("import.commission.success.title"), {
      description: t("import.commission.success.description"),
    });
  }, [allProcessedTrades, missingCommissions, existingCommissions, setProcessedTrades, t]);

  useEffect(() => {
    if (csvData.length > 0) {
      processTrades();
    }
  }, [csvData, processTrades]);

  // Apply user-set commissions when missingCommissions changes
  useEffect(() => {
    setAllProcessedTrades((prevTrades) => {
      if (prevTrades.length === 0) {
        return prevTrades;
      }

      // Only update trades that have account+instrument combinations with user-set commissions
      const updatedTrades = prevTrades.map((trade) => {
        if (trade.instrument && trade.accountNumber) {
          const commissionKey = `${trade.accountNumber}:${trade.instrument}`;
          if (missingCommissions[commissionKey] !== undefined) {
            const commissionPerContract = missingCommissions[commissionKey];
            const expectedCommission = commissionPerContract * trade.quantity;
            // Only update if the commission is different
            if (trade.commission !== expectedCommission) {
              return {
                ...trade,
                commission: expectedCommission,
              };
            }
          }
        }
        return trade;
      });

      // Check if any trades were actually updated
      const hasChanges = updatedTrades.some((trade, index) => {
        return trade.commission !== prevTrades[index]?.commission;
      });

      if (hasChanges) {
        setProcessedTrades(updatedTrades);
        return updatedTrades;
      }

      return prevTrades;
    });
  }, [missingCommissions, setProcessedTrades]);

  // Merge commissions from allProcessedTrades when processedTrades prop changes
  useEffect(() => {
    if (processedTrades && processedTrades.length > 0) {
      // Create a map of commissions from allProcessedTrades by trade ID
      const commissionMap = new Map<string, number>();
      allProcessedTrades.forEach((trade) => {
        if (trade.id && trade.commission) {
          commissionMap.set(trade.id, trade.commission);
        }
      });

      // Merge commissions into processedTrades if they exist in allProcessedTrades
      const mergedTrades = processedTrades.map((trade) => {
        if (trade.id && commissionMap.has(trade.id)) {
          return {
            ...trade,
            commission: commissionMap.get(trade.id)!,
          };
        }
        return trade;
      });

      // Only update if there were actual changes
      const hasChanges = mergedTrades.some((trade, index) => {
        const original = processedTrades[index];
        return trade.commission !== original.commission;
      });

      if (hasChanges) {
        setAllProcessedTrades(mergedTrades as Trade[]);
      } else if (allProcessedTrades.length === 0) {
        // If allProcessedTrades is empty but processedTrades has data, initialize it
        setAllProcessedTrades(processedTrades as Trade[]);
      }
    }
  }, [processedTrades]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-6">
          {/* Account Selection Section */}
          {availableAccounts.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-lg font-semibold">
                      {t("import.account.pickAccounts")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("import.account.pickAccountsDescription")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allSelected =
                        availableAccounts.length === currentSelectedAccounts.length &&
                        availableAccounts.every((account) =>
                          currentSelectedAccounts.includes(account)
                        );
                      if (allSelected) {
                        setCurrentSelectedAccounts([]);
                      } else {
                        setCurrentSelectedAccounts([...availableAccounts]);
                      }
                    }}
                  >
                    {availableAccounts.length === currentSelectedAccounts.length &&
                    availableAccounts.every((account) =>
                      currentSelectedAccounts.includes(account)
                    )
                      ? t("shared.deselectAll")
                      : t("shared.selectAll")}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableAccounts.map((account) => {
                  if (!account) return null;
                  const tradeCount = tradesPerAccount[account] || 0;
                  const isSelected = currentSelectedAccounts.includes(account);

                  return (
                    <Card
                      key={account}
                      className={cn(
                        "p-6 cursor-pointer hover:border-primary transition-colors relative group",
                        isSelected ? "border-primary bg-primary/5" : ""
                      )}
                      onClick={() => {
                        if (isSelected) {
                          setCurrentSelectedAccounts(
                            currentSelectedAccounts.filter((a) => a !== account)
                          );
                        } else {
                          setCurrentSelectedAccounts([
                            ...currentSelectedAccounts,
                            account,
                          ]);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <p className="font-medium">{account}</p>
                          <p className="text-sm text-muted-foreground">
                            {tradeCount}{" "}
                            {tradeCount === 1
                              ? t("import.account.trade")
                              : t("import.account.trades")}
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
          )}

          {/* Commissions Section - Only show for selected accounts */}
          {selectedAccountInstrumentPairs.length > 0 && (
            <div
              className="flex-none bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 text-blue-900 dark:text-blue-100 p-4 rounded-r"
              role="alert"
            >
              <p className="font-bold">{t("import.commission.title")}</p>
              <p>{t("import.commission.description")}</p>
              <p className="mt-2 text-sm">{t("import.commission.help")}</p>
              <p className="text-sm italic">{t("import.commission.example")}</p>
              <div className="mt-4 space-y-2">
                {selectedAccountInstrumentPairs.map((pair) => {
                  const [accountNumber, instrument] = pair.split(":");
                  // Get current commission value: user-set > existing > 0
                  const currentCommission =
                    missingCommissions[pair] !== undefined
                      ? missingCommissions[pair]
                      : existingCommissions[pair] || 0;
                  
                  return (
                    <div
                      key={pair}
                      className="flex items-center space-x-2"
                    >
                      <label
                        htmlFor={`commission-${pair}`}
                        className="min-w-[200px]"
                      >
                        {accountNumber} - {instrument} - {t("import.commission.perContract")}
                      </label>
                      <Input
                        id={`commission-${pair}`}
                        type="number"
                        step="0.01"
                        value={currentCommission}
                        onChange={(e) =>
                          handleCommissionChange(pair, e.target.value)
                        }
                        className="w-24"
                      />
                    </div>
                  );
                })}
              </div>
              <Button onClick={applyCommissions} className="mt-4">
                {t("import.commission.apply")}
              </Button>
            </div>
          )}

          {allProcessedTrades.length === 0 && (
            <div
              className="flex-none bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r"
              role="alert"
            >
              <p className="font-bold">{t("import.error.duplicateTrades")}</p>
              <p>{t("import.error.duplicateTradesDescription")}</p>
            </div>
          )}

          {currentSelectedAccounts.length === 0 &&
            allProcessedTrades.length > 0 && (
              <div
                className="flex-none bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-r"
                role="alert"
              >
                <p className="font-bold">{t("import.account.selectAccount")}</p>
                <p>{t("import.account.selectAccountToView")}</p>
              </div>
            )}

          {filteredTrades.length > 0 && (
            <div className="px-2">
              <TradeTableReview
                tradesParam={filteredTrades.map((trade) =>
                  createTradeWithDefaults(trade)
                )}
                config={{
                  style: {
                    height: "100%",
                    width: "100%",
                  },
                  columns: [
                    "expand",
                    "accounts",
                    "instrument",
                    "entryDate",
                    "entryTime",
                    "closeDate",
                    "closeTime",
                    "quantity",
                    "pnl",
                    "commission",
                  ],
                  groupTrades: false,
                  showHeader: false,
                  expandByDefault: true,
                  disableColumnConfig: true,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
