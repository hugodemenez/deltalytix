"use client";

import { useCallback, useState } from "react";
import { Loader2, Trash2, Plus, RefreshCw, MoreVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/locales/client";
import { toast } from "sonner";
import { authenticateIg } from "./actions";
import { useIgSyncContext } from "@/context/ig-sync-context";
import { captureConnectionCreated } from "@/lib/connection-analytics";
import type { IgApiEnvironment } from "@/lib/ig-api/types";
import { IgApiKeyFieldHelp, IgConnectIntro, IgFaq } from "./ig-faq";

const fieldClassName =
  "h-11 rounded-sm border-black/10 bg-transparent text-sm shadow-none focus-visible:border-black/30 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:focus-visible:border-white/30";

export function IgCredentialsManager() {
  const {
    performSyncForAccount,
    performSyncForAllAccounts,
    isAutoSyncing,
    isAccountSyncing,
    accounts,
    deleteAccount,
    loadAccounts,
  } = useIgSyncContext();

  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState<IgApiEnvironment>("live");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [actionsMenuAccountId, setActionsMenuAccountId] = useState<
    string | null
  >(null);
  const t = useI18n();
  const todayUtc = new Date().toISOString().slice(0, 10);

  const handleRemoveConnection = useCallback(
    async (accountId: string) => {
      try {
        await deleteAccount(accountId);
        setIsRemoveDialogOpen(false);
        toast.success(
          t("igSync.multiAccount.connectionRemoved", { accountId }),
        );
      } catch (error) {
        toast.error(t("igSync.multiAccount.removeError", { accountId }));
        console.error("Remove connection error:", error);
      }
    },
    [t, deleteAccount],
  );

  const handleAddAccount = useCallback(async () => {
    if (!identifier || !password || !apiKey || !historyStartDate) {
      toast.error(t("igSync.error.credentialsRequired"));
      return;
    }

    const connectedIdentifier = identifier.trim();
    try {
      setIsLoading(true);
      const result = await authenticateIg(
        connectedIdentifier,
        password,
        apiKey,
        environment,
        historyStartDate,
      );

      if ("error" in result && result.error) {
        const translate = t as (
          key: string,
          params?: Record<string, string | number>,
        ) => string;
        toast.error(
          translate(`igSync.errors.${result.error}`, {
            ...(result.errorParams ?? {}),
          }),
        );
        return;
      }

      toast.success(t("igSync.connected"));
      captureConnectionCreated("ig");
      setIsAddDialogOpen(false);
      setIdentifier("");
      setPassword("");
      setApiKey("");
      setHistoryStartDate("");
      await loadAccounts();
      void performSyncForAccount(connectedIdentifier);
    } catch (error) {
      console.error("IG add account error:", error);
      toast.error(t("igSync.error.authFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [
    identifier,
    password,
    apiKey,
    environment,
    historyStartDate,
    t,
    loadAccounts,
    performSyncForAccount,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsAddDialogOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-black/20 px-3 text-sm font-medium transition-colors duration-150 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          {t("igSync.addAccount.connect")}
        </button>
        <button
          type="button"
          disabled={isAutoSyncing || accounts.length === 0}
          onClick={() => void performSyncForAllAccounts()}
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-black/20 px-3 text-sm font-medium transition-colors duration-150 hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/5"
        >
          {isAutoSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
          )}
          {t("igSync.multiAccount.syncAll")}
        </button>
        <button
          type="button"
          disabled={isReloading}
          onClick={async () => {
            setIsReloading(true);
            try {
              await loadAccounts();
              toast.success(t("igSync.multiAccount.accountsReloaded"));
            } catch {
              toast.error(t("igSync.multiAccount.reloadError"));
            } finally {
              setIsReloading(false);
            }
          }}
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-black/20 px-3 text-sm font-medium transition-colors duration-150 hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/5"
        >
          {isReloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-black/45 dark:text-white/45">
          {t("igSync.multiAccount.empty")}
        </p>
      ) : (
        <Accordion type="multiple" className="w-full">
          {accounts.map((account) => {
            const syncing = isAccountSyncing(account.accountId);
            return (
              <AccordionItem
                key={account.id}
                value={account.accountId}
                className="border-black/10 dark:border-white/10"
              >
                <div className="flex items-center gap-2">
                  <AccordionTrigger className="flex-1 py-3 text-sm hover:no-underline">
                    <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                      <span className="truncate font-medium">
                        {account.identifier || account.accountId}
                      </span>
                      <span className="text-xs font-normal text-black/45 dark:text-white/45">
                        {account.environment === "demo"
                          ? t("igSync.addAccount.environmentDemo")
                          : t("igSync.addAccount.environmentLive")}
                        {" · "}
                        {account.accountNumbers.length}{" "}
                        {t("igSync.multiAccount.accountsCount")}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <Popover
                    open={actionsMenuAccountId === account.accountId}
                    onOpenChange={(open) =>
                      setActionsMenuAccountId(open ? account.accountId : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/5"
                        aria-label={t("igSync.multiAccount.syncNow")}
                      >
                        <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-40 rounded-sm border-black/10 p-1 shadow-none dark:border-white/10"
                    >
                      <button
                        type="button"
                        disabled={syncing}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/5"
                        onClick={() => {
                          setActionsMenuAccountId(null);
                          void performSyncForAccount(account.accountId);
                        }}
                      >
                        {syncing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                        {t("igSync.multiAccount.syncNow")}
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-black/5 dark:text-red-400 dark:hover:bg-white/5"
                        onClick={() => {
                          setActionsMenuAccountId(null);
                          setSelectedAccountId(account.accountId);
                          setIsRemoveDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {t("igSync.multiAccount.remove")}
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
                <AccordionContent>
                  <p className="pb-2 text-xs text-black/45 dark:text-white/45">
                    {t("igSync.multiAccount.lastSynced")}:{" "}
                    {account.lastSyncedAt.toLocaleString()}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {account.accountNumbers.map((number) => (
                      <li key={number} className="tabular-nums">
                        {number}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("igSync.addAccount.title")}</DialogTitle>
            <DialogDescription>
              {t("igSync.addAccount.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <IgConnectIntro />
            <div className="space-y-2">
              <Label htmlFor="ig-mgr-environment">
                {t("igSync.addAccount.environmentLabel")}
              </Label>
              <Select
                value={environment}
                onValueChange={(value) =>
                  setEnvironment(value as IgApiEnvironment)
                }
              >
                <SelectTrigger id="ig-mgr-environment" className={fieldClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">
                    {t("igSync.addAccount.environmentLive")}
                  </SelectItem>
                  <SelectItem value="demo">
                    {t("igSync.addAccount.environmentDemo")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig-mgr-identifier">
                {t("igSync.addAccount.usernameLabel")}
              </Label>
              <Input
                id="ig-mgr-identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={fieldClassName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig-mgr-password">
                {t("igSync.addAccount.passwordLabel")}
              </Label>
              <Input
                id="ig-mgr-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClassName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig-mgr-api-key">
                {t("igSync.addAccount.apiKeyLabel")}
              </Label>
              <Input
                id="ig-mgr-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={fieldClassName}
              />
              <IgApiKeyFieldHelp />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig-mgr-history-start">
                {t("igSync.addAccount.historyStartLabel")}
              </Label>
              <Input
                id="ig-mgr-history-start"
                type="date"
                value={historyStartDate}
                onChange={(e) => setHistoryStartDate(e.target.value)}
                min="2010-01-01"
                max={todayUtc}
                className={fieldClassName}
              />
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleAddAccount()}
              className="inline-flex h-11 w-full items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("igSync.addAccount.connect")
              )}
            </button>

            <IgFaq />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="rounded-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("igSync.multiAccount.removeTitle")}</DialogTitle>
            <DialogDescription>
              {t("igSync.multiAccount.removeDescription", {
                accountId: selectedAccountId ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-sm border border-black/20 px-3 text-sm dark:border-white/20"
              onClick={() => setIsRemoveDialogOpen(false)}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-sm bg-red-600 px-3 text-sm text-white"
              onClick={() => {
                if (selectedAccountId) {
                  void handleRemoveConnection(selectedAccountId);
                }
              }}
            >
              {t("igSync.multiAccount.remove")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
