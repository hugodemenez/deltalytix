"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useData } from "@/context/data-provider";
import { toast } from "sonner";
import { useI18n } from "@/locales/client";

export interface IgSyncAccount {
  id: string;
  userId: string;
  service: string;
  accountId: string;
  hasToken: boolean;
  identifier?: string | null;
  environment?: string | null;
  accountNumbers: string[];
  lastSyncedAt: Date;
  dailySyncTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IgSyncContextType {
  performSyncForAccount: (
    accountId: string,
  ) => Promise<{ success: boolean; message: string } | undefined>;
  performSyncForAllAccounts: () => Promise<void>;
  isAutoSyncing: boolean;
  syncingAccountIds: ReadonlySet<string>;
  isAccountSyncing: (accountId: string) => boolean;
  accounts: IgSyncAccount[];
  loadAccounts: () => Promise<IgSyncAccount[]>;
  deleteAccount: (accountId: string) => Promise<void>;
}

const IgSyncContext = createContext<IgSyncContextType | undefined>(undefined);

export function IgSyncContextProvider({ children }: { children: ReactNode }) {
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const isAutoSyncingRef = useRef(false);
  const [accounts, setAccounts] = useState<IgSyncAccount[]>([]);
  const accountsRef = useRef<IgSyncAccount[]>([]);
  const [syncingAccountIds, setSyncingAccountIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const syncingAccountIdsRef = useRef(new Set<string>());

  const beginAccountSync = useCallback((accountId: string) => {
    syncingAccountIdsRef.current.add(accountId);
    setSyncingAccountIds(new Set(syncingAccountIdsRef.current));
  }, []);

  const endAccountSync = useCallback((accountId: string) => {
    syncingAccountIdsRef.current.delete(accountId);
    setSyncingAccountIds(new Set(syncingAccountIdsRef.current));
  }, []);

  const isAccountSyncing = useCallback(
    (accountId: string) => syncingAccountIds.has(accountId),
    [syncingAccountIds],
  );

  const t = useI18n();
  const { refreshTradesOnly } = useData();

  const normalizeSynchronization = useCallback(
    (sync: Record<string, unknown>): IgSyncAccount => ({
      id: String(sync.id),
      userId: String(sync.userId),
      service: String(sync.service),
      accountId: String(sync.accountId),
      hasToken: !!sync.hasToken,
      identifier: (sync.identifier as string | null) ?? null,
      environment: (sync.environment as string | null) ?? null,
      accountNumbers: Array.isArray(sync.accountNumbers)
        ? (sync.accountNumbers as string[])
        : [],
      lastSyncedAt: sync.lastSyncedAt
        ? new Date(sync.lastSyncedAt as string)
        : new Date(),
      dailySyncTime: sync.dailySyncTime
        ? new Date(sync.dailySyncTime as string)
        : null,
      createdAt: sync.createdAt
        ? new Date(sync.createdAt as string)
        : new Date(),
      updatedAt: sync.updatedAt
        ? new Date(sync.updatedAt as string)
        : new Date(),
    }),
    [],
  );

  const loadAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/ig/synchronizations", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch synchronizations");
      const result = await response.json();
      const data = Array.isArray(result.data) ? result.data : [];
      const next = data.map(normalizeSynchronization);
      accountsRef.current = next;
      setAccounts(next);
      return next;
    } catch (error) {
      console.warn("Failed to load IG accounts:", error);
      toast.error(t("igSync.errors.LOAD_SYNCHRONIZATIONS_FAILED"));
      return accountsRef.current;
    }
  }, [normalizeSynchronization, t]);

  const deleteAccount = useCallback(async (accountId: string) => {
    accountsRef.current = accountsRef.current.filter(
      (acc) => acc.accountId !== accountId,
    );
    setAccounts(accountsRef.current);
    await fetch("/api/ig/synchronizations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
  }, []);

  const performSyncForAccount = useCallback(
    async (accountId: string) => {
      const account = accountsRef.current.find(
        (acc) => acc.accountId === accountId,
      );
      if (!account) {
        return {
          success: false,
          message: t("igSync.sync.accountNotFound"),
        };
      }
      if (!account.hasToken) {
        return {
          success: false,
          message: t("igSync.sync.tokenMissing"),
        };
      }
      if (syncingAccountIdsRef.current.has(accountId)) {
        return { success: true, message: "SYNC_IN_PROGRESS" };
      }

      beginAccountSync(accountId);
      try {
        const { syncIgFromBrowser } = await import(
          "@/app/[locale]/dashboard/components/import/ig/sync/sync-ig-browser"
        );
        const syncResult = await syncIgFromBrowser(accountId);

        if (syncResult?.error === "DUPLICATE_TRADES") {
          await loadAccounts();
          await refreshTradesOnly({ force: false });
          return { success: true, message: "DUPLICATE_TRADES" };
        }

        if (syncResult?.error) {
          const code = syncResult.error || "SYNC_FAILED";
          toast.error(
            (
              t as (
                key: string,
                params?: Record<string, string | number>,
              ) => string
            )(`igSync.errors.${code}`, {
              ...(syncResult.errorParams ?? {}),
            }),
          );
          return { success: false, message: code };
        }

        await loadAccounts();
        await refreshTradesOnly({ force: false });
        return { success: true, message: "OK" };
      } catch (error) {
        console.error("IG sync error:", error);
        toast.error(t("igSync.errors.SYNC_FAILED"));
        return { success: false, message: "SYNC_FAILED" };
      } finally {
        endAccountSync(accountId);
      }
    },
    [beginAccountSync, endAccountSync, loadAccounts, refreshTradesOnly, t],
  );

  const performSyncForAllAccounts = useCallback(async () => {
    if (isAutoSyncingRef.current) return;
    isAutoSyncingRef.current = true;
    setIsAutoSyncing(true);
    try {
      const targets = accountsRef.current.filter((account) => account.hasToken);
      await Promise.all(
        targets.map((account) => performSyncForAccount(account.accountId)),
      );
    } finally {
      isAutoSyncingRef.current = false;
      setIsAutoSyncing(false);
    }
  }, [performSyncForAccount]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  return (
    <IgSyncContext.Provider
      value={{
        performSyncForAccount,
        performSyncForAllAccounts,
        isAutoSyncing,
        syncingAccountIds,
        isAccountSyncing,
        accounts,
        loadAccounts,
        deleteAccount,
      }}
    >
      {children}
    </IgSyncContext.Provider>
  );
}

export function useIgSyncContext() {
  const context = useContext(IgSyncContext);
  if (!context) {
    throw new Error(
      "useIgSyncContext must be used within IgSyncContextProvider",
    );
  }
  return context;
}
