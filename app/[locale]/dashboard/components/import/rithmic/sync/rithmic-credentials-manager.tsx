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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SyncCountdown } from "./sync-countdown";
import { useSyncContext } from "@/context/sync-context";
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
  const { rithmic } = useSyncContext();
  const {
    performSyncForCredential,
    connect,
    getWebSocketUrl,
    authenticateAndGetAccounts,
  } = rithmic;
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
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {t("rithmic.savedCredentials")}
          </h2>
          <Button onClick={onAddNew} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t("rithmic.addNew")}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("rithmic.syncInterval")}
              </span>
              <Select
                value={syncInterval.toString()}
                onValueChange={(value) =>
                  setSyncInterval(parseInt(value) as SyncInterval)
                }
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 min</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => {
              const allCredentials = Object.values(credentials);
              allCredentials.forEach((cred) => handleSync(cred));
            }}
            size="sm"
            variant="outline"
            disabled={true}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("rithmic.actions.syncAll")}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("rithmic.username")}</TableHead>
              <TableHead>{t("rithmic.lastSync")}</TableHead>
              <TableHead>{t("rithmic.nextSync")}</TableHead>
              <TableHead>{t("rithmic.actions.title")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingSynchronizations ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-6"
                >
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Loading...
                </TableCell>
              </TableRow>
            ) : allEntries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-6"
                >
                  {t("rithmic.noSavedCredentials")}
                </TableCell>
              </TableRow>
            ) : (
              allEntries.map((entry) => {
                const { sync, credential, hasLocalCredentials } = entry;
                const credentialId = credential?.id || "";
                const rowId = sync?.accountId || credentialId || "";
                const lastSyncTime =
                  credential?.lastSyncTime ||
                  sync?.lastSyncedAt ||
                  new Date().toISOString();

                return (
                  <TableRow key={rowId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {credential ? (
                          credential.credentials.username
                        ) : (
                          <span className="text-muted-foreground">
                            {sync?.accountId || "N/A"}
                          </span>
                        )}
                        {!hasLocalCredentials && (
                          <AlertTriangle
                            className="h-4 w-4 text-yellow-500"
                            aria-label={t("rithmic.missingCredentialsWarning")}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lastSyncTime
                        ? formatDate(lastSyncTime)
                        : t("rithmic.neverSynced")}
                    </TableCell>
                    <TableCell>
                      {credential ? (
                        <SyncCountdown
                          lastSyncTime={lastSyncTime}
                          isAutoSyncing={
                            isAutoSyncing && syncingId === credentialId
                          }
                          credentialId={credentialId}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {t("rithmic.noCredentials")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {credential ? (
                        <div className="flex justify-center items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(credential)}
                            disabled={isAutoSyncing}
                          >
                            {syncingId === credentialId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Popover modal>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="end">
                              <div className="flex flex-col space-y-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start"
                                  onClick={() => handleLoadMoreData(credential)}
                                  disabled={isAutoSyncing}
                                >
                                  {syncingId === credentialId ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <History className="h-4 w-4 mr-2" />
                                  )}
                                  {t("rithmic.actions.loadMore")}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start"
                                  onClick={() => onSelectCredential(credential)}
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  {t("rithmic.actions.edit")}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setSelectedCredentialId(credentialId);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t("rithmic.actions.delete")}
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex items-start gap-2 text-xs text-yellow-600 dark:text-yellow-400 max-w-md">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span className="text-left">
                              {t("rithmic.missingCredentialsWarning")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start"
                              onClick={() =>
                                handleLoginMissing(sync?.accountId)
                              }
                              disabled={
                                !sync?.accountId ||
                                deletingSyncId === sync.accountId
                              }
                            >
                              <LogIn className="h-4 w-4 mr-2" />
                              {t("rithmic.actions.login")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start text-destructive hover:text-destructive"
                              onClick={() =>
                                handleDeleteSynchronization(sync?.accountId)
                              }
                              disabled={deletingSyncId === sync?.accountId}
                            >
                              {deletingSyncId === sync?.accountId ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              {t("rithmic.actions.deleteSync")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rithmic.deleteCredentials")}</DialogTitle>
            <DialogDescription>
              {t("rithmic.deleteCredentialsConfirm")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
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
