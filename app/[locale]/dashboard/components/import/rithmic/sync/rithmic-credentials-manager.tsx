"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Trash2,
  Plus,
  Edit2,
  RefreshCw,
  MoreVertical,
  History,
  AlertTriangle,
  LogIn,
} from "lucide-react";
import {
  getAllRithmicData,
  clearRithmicData,
  RithmicCredentialSet,
  updateLastSyncTime,
} from "@/lib/rithmic-storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SyncCountdown } from "./sync-countdown";
import { useI18n } from "@/locales/client";
import { toast } from "sonner";
import { useRithmicSyncStore, SyncInterval } from "@/store/rithmic-sync-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStore } from "@/store/user-store";
import { useRithmicSyncContext } from "@/context/rithmic-sync-context";
import { cn } from "@/lib/utils";

const fieldClassName =
  "h-9 rounded-sm border-black/10 bg-transparent text-sm shadow-none focus:ring-0 focus:ring-offset-0 dark:border-white/10";
const primaryButtonClassName =
  "h-9 rounded-sm bg-[oklch(0.22_0.01_95)] px-4 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]";
const secondaryButtonClassName =
  "h-9 rounded-sm border border-black/20 bg-transparent px-3 text-sm font-medium shadow-none transition-[opacity,transform,background-color] duration-150 hover:bg-black/5 active:scale-[0.96] dark:border-white/20 dark:hover:bg-white/5";
const iconButtonClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-sm text-black/45 transition-[opacity,transform,background-color,color] duration-150 hover:bg-black/5 hover:text-black active:scale-[0.96] dark:text-white/45 dark:hover:bg-white/5 dark:hover:text-white";

interface Synchronization {
  accountId: string;
  lastSyncedAt: string | null;
  service: string;
  userId: string;
}

interface RithmicCredentialsManagerProps {
  onSelectCredential: (credential: RithmicCredentialSet) => void;
  onLoginMissingCredential: (id: string) => void;
  onAddNew: () => void;
}

export function RithmicCredentialsManager({
  onSelectCredential,
  onLoginMissingCredential,
  onAddNew,
}: RithmicCredentialsManagerProps) {
  const [credentials, setCredentials] =
    useState<Record<string, RithmicCredentialSet>>(getAllRithmicData());
  const [synchronizations, setSynchronizations] = useState<Synchronization[]>(
    []
  );
  const [isLoadingSynchronizations, setIsLoadingSynchronizations] =
    useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState<
    string | null
  >(null);
  const {
    performSyncForCredential,
    connect,
    getWebSocketUrl,
    authenticateAndGetAccounts,
  } = useRithmicSyncContext();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingSyncId, setDeletingSyncId] = useState<string | null>(null);
  const t = useI18n();
  const user = useUserStore((state) => state.user);
  const { syncInterval, setSyncInterval, isAutoSyncing } =
    useRithmicSyncStore();

  // Fetch synchronizations from API
  useEffect(() => {
    const fetchSynchronizations = async () => {
      try {
        setIsLoadingSynchronizations(true);
        const response = await fetch("/api/rithmic/synchronizations", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch synchronizations");
        }

        const result = await response.json();
        console.log("synchronizations", result.data);
        setSynchronizations(result.data || []);
      } catch (error) {
        console.error("Error fetching synchronizations:", error);
        toast.error(t("rithmic.error.syncError"));
      } finally {
        setIsLoadingSynchronizations(false);
      }
    };

    fetchSynchronizations();
  }, [t]);

  // Build a merged view of synchronizations and local credentials
  const isLegacySyncId = (id?: string | null) =>
    !!id && id.startsWith("rithmic_");

  const handleSync = useCallback(
    async (credential: RithmicCredentialSet) => {
      // Prevent multiple syncs for the same credential
      if (syncingId === credential.id) {
        return;
      }

      try {
        console.log("Starting sync for credential:", credential.id);
        setSyncingId(credential.id);
        const result = await performSyncForCredential(credential.id);

        console.log("Sync result:", result);

        if (result?.success) {
          updateLastSyncTime(credential.id);
        }
      } catch (error) {
        toast.error(t("rithmic.error.syncError"));
        console.error("Sync error:", error);
      } finally {
        setSyncingId(null);
      }
    },
    [syncingId, performSyncForCredential, t]
  );

  const handleLoadMoreData = useCallback(
    async (credential: RithmicCredentialSet) => {
      if (syncingId === credential.id) {
        return;
      }

      try {
        setSyncingId(credential.id);

        // Authenticate and get accounts
        const authResult = await authenticateAndGetAccounts({
          ...credential.credentials,
          userId: user?.id || "",
        });

        if (!authResult.success) {
          if (authResult.rateLimited) {
            toast.error(t("rithmic.error.rateLimit"));
          } else {
            toast.error(t("rithmic.error.authError"));
          }
          return;
        }

        // Calculate start date (300 days ago)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 400);
        const formattedStartDate = startDate
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, "");

        // Get accounts to sync
        const accountsToSync = credential.allAccounts
          ? authResult.accounts.map((acc) => acc.account_id)
          : credential.selectedAccounts;

        // Connect and start syncing with the new date range
        const wsUrl = getWebSocketUrl(authResult.websocket_url);
        connect(wsUrl, authResult.token, accountsToSync, formattedStartDate);

        // Update last sync time
        updateLastSyncTime(credential.id);
      } catch (error) {
        toast.error(t("rithmic.error.syncError"));
        console.error("Load more data error:", error);
      } finally {
        setSyncingId(null);
      }
    },
    [
      syncingId,
      authenticateAndGetAccounts,
      connect,
      getWebSocketUrl,
      t,
      user?.id,
    ]
  );

  const handleDeleteSynchronization = useCallback(
    async (accountId: string | undefined) => {
      if (!accountId) return;

      try {
        setDeletingSyncId(accountId);
        const response = await fetch("/api/rithmic/synchronizations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to delete synchronization");
        }

        setSynchronizations((prev) =>
          prev.filter((sync) => sync.accountId !== accountId)
        );
        toast.success(t("rithmic.synchronizationRemoved"));
      } catch (error) {
        console.error("Error deleting synchronization:", error);
        toast.error(t("rithmic.error.syncDeleteFailed"));
      } finally {
        setDeletingSyncId(null);
      }
    },
    [t]
  );

  const handleLoginMissing = useCallback(
    (accountId: string | undefined) => {
      if (!accountId) return;

      if (accountId.startsWith("rithmic_")) {
        toast.error(t("rithmic.error.legacySyncIdTitle"), {
          description: t("rithmic.error.legacySyncIdDescription"),
        });
        return;
      }

      onLoginMissingCredential(accountId);
    },
    [onLoginMissingCredential, t]
  );

  const credentialList = Object.values(credentials);
  const matchedCredentialIds = new Set<string>();

  const syncEntries = synchronizations.map((sync) => {
    if (isLegacySyncId(sync.accountId)) {
      return {
        sync,
        credential: null,
        hasLocalCredentials: false,
      };
    }

    const byId = credentials[sync.accountId];
    const byUsername = credentialList.find(
      (cred) => cred.credentials.username === sync.accountId
    );
    const localCredential = byId || byUsername;

    if (localCredential) {
      matchedCredentialIds.add(localCredential.id);
    }

    return {
      sync,
      credential: localCredential || null,
      hasLocalCredentials: !!localCredential,
    };
  });

  const syncAccountIds = new Set(synchronizations.map((s) => s.accountId));
  const localOnlyCredentials = credentialList
    .filter(
      (cred) =>
        !matchedCredentialIds.has(cred.id) &&
        !syncAccountIds.has(cred.credentials.username) &&
        !syncAccountIds.has(cred.id)
    )
    .map((credential) => ({
      sync: null,
      credential,
      hasLocalCredentials: true,
    }));

  const allEntries = [...syncEntries, ...localOnlyCredentials];

  function handleDelete(id: string) {
    clearRithmicData(id);
    setCredentials(getAllRithmicData());
    setIsDeleteDialogOpen(false);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-normal tracking-tight md:text-2xl">
          {t("rithmic.savedCredentials")}
        </h2>
        <Button type="button" onClick={onAddNew} className={primaryButtonClassName}>
          <Plus className="mr-2 h-4 w-4" strokeWidth={1.75} />
          {t("rithmic.addNew")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-black/10 py-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm text-black/45 dark:text-white/45">
            {t("rithmic.syncInterval")}
          </span>
          <Select
            value={syncInterval.toString()}
            onValueChange={(value) =>
              setSyncInterval(parseInt(value) as SyncInterval)
            }
          >
            <SelectTrigger className={cn(fieldClassName, "w-[100px]")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-sm border-black/10 bg-white shadow-none dark:border-white/10 dark:bg-black">
              <SelectItem value="5">5 min</SelectItem>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="60">60 min</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          onClick={() => {
            const allCredentials = Object.values(credentials);
            allCredentials.forEach((cred) => handleSync(cred));
          }}
          variant="outline"
          disabled={true}
          className={secondaryButtonClassName}
        >
          <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.75} />
          {t("rithmic.actions.syncAll")}
        </Button>
      </div>

      {isLoadingSynchronizations ? (
        <p className="flex items-center gap-2 border-y border-black/10 py-8 text-sm text-black/45 dark:border-white/10 dark:text-white/45">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </p>
      ) : allEntries.length === 0 ? (
        <p className="border-y border-black/10 py-8 text-sm text-black/45 dark:border-white/10 dark:text-white/45">
          {t("rithmic.noSavedCredentials")}
        </p>
      ) : (
        <ul className="divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10">
          {allEntries.map((entry) => {
            const { sync, credential, hasLocalCredentials } = entry;
            const credentialId = credential?.id || "";
            const rowId = sync?.accountId || credentialId || "";
            const lastSyncTime =
              credential?.lastSyncTime ||
              sync?.lastSyncedAt ||
              new Date().toISOString();
            const username =
              credential?.credentials.username || sync?.accountId || "N/A";

            return (
              <li key={rowId} className="flex items-start justify-between gap-4 py-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 truncate text-base font-normal tracking-tight md:text-lg">
                    <span className="truncate">{username}</span>
                    {!hasLocalCredentials && (
                      <AlertTriangle
                        className="h-4 w-4 shrink-0 text-black/45 dark:text-white/45"
                        aria-label={t("rithmic.missingCredentialsWarning")}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                    {t("rithmic.lastSync")}:{" "}
                    {lastSyncTime
                      ? formatDate(lastSyncTime)
                      : t("rithmic.neverSynced")}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-black/45 dark:text-white/45">
                    <span>{t("rithmic.nextSync")}</span>
                    {credential ? (
                      <SyncCountdown
                        lastSyncTime={lastSyncTime}
                        isAutoSyncing={
                          isAutoSyncing && syncingId === credentialId
                        }
                        credentialId={credentialId}
                      />
                    ) : (
                      <span>{t("rithmic.noCredentials")}</span>
                    )}
                  </div>
                  {!hasLocalCredentials && (
                    <p className="mt-2 text-sm leading-relaxed text-black/55 dark:text-white/55">
                      {t("rithmic.missingCredentialsWarning")}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {credential ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSync(credential)}
                        disabled={isAutoSyncing}
                        className={iconButtonClassName}
                        aria-label={t("rithmic.actions.sync")}
                      >
                        {syncingId === credentialId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                        )}
                      </button>
                      <Popover modal>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={iconButtonClassName}
                            aria-label={t("rithmic.actions.title")}
                          >
                            <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-48 rounded-sm border-black/10 bg-white p-1 shadow-none dark:border-white/10 dark:bg-black"
                          align="end"
                        >
                          <div className="flex flex-col">
                            <button
                              type="button"
                              className="flex w-full items-center rounded-sm px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
                              onClick={() => handleLoadMoreData(credential)}
                              disabled={isAutoSyncing}
                            >
                              {syncingId === credentialId ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <History className="mr-2 h-4 w-4" strokeWidth={1.75} />
                              )}
                              {t("rithmic.actions.loadMore")}
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center rounded-sm px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
                              onClick={() => onSelectCredential(credential)}
                            >
                              <Edit2 className="mr-2 h-4 w-4" strokeWidth={1.75} />
                              {t("rithmic.actions.edit")}
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center rounded-sm px-3 py-2.5 text-left text-sm text-red-600 transition-colors duration-150 hover:bg-black/5 dark:text-red-400 dark:hover:bg-white/5"
                              onClick={() => {
                                setSelectedCredentialId(credentialId);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.75} />
                              {t("rithmic.actions.delete")}
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={cn(secondaryButtonClassName, "px-2")}
                        onClick={() => handleLoginMissing(sync?.accountId)}
                        disabled={
                          !sync?.accountId || deletingSyncId === sync.accountId
                        }
                      >
                        <LogIn className="mr-2 h-4 w-4" strokeWidth={1.75} />
                        {t("rithmic.actions.login")}
                      </button>
                      <button
                        type="button"
                        className={iconButtonClassName}
                        onClick={() =>
                          handleDeleteSynchronization(sync?.accountId)
                        }
                        disabled={deletingSyncId === sync?.accountId}
                        aria-label={t("rithmic.actions.deleteSync")}
                      >
                        {deletingSyncId === sync?.accountId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-sm border-black/10 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="font-normal tracking-tight">
              {t("rithmic.deleteCredentials")}
            </DialogTitle>
            <DialogDescription className="text-black/55 dark:text-white/55">
              {t("rithmic.deleteCredentialsConfirm")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className={secondaryButtonClassName}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9 rounded-sm"
              onClick={() =>
                selectedCredentialId && handleDelete(selectedCredentialId)
              }
            >
              {t("common.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
