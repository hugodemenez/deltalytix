"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { getRithmicData, updateLastSyncTime } from "@/lib/rithmic-storage";
import { useData } from "@/context/data-provider";
import { toast } from "sonner";
import { useI18n } from "@/locales/client";
import { useRithmicSyncStore } from "@/store/rithmic-sync-store";
import { useTradesStore } from "@/store/trades-store";
import { getUserId } from "@/server/auth";
import { useUserStore } from "@/store/user-store";

interface RithmicCredentials {
  username: string;
  password: string;
  server_type: string;
  location: string;
  userId: string;
}

function parseRateLimitMessage(detail: string) {
  const match = detail.match(
    /Maximum (\d+) attempts allowed per (\d+\.?\d*) minutes\. Please wait (\d+\.?\d*) minutes/
  );
  return match
    ? { max: match[1], period: match[2], wait: match[3] }
    : { max: 2, period: 15, wait: 12 };
}

interface RithmicSyncContextType {
  // Core connection management
  connect: (
    url: string,
    token: string,
    accounts: string[],
    startDate: string
  ) => void;
  disconnect: () => void;
  isConnected: boolean;
  connectionStatus: string;

  // Message handling
  handleMessage: (message: any) => void;

  // Auto-sync functionality
  performSyncForCredential: (
    credentialId: string
  ) => Promise<
    { success: boolean; rateLimited: boolean; message: string } | undefined
  >;

  // Utilities
  calculateStartDate: (selectedAccounts: string[]) => string;
  authenticateAndGetAccounts: (credentials: RithmicCredentials) => Promise<
    | { success: false; rateLimited: boolean; message: string }
    | {
        success: true;
        rateLimited: boolean;
        token: string;
        websocket_url: string;
        accounts: { account_id: string; fcm_id: string }[];
      }
  >;
  getWebSocketUrl: (baseUrl: string) => string;
}

const RithmicSyncContext = createContext<RithmicSyncContextType | undefined>(
  undefined
);

export function RithmicSyncContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [syncCheckInterval, setSyncCheckInterval] =
    useState<NodeJS.Timeout | null>(null);

  const t = useI18n();
  const { refreshTradesOnly } = useData();

  const isLoading = useUserStore((state) => state.isLoading);
  const trades = useTradesStore((state) => state.trades);

  // Use store for state management
  const {
    syncInterval,
    accountsProgress,
    currentAccount,
    isAutoSyncing,
    setLastMessage,
    addMessageToHistory,
    clearMessageHistory,
    setAccountsProgress,
    updateAccountProgress,
    setCurrentAccount,
    resetProcessingState,
    setSelectedAccounts,
    setAvailableAccounts,
    setIsAutoSyncing,
  } = useRithmicSyncStore();

  const disconnect = useCallback(() => {
    if (ws) {
      console.log("Disconnecting WebSocket");
      ws.close();
      setWs(null);
      setIsConnected(false);
      setConnectionStatus("Disconnected");
      resetProcessingState();
    }
    // Clear sync check interval when disconnecting
    if (syncCheckInterval) {
      clearInterval(syncCheckInterval);
      setSyncCheckInterval(null);
    }
  }, [ws, resetProcessingState, syncCheckInterval]);

  const handleMessage = useCallback(
    (message: any) => {
      if (!message) return;

      setLastMessage(message);
      addMessageToHistory(message);

      switch (message.type) {
        case "log":
          if (message.level === "info") {
            // Handle initial days count message
            if (
              message.message.includes("Processing") &&
              message.message.includes("days of history")
            ) {
              const match = message.message.match(
                /Processing (\d+) days of history from \d{8}/
              );
              if (match) {
                const [, totalDays] = match;

                // Look for the most recently added account that doesn't have totalDays set
                const entries = Object.entries(accountsProgress);
                const activeAccount = entries.find(
                  ([_, progress]) =>
                    !progress.isComplete && progress.totalDays === 0
                );

                if (activeAccount) {
                  const [accountId] = activeAccount;
                  console.log("Setting total days:", { accountId, totalDays });
                  updateAccountProgress(accountId, {
                    totalDays: parseInt(totalDays),
                    daysProcessed: 0,
                    total: parseInt(totalDays),
                  });
                } else {
                  console.warn(
                    "No matching account found for setting total days:",
                    {
                      totalDays,
                      message: message.message,
                    }
                  );
                }
              }
            }
            // Handle day-by-day progress
            else if (message.message.includes("Processing date")) {
              // Support both old and new message formats
              const newFormatMatch = message.message.match(
                /\[(.*?)\] Processing date (\d+)\/(\d+)(?:: (\d{8}))?/
              );
              const oldFormatMatch = message.message.match(
                /Processing date (\d+) of (\d+)(?:: (\d{8}))?/
              );

              let accountId: string | undefined;
              let currentDay: string | undefined;
              let totalDays: string | undefined;
              let currentDate: string | undefined = undefined;

              if (newFormatMatch) {
                [, accountId, currentDay, totalDays, currentDate] =
                  newFormatMatch;
              } else if (oldFormatMatch) {
                [, currentDay, totalDays, currentDate] = oldFormatMatch;
                accountId = currentAccount || message.account_id;
              }

              if (accountId && currentDay && totalDays) {
                // Calculate the actual days processed based on the current day number
                const daysProcessed = Math.max(parseInt(currentDay) - 1, 0);
                const currentProgress = accountsProgress[accountId] || {
                  processedDates: [],
                };

                updateAccountProgress(accountId, {
                  currentDayNumber: parseInt(currentDay),
                  totalDays: parseInt(totalDays),
                  currentDate: currentDate || "",
                  daysProcessed: daysProcessed,
                  processedDates: currentProgress.processedDates || [],
                  current: parseInt(currentDay),
                  total: parseInt(totalDays),
                });
              }
            }
            // Handle completed dates
            else if (
              message.message.includes("Successfully processed orders for date")
            ) {
              const date = message.message.match(/date (\d{8})/)?.[1];
              const accountId = currentAccount || message.account_id;
              if (date && accountId) {
                const currentProgress = accountsProgress[accountId] || {
                  ordersProcessed: 0,
                  daysProcessed: 0,
                  totalDays: 0,
                  isComplete: false,
                  processedDates: [],
                  currentDayNumber: 0,
                  currentDate: "",
                  lastProcessedDate: "",
                };

                const newDaysProcessed = currentProgress.daysProcessed + 1;

                updateAccountProgress(accountId, {
                  processedDates: [
                    ...(currentProgress.processedDates || []),
                    date,
                  ],
                  lastProcessedDate: date,
                  daysProcessed: newDaysProcessed,
                });
              }
            }
            // Handle account initialization
            else if (message.message.includes("Successfully added account")) {
              const accountId = message.message.match(/account ([^"]+)/)?.[1];
              if (accountId) {
                updateAccountProgress(accountId, {
                  ordersProcessed: 0,
                  daysProcessed: 0,
                  totalDays: 0,
                  isComplete: false,
                  processedDates: [],
                  currentDayNumber: 0,
                  currentDate: "",
                  lastProcessedDate: "",
                  current: 0,
                  total: 0,
                });
              }
            }
            // Handle account start
            else if (
              message.message.includes("Starting processing for account")
            ) {
              const accountMatch = message.message.match(
                /account \d+ of \d+: ([^"\s]+)/
              );
              const accountId = accountMatch?.[1];
              if (accountId) {
                setCurrentAccount(accountId);
                updateAccountProgress(accountId, {
                  ordersProcessed: 0,
                  daysProcessed: 0,
                  isComplete: false,
                  processedDates: [],
                  currentDayNumber: 0,
                  currentDate: "",
                  lastProcessedDate: "",
                });
              }
            }
            // Handle account completion
            else if (
              message.message.includes("Completed processing account") &&
              message.message.includes("collected")
            ) {
              const match = message.message.match(
                /account ([^,]+), collected (\d+) orders/
              );
              if (match) {
                const [, accountId, ordersStr] = match;
                const ordersCount = parseInt(ordersStr, 10);
                const currentProgress = accountsProgress[accountId];
                updateAccountProgress(accountId, {
                  ordersProcessed: ordersCount,
                  isComplete: true,
                  daysProcessed: currentProgress?.totalDays || 0,
                  currentDayNumber: currentProgress?.totalDays || 0,
                });
              }
            }
          }
          break;

        case "order_update":
          if (message.account_id) {
            const prevAccount = accountsProgress[message.account_id];
            if (prevAccount) {
              updateAccountProgress(message.account_id, {
                ordersProcessed: prevAccount.ordersProcessed + 1,
              });
            }
          }
          break;

        case "processing_complete":
          refreshTradesOnly({ force: true });
          break;

        case "status":
          if (message.all_complete) {
          }
          break;

        case "progress":
          const progressMatch = message.message.match(
            /\[(.*?)\] Processing date (\d+)\/(\d+)(?:: (\d{8}))?/
          );
          if (progressMatch) {
            const [, accountId, currentDay, totalDays, currentDate] =
              progressMatch;
            const current = parseInt(currentDay);
            const total = parseInt(totalDays);
            const prevAccount = accountsProgress[accountId] || {
              ordersProcessed: 0,
              daysProcessed: 0,
              totalDays: 0,
              isComplete: false,
              processedDates: [],
              currentDayNumber: 0,
              currentDate: "",
              current: 0,
              total: 0,
            };

            // Only update if it's a newer progress
            if (current > prevAccount.current || total !== prevAccount.total) {
              const daysProcessed = Math.max(current - 1, 0);

              updateAccountProgress(accountId, {
                currentDayNumber: current,
                totalDays: total,
                currentDate: currentDate || prevAccount.currentDate,
                daysProcessed,
                processedDates: [
                  ...new Set([
                    ...(prevAccount.processedDates || []),
                    currentDate,
                  ]),
                ].filter(Boolean),
                current,
                total,
                isComplete: current === total,
              });
            }

            // Update current account if not set
            if (!currentAccount) {
              setCurrentAccount(accountId);
            }
          }
          break;
      }
    },
    [
      currentAccount,
      accountsProgress,
      setCurrentAccount,
      refreshTradesOnly,
      setLastMessage,
      addMessageToHistory,
      updateAccountProgress,
    ]
  );

  const connect = useCallback(
    (url: string, token: string, accounts: string[], startDate: string) => {
      if (ws) {
        console.log("Closing existing connection before creating new one");
        ws.close();
      }

      // reset processing state, message history
      resetProcessingState();
      clearMessageHistory();

      // Save selected accounts in context
      setSelectedAccounts(accounts);

      // Initialize account progress
      const initialProgress = accounts.reduce(
        (acc, accountId) => ({
          ...acc,
          [accountId]: {
            ordersProcessed: 0,
            daysProcessed: 0,
            totalDays: 0,
            isComplete: false,
            processedDates: [],
            currentDayNumber: 0,
            currentDate: "",
            lastProcessedDate: "",
            current: 0,
            total: 0,
          },
        }),
        {}
      );

      setAccountsProgress(initialProgress);
      setCurrentAccount(null);

      const newWs = new WebSocket(url);

      newWs.onopen = () => {
        setIsConnected(true);
        setConnectionStatus("Connected");

        handleMessage({
          type: "connection_status",
          status: "Connected",
          message: "WebSocket connection established",
        });

        // Send init message immediately after connection
        const message = {
          type: "init",
          token,
          accounts,
          start_date: startDate,
        };
        newWs.send(JSON.stringify(message));
      };

      newWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          setConnectionStatus(`Failed to parse message: ${errorMessage}`);
          handleMessage({
            type: "connection_status",
            status: `Failed to parse message: ${errorMessage}`,
            message: "Failed to parse server message",
          });
        }
      };

      newWs.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus("WebSocket error occurred");
        handleMessage({
          type: "connection_status",
          status: "WebSocket error occurred",
          message: "WebSocket connection error occurred",
        });
        // Reset auto sync state on error
        setIsAutoSyncing(false);
        // Close connection on error
        disconnect();
      };

      newWs.onclose = (event) => {
        setIsConnected(false);
        const closeMessage = event.reason || "Connection closed";
        const status = `Disconnected: ${closeMessage}`;
        setConnectionStatus(status);
        handleMessage({
          type: "connection_status",
          status,
          message: `WebSocket disconnected: ${closeMessage}`,
        });
        // Reset auto sync state on close
        setIsAutoSyncing(false);
      };

      setWs(newWs);
    },
    [
      ws,
      handleMessage,
      disconnect,
      resetProcessingState,
      clearMessageHistory,
      setSelectedAccounts,
      setAccountsProgress,
      setCurrentAccount,
    ]
  );

  // Extract common protocol logic
  const getProtocols = useCallback(() => {
    const isLocalhost =
      process.env.NEXT_PUBLIC_RITHMIC_API_URL?.includes("localhost");
    return {
      http: isLocalhost ? window.location.protocol : "https:",
      ws: isLocalhost
        ? window.location.protocol === "https:"
          ? "wss:"
          : "ws:"
        : "wss:",
    };
  }, []);

  // Extract WebSocket URL construction
  const getWebSocketUrl = useCallback(
    (baseUrl: string) => {
      const { ws } = getProtocols();
      return baseUrl.replace(
        "ws://your-domain",
        `${ws}//${process.env.NEXT_PUBLIC_RITHMIC_API_URL}`
      );
    },
    [getProtocols]
  );

  // Run a sync for a credential
  const performSyncForCredential = useCallback(
    async (credentialId: string) => {
      // If we are already syncing, return
      if (isAutoSyncing) return;

      // Reset processing state, message history
      resetProcessingState();
      clearMessageHistory();

      const userId = await getUserId();
      // Ensure we are not already syncing
      // Prevent multiple syncs at the same time
      if (!userId || isAutoSyncing) return;

      // Access local storage
      const savedData = getRithmicData(credentialId);

      // If we do not find the credential, return
      if (!savedData) return;

      // Set the auto sync flag so we don't perform multiple syncs at the same time
      setIsAutoSyncing(true);

      try {
        // Authenticate and get accounts
        const { http } = getProtocols();

        // Make fetch request to get accounts
        const response = (await Promise.race([
          fetch(
            `${http}//${process.env.NEXT_PUBLIC_RITHMIC_API_URL}/accounts`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },

              body: JSON.stringify({
                ...savedData.credentials,
                userId: userId,
              }),
            }
          ),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Auto-sync operation timed out")),
              30000
            )
          ),
        ])) as Response;

        // Handle rate limit error specifically
        if (response.status === 429) {
          const data = await response.json();
          const params = parseRateLimitMessage(data.detail);

          toast.error(t("rithmic.rateLimit.title"), {
            description: t("rithmic.rateLimit.description", params),
          });

          return {
            success: false as const,
            rateLimited: true,
            message: data.detail || "Rate limit exceeded",
          };
        }

        const data = await response.json();
        if (!data.success) throw new Error(data.message);

        // If allAccounts is true, use all available accounts else use selected accounts (which exist in the data.accounts array)
        const accountsToSync = savedData.allAccounts
          ? data.accounts.map((acc: any) => acc.account_id)
          : savedData.selectedAccounts.filter((account: string) =>
              data.accounts.some((acc: any) => acc.account_id === account)
            );

        setAvailableAccounts(data.accounts);
        const wsUrl = getWebSocketUrl(data.websocket_url);

        // Get most recent date for each account
        const mostRecentDates = accountsToSync
          .map((accountId: string) => {
            const accountTrades = trades.filter(
              (trade) => trade.accountNumber === accountId
            );
            if (accountTrades.length === 0) return null;
            return Math.max(
              ...accountTrades.map((trade) =>
                new Date(trade.entryDate).getTime()
              )
            );
          })
          .filter(Boolean) as number[];

        let startDate: string;

        // If no valid dates found, use 200 days ago as default
        if (mostRecentDates.length === 0) {
          const defaultDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
          startDate = defaultDate.toISOString().slice(0, 10).replace(/-/g, "");
        } else {
          // Find oldest of the most recent dates
          const oldestRecentDate = new Date(Math.min(...mostRecentDates));
          // Add 3 days buffer
          oldestRecentDate.setDate(oldestRecentDate.getDate() - 3);
          startDate = oldestRecentDate
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "");
        }

        // Connect and start syncing
        connect(wsUrl, data.token, accountsToSync, startDate);
        updateLastSyncTime(credentialId);

        handleMessage({
          type: "log",
          level: "info",
          message: `Starting automatic background sync for ${savedData.name || savedData.credentials.username}`,
        });

        // Update last sync time in the database
        // Call API route instead of server action
        const syncResponse = await fetch("/api/rithmic/synchronizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: savedData.id,
            lastSyncedAt: new Date(),
          }),
        });

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json();
          throw new Error(
            errorData.message || "Failed to update synchronization"
          );
        }

        return {
          success: true,
          rateLimited: false,
          message: "Sync started successfully",
        };
      } catch (error) {
        console.error("Auto-sync error:", error);
        handleMessage({
          type: "log",
          level: "error",
          message: `Auto-sync error for credential set ${credentialId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        });

        return {
          success: false,
          rateLimited: false,
          message: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        setIsAutoSyncing(false);
      }
    },
    [
      isAutoSyncing,
      connect,
      handleMessage,
      getProtocols,
      getWebSocketUrl,
      t,
      resetProcessingState,
      clearMessageHistory,
      setAvailableAccounts,
      setIsAutoSyncing,
    ]
  );

  // Update authenticateAndGetAccounts to return a rate limit response object
  const authenticateAndGetAccounts = useCallback(
    async (credentials: RithmicCredentials) => {
      const { http } = getProtocols();
      const response = await fetch(
        `${http}//${process.env.NEXT_PUBLIC_RITHMIC_API_URL}/accounts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        }
      );

      // Handle rate limit error specifically
      if (response.status === 429) {
        const data = await response.json();
        const params = parseRateLimitMessage(data.detail);

        toast.error(t("rithmic.rateLimit.title"), {
          description: t("rithmic.rateLimit.description", params),
        });

        return {
          success: false as const,
          rateLimited: true,
          message: data.detail || "Rate limit exceeded",
        };
      }

      const data = await response.json();
      if (!data.success) {
        return {
          success: false as const,
          rateLimited: false,
          message: data.message,
        };
      }

      return {
        success: true as const,
        rateLimited: false,
        token: data.token,
        websocket_url: getWebSocketUrl(data.websocket_url),
        accounts: data.accounts,
      };
    },
    [getProtocols, getWebSocketUrl, t]
  );

  // Add calculateStartDate function
  const calculateStartDate = useCallback(
    (selectedAccounts: string[]): string => {
      // Filter trades for selected accounts
      const accountTrades = trades.filter((trade) =>
        selectedAccounts.includes(trade.accountNumber)
      );

      if (accountTrades.length === 0) {
        // If no trades found, return date 90 days ago
        const date = new Date();
        date.setDate(date.getDate() - 91);
        const startDate = date.toISOString().slice(0, 10).replace(/-/g, "");
        console.log("No trades found, using default start date:", startDate);
        return startDate;
      }

      // Find the most recent trade date for each account
      const accountDates = selectedAccounts
        .map((accountId) => {
          const accountTrades = trades.filter(
            (trade) => trade.accountNumber === accountId
          );
          if (accountTrades.length === 0) return null;
          return Math.max(
            ...accountTrades.map((trade) => new Date(trade.entryDate).getTime())
          );
        })
        .filter(Boolean) as number[];

      // Get the oldest most recent date across all accounts
      const oldestRecentDate = new Date(Math.min(...accountDates));

      // Set to next day
      oldestRecentDate.setDate(oldestRecentDate.getDate() + 1);

      // Format as YYYYMMDD
      const startDate = oldestRecentDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");
      console.log("Calculated start date from trades:", startDate);
      return startDate;
    },
    [trades]
  );

  // Auto-sync checking
  const checkAndPerformSyncs = useCallback(async () => {
    // If we are still loading trades, return
    if (isLoading) return;
    // If we are already syncing, return
    if (isAutoSyncing) return;
    try {
      // Call API route instead of server action
      const response = await fetch("/api/rithmic/synchronizations", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch synchronizations");
      }

      const result = await response.json();
      const synchronizations = result.data || [];

      for (const sync of synchronizations) {
        if (!sync.lastSyncedAt) continue;

        const lastSyncTime = new Date(sync.lastSyncedAt).getTime();
        const now = Date.now();
        const minutesSinceLastSync = (now - lastSyncTime) / (1000 * 60);

        if (minutesSinceLastSync >= syncInterval) {
          console.log(`Auto-sync triggered for credential ${sync.accountId}`);
          await performSyncForCredential(sync.accountId);
        }
      }
    } catch (error) {
      console.warn("Error during rithmic auto-sync check:", error);
    }
  }, [syncInterval, isAutoSyncing, performSyncForCredential]);

  // Auto-sync checking interval
  useEffect(() => {
    const intervalMs = 1 * 60 * 1000; // 1 minute

    const intervalId = setInterval(() => {
      checkAndPerformSyncs();
    }, intervalMs);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [syncInterval]);

  return (
    <RithmicSyncContext.Provider
      value={{
        // Core connection management
        connect,
        disconnect,
        isConnected,
        connectionStatus,

        // Message handling
        handleMessage,

        // Auto-sync functionality
        performSyncForCredential,

        // Utilities
        calculateStartDate,
        authenticateAndGetAccounts,
        getWebSocketUrl,
      }}
    >
      {children}
    </RithmicSyncContext.Provider>
  );
}

export function useRithmicSyncContext() {
  const context = useContext(RithmicSyncContext);
  if (context === undefined) {
    throw new Error(
      "useRithmicSyncContext must be used within a RithmicSyncContextProvider"
    );
  }
  return context;
}
