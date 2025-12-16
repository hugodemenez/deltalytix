"use client";

import { createContext, useContext, useMemo, useCallback, ReactNode } from "react";
import {
  RithmicSyncContextProvider,
  useRithmicSyncContext,
} from "@/context/rithmic-sync-context";
import {
  TradovateSyncContextProvider,
  useTradovateSyncContext,
} from "@/context/tradovate-sync-context";

type SyncService = "rithmic" | "tradovate";

interface ManualSyncResult {
  service: SyncService;
  success: boolean;
  message: string;
  rateLimited?: boolean;
}

interface SyncContextValue {
  rithmic: ReturnType<typeof useRithmicSyncContext>;
  tradovate: ReturnType<typeof useTradovateSyncContext>;
  manualSync: (
    service: SyncService,
    identifier: string
  ) => Promise<ManualSyncResult | undefined>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

function SyncContextBridge({ children }: { children: ReactNode }) {
  const rithmic = useRithmicSyncContext();
  const tradovate = useTradovateSyncContext();

  const manualSync = useCallback<SyncContextValue["manualSync"]>(
    async (service, identifier) => {
      if (service === "rithmic") {
        const result = await rithmic.performSyncForCredential(identifier);
        if (!result) return;

        return {
          service,
          success: result.success,
          message: result.message,
          rateLimited: result.rateLimited,
        };
      }

      const result = await tradovate.performSyncForAccount(identifier);
      if (!result) return;

      return {
        service,
        success: result.success,
        message: result.message,
      };
    },
    [rithmic, tradovate]
  );

  const value = useMemo(
    () => ({
      rithmic,
      tradovate,
      manualSync,
    }),
    [manualSync, rithmic, tradovate]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function SyncContextProvider({ children }: { children: ReactNode }) {
  return (
    <RithmicSyncContextProvider>
      <TradovateSyncContextProvider>
        <SyncContextBridge>{children}</SyncContextBridge>
      </TradovateSyncContextProvider>
    </RithmicSyncContextProvider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext must be used within a SyncContextProvider");
  }
  return context;
}