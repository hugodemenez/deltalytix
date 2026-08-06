"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/locales/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeAwareLogo } from "@/components/monochrome-logo";
import { captureConnectionCreated } from "@/lib/connection-analytics";
import { useIgSyncContext } from "@/context/ig-sync-context";
import { toast } from "sonner";
import { authenticateIg } from "./actions";
import { IgCredentialsManager } from "./ig-credentials-manager";
import { IgApiKeyFieldHelp, IgConnectIntro, IgFaq } from "./ig-faq";
import type { IgApiEnvironment } from "@/lib/ig-api/types";

const fieldClassName =
  "h-11 rounded-sm border-black/10 bg-transparent text-sm shadow-none focus-visible:border-black/30 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:focus-visible:border-white/30";

const configSelectClassName =
  "h-8 w-auto min-w-0 max-w-full gap-1 rounded-sm border-black/10 bg-transparent px-2 text-xs shadow-none focus:ring-0 focus:ring-offset-0 dark:border-white/10 [&>span]:truncate";

const selectContentClassName =
  "rounded-sm border-black/10 bg-white shadow-none dark:border-white/10 dark:bg-black";

const primaryButtonClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]";

function IgConnectView({
  onConnected,
  initialUsername,
}: {
  onConnected?: () => void;
  initialUsername?: string;
}) {
  const t = useI18n();
  const { loadAccounts, performSyncForAccount } = useIgSyncContext();
  const [identifier, setIdentifier] = useState(initialUsername ?? "");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState<IgApiEnvironment>("live");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const todayUtc = new Date().toISOString().slice(0, 10);

  const handleConnect = useCallback(async () => {
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
      setIdentifier("");
      setPassword("");
      setApiKey("");
      setHistoryStartDate("");
      await loadAccounts();
      onConnected?.();
      void performSyncForAccount(connectedIdentifier);
    } catch (error) {
      console.error("IG connect error:", error);
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
    onConnected,
  ]);

  return (
    <form
      className="flex flex-col space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void handleConnect();
      }}
      autoComplete="on"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-black/10 pb-3 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-2">
          <Label
            htmlFor="ig-environment"
            className="shrink-0 text-xs text-black/45 dark:text-white/45"
          >
            {t("igSync.addAccount.environmentLabel")}
          </Label>
          <Select
            value={environment}
            onValueChange={(value) =>
              setEnvironment(value as IgApiEnvironment)
            }
          >
            <SelectTrigger id="ig-environment" className={configSelectClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={selectContentClassName}>
              <SelectItem value="live" className="rounded-sm text-xs">
                {t("igSync.addAccount.environmentLive")}
              </SelectItem>
              <SelectItem value="demo" className="rounded-sm text-xs">
                {t("igSync.addAccount.environmentDemo")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <IgConnectIntro />

      <div className="space-y-2">
        <Label
          htmlFor="ig-identifier"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t("igSync.addAccount.usernameLabel")}
        </Label>
        <Input
          id="ig-identifier"
          name="username"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          spellCheck={false}
          required
          className={fieldClassName}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="ig-password"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t("igSync.addAccount.passwordLabel")}
        </Label>
        <Input
          id="ig-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={fieldClassName}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="ig-api-key"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t("igSync.addAccount.apiKeyLabel")}
        </Label>
        <Input
          id="ig-api-key"
          name="apiKey"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          spellCheck={false}
          required
          className={fieldClassName}
        />
        <IgApiKeyFieldHelp />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="ig-history-start"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t("igSync.addAccount.historyStartLabel")}
        </Label>
        <Input
          id="ig-history-start"
          name="historyStartDate"
          type="date"
          value={historyStartDate}
          onChange={(e) => setHistoryStartDate(e.target.value)}
          min="2010-01-01"
          max={todayUtc}
          required
          className={fieldClassName}
        />
        <p className="text-xs leading-relaxed text-black/45 dark:text-white/45">
          {t("igSync.addAccount.historyStartHelp")}
        </p>
      </div>

      <button
        type="submit"
        disabled={
          isLoading || !identifier || !password || !apiKey || !historyStartDate
        }
        className={primaryButtonClassName}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("igSync.addAccount.connecting")}
          </>
        ) : (
          t("igSync.addAccount.connect")
        )}
      </button>

      <IgFaq />
    </form>
  );
}

interface IgSyncProps {
  initialShowAccountsManager?: boolean;
  initialUsername?: string;
  onConnected?: () => void;
  setIsOpen?: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void);
}

export function IgSync({
  initialShowAccountsManager = true,
  initialUsername,
  onConnected,
  setIsOpen: _setIsOpen,
}: IgSyncProps = {}) {
  const t = useI18n();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        {!initialShowAccountsManager ? (
          <IgConnectView
            onConnected={onConnected}
            initialUsername={initialUsername}
          />
        ) : (
          <>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h2 className="text-xl font-normal tracking-tight md:text-2xl">
                {t("igSync.title")}
              </h2>
              <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
                {t("igSync.description")}
              </p>
            </div>
            <IgCredentialsManager />
          </>
        )}
      </div>
      <div className="shrink-0 space-y-2 border-t border-black/10 pt-4 text-xs leading-relaxed text-black/45 dark:border-white/10 dark:text-white/45">
        <ThemeAwareLogo
          path="/logos/monochrome/ig-black.svg"
          darkPath="/logos/monochrome/ig-white.svg"
          alt="IG"
          size={28}
          className="h-7 w-auto"
        />
      </div>
    </div>
  );
}
