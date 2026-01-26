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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/locales/client";
import { toast } from "sonner";
import {
  initiateTradovateOAuth,
  updateDailySyncTimeAction,
} from "./actions";
import { useTradovateSyncStore } from "@/store/tradovate-sync-store";
import { useData } from "@/context/data-provider";
import { useSyncContext } from "@/context/sync-context";

export function TradovateCredentialsManager() {
  const { tradovate } = useSyncContext();
  const {
    performSyncForAccount,
    performSyncForAllAccounts,
    accounts,
    deleteAccount,
    loadAccounts,
  } = tradovate;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [dailySyncTime, setDailySyncTime] = useState<string>("");
  const [isSavingTime, setIsSavingTime] = useState(false);
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

  const handleStartOAuth = useCallback(async (accountId: string = "default") => {
    try {
      setIsLoading(true);
      const result = await initiateTradovateOAuth(accountId);
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

  const handleSetDailySyncTime = useCallback((accountId: string, currentTime: Date | null) => {
    setSelectedAccountId(accountId);
    if (currentTime) {
      // Convert UTC time to local time for display
      const utcDate = new Date(currentTime);
      const localHours = utcDate.getHours().toString().padStart(2, '0');
      const localMinutes = utcDate.getMinutes().toString().padStart(2, '0');
      setDailySyncTime(`${localHours}:${localMinutes}`);
    } else {
      setDailySyncTime("");
    }
    setIsTimeDialogOpen(true);
  }, []);

  const handleSaveDailySyncTime = useCallback(async () => {
    if (!selectedAccountId) return;
    
    try {
      setIsSavingTime(true);
      
      // Convert local time to UTC on client side
      let utcTimeString: string | null = null;
      if (dailySyncTime) {
        const [hours, minutes] = dailySyncTime.split(':').map(Number);
        const localDate = new Date();
        localDate.setHours(hours, minutes, 0, 0);
        utcTimeString = localDate.toISOString();
      }
      
      const result = await updateDailySyncTimeAction(
        selectedAccountId,
        utcTimeString
      );
      
      if (result.success) {
        toast.success(t("tradovateSync.multiAccount.dailySyncTimeUpdated"));
        setIsTimeDialogOpen(false);
        await loadAccounts(); // Reload to show updated time
      } else {
        toast.error(
          result.error || t("tradovateSync.multiAccount.dailySyncTimeUpdateError"),
        );
      }
    } catch (error) {
      toast.error(t("tradovateSync.multiAccount.dailySyncTimeUpdateError"));
      console.error("Update sync time error:", error);
    } finally {
      setIsSavingTime(false);
    }
  }, [selectedAccountId, dailySyncTime, loadAccounts, t]);

  const handlePresetTime = useCallback((preset: string) => {
    let hours: number;
    let minutes: number;
    
    switch (preset) {
      case 'midday':
        hours = 12;
        minutes = 0;
        break;
      case 'after-close':
        // 22:00 UTC = 4:00 PM EST / 10:00 PM CET (after US market close)
        // Convert to local time
        const utcClose = new Date();
        utcClose.setUTCHours(22, 0, 0, 0);
        hours = utcClose.getHours();
        minutes = utcClose.getMinutes();
        break;
      case 'midnight':
        hours = 0;
        minutes = 0;
        break;
      case 'morning':
        hours = 8;
        minutes = 0;
        break;
      default:
        return;
    }
    
    setDailySyncTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  }, []);

  function formatSyncTime(date: Date | null) {
    if (!date) return t("tradovateSync.multiAccount.dailySyncTimeNotSet");
    
    // The date from DB is stored with UTC hours/minutes
    // We need to create a proper UTC date and convert to local
    const utcDate = new Date(date);
    const localHours = utcDate.getHours().toString().padStart(2, '0');
    const localMinutes = utcDate.getMinutes().toString().padStart(2, '0');
    
    // Get timezone abbreviation
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const formatter = new Intl.DateTimeFormat('en-US', { 
      timeZone, 
      timeZoneName: 'short' 
    });
    const parts = formatter.formatToParts(new Date());
    const tzName = parts.find(part => part.type === 'timeZoneName')?.value || '';
    
    return `${localHours}:${localMinutes} ${tzName}`;
  }

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
              onClick={() => handleStartOAuth()}
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
                {t("tradovateSync.multiAccount.dailySyncTimeLocal")}
              </TableHead>
              <TableHead>
                {t("tradovateSync.multiAccount.tokenStatus")}
              </TableHead>
              <TableHead>{t("tradovateSync.multiAccount.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => {
              const isExpired =
                !account.token ||
                (account.tokenExpiresAt
                  ? new Date(account.tokenExpiresAt).getTime() <= Date.now()
                  : false);

              return (
                <TableRow key={account.accountId}>
                <TableCell className="font-medium">
                  {account.accountId}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      false
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    }`}
                  >
                    {t("tradovateSync.multiAccount.environmentDemo")}
                  </span>
                </TableCell>
                <TableCell>{formatDate(account.lastSyncedAt.toISOString())}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDailySyncTime(account.accountId, account.dailySyncTime)}
                    className="text-xs"
                  >
                    {formatSyncTime(account.dailySyncTime)}
                  </Button>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      isExpired
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    }`}
                  >
                    {isExpired
                      ? t("tradovateSync.multiAccount.expired")
                      : t("tradovateSync.multiAccount.valid")}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center items-center gap-2">
                    {isExpired && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartOAuth(account.accountId)}
                        className="h-8"
                      >
                        {t("tradovateSync.multiAccount.reconnect")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await performSyncForAccount(account.accountId);
                      }}
                      disabled={syncingId !== null || isExpired}
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
            )})}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
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

      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("tradovateSync.multiAccount.dailySyncTimeTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("tradovateSync.multiAccount.dailySyncTimeDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="syncTime">
                {t("tradovateSync.multiAccount.dailySyncTimeLabel")}
              </Label>
              <Input
                id="syncTime"
                type="time"
                value={dailySyncTime}
                onChange={(e) => setDailySyncTime(e.target.value)}
                placeholder={t(
                  "tradovateSync.multiAccount.dailySyncTimePlaceholder",
                )}
              />
              <p className="text-sm text-muted-foreground">
                {t("tradovateSync.multiAccount.dailySyncTimeTimezoneNote", {
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>{t("tradovateSync.multiAccount.quickPresets")}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('morning')}
                >
                  {t("tradovateSync.multiAccount.presets.morning")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('midday')}
                >
                  {t("tradovateSync.multiAccount.presets.midday")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('after-close')}
                >
                  {t("tradovateSync.multiAccount.presets.afterClose")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('midnight')}
                >
                  {t("tradovateSync.multiAccount.presets.midnight")}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsTimeDialogOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSaveDailySyncTime}
                disabled={isSavingTime}
              >
                {isSavingTime ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("common.saving")}
                  </>
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
