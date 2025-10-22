"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Plus, RefreshCw, MoreVertical } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/locales/client";
import { toast } from "sonner";
import {
  getAllTradovateTokens,
  storeTradovateToken,
  getTradovateTrades,
  initiateTradovateOAuth,
  removeTradovateToken,
} from "./actions";
import { useTradovateSyncStore } from "@/store/tradovate-sync-store";
import { useData } from "@/context/data-provider";
import { useTradovateSyncContext } from "@/context/tradovate-sync-context";

interface TradovateAccount {
  accountId: string;
  token: string;
  tokenExpiresAt: string;
  lastSyncedAt: string;
  isExpired: boolean;
  environment: "demo" | "live";
}

export function TradovateCredentialsManager() {
  const {
    performSyncForAccount,
    performSyncForAllAccounts,
    accounts,
    deleteAccount,
    loadAccounts,
  } = useTradovateSyncContext();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const t = useI18n();
  const tradovateStore = useTradovateSyncStore();

  const handleDelete = useCallback(
    async (accountId: string) => {
      try {
        // For now, we'll just remove from local state
        // In the future, we might want to add a deleteTradovateToken server action
        await deleteAccount(accountId);
        setIsDeleteDialogOpen(false);
        toast.success(
          t("tradovateSync.multiAccount.accountDeleted", { accountId }),
        );
      } catch (error) {
        toast.error(t("tradovateSync.multiAccount.deleteError", { accountId }));
        console.error("Delete error:", error);
      }
    },
    [t],
  );

  const handleStartOAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await initiateTradovateOAuth("default"); // We'll determine the actual account ID from the token
      if (result.error || !result.authUrl || !result.state) {
        toast.error(t("tradovateSync.error.oauthInit"));
        return;
      }

      // Store the state for verification
      tradovateStore.setOAuthState(result.state);

      // Also store in sessionStorage as backup
      sessionStorage.setItem("tradovate_oauth_state", result.state);

      // Redirect to Tradovate OAuth
      window.location.href = result.authUrl;
    } catch (error) {
      toast.error(t("tradovateSync.error.oauthInit"));
    } finally {
      setIsLoading(false);
    }
  }, [t, tradovateStore]);

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  const handleReloadAccounts = useCallback(async () => {
    try {
      setIsReloading(true);
      await loadAccounts();
      toast.success(t("tradovateSync.multiAccount.accountsReloaded"));
    } catch (error) {
      toast.error(t("tradovateSync.multiAccount.reloadError"));
      console.error("Reload error:", error);
    } finally {
      setIsReloading(false);
    }
  }, [loadAccounts, t]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {t("tradovateSync.multiAccount.savedAccounts")}
            </h2>
            <Button
              onClick={handleReloadAccounts}
              size="sm"
              variant="ghost"
              disabled={isReloading}
              className="h-8 w-8 p-0"
            >
              {isReloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              onClick={async () => {
                await performSyncForAllAccounts();
              }}
              size="sm"
              variant="outline"
              disabled={syncingId !== null}
              className="h-8"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("tradovateSync.multiAccount.syncAll")}
            </Button>
            <Button
              onClick={handleStartOAuth}
              disabled={isLoading}
              size="sm"
              className="h-8"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t("tradovateSync.multiAccount.addNew")}
            </Button>
          </div>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("tradovateSync.multiAccount.accountName")}
              </TableHead>
              <TableHead>
                {t("tradovateSync.multiAccount.environment")}
              </TableHead>
              <TableHead>{t("tradovateSync.multiAccount.lastSync")}</TableHead>
              <TableHead>
                {t("tradovateSync.multiAccount.tokenStatus")}
              </TableHead>
              <TableHead>{t("tradovateSync.multiAccount.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.accountId}>
                <TableCell className="font-medium">
                  {account.accountId}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      account.environment === "live"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    }`}
                  >
                    {account.environment}
                  </span>
                </TableCell>
                <TableCell>{formatDate(account.lastSyncedAt)}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      account.isExpired
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    }`}
                  >
                    {account.isExpired
                      ? t("tradovateSync.multiAccount.expired")
                      : t("tradovateSync.multiAccount.valid")}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await performSyncForAccount(account.accountId);
                      }}
                      disabled={syncingId !== null || account.isExpired}
                    >
                      {syncingId === account.accountId ? (
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
                            className="justify-start text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedAccountId(account.accountId);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("tradovateSync.multiAccount.delete")}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-6"
                >
                  {t("tradovateSync.multiAccount.noSavedAccounts")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("tradovateSync.multiAccount.deleteAccount")}
            </DialogTitle>
            <DialogDescription>
              {t("tradovateSync.multiAccount.deleteAccountConfirm", {
                accountId: selectedAccountId,
              })}
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
                selectedAccountId && handleDelete(selectedAccountId)
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
