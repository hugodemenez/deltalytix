import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Type definitions matching the accounts-analysis component
type AccountMetrics = {
  accountNumber: string;
  netPnL: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  riskLevel: "low" | "medium" | "high";
  averageWin?: number;
  averageLoss?: number;
  largestWin?: number;
  largestLoss?: number;
  consecutiveWins?: number;
  consecutiveLosses?: number;
};

type AccountAnalysis = {
  accounts: AccountMetrics[];
  totalPortfolioValue: number;
  averageWinRate?: number;
  totalTrades?: number;
  overallProfitFactor?: number;
};

type AccountPerformanceData = {
  accounts: AccountMetrics[];
  totalPortfolioValue?: number;
  averageWinRate?: number;
  totalTrades?: number;
  overallProfitFactor?: number;
  bestPerformingAccount?: {
    accountNumber: string;
    netPnL: number;
    winRate: number;
  };
  worstPerformingAccount?: {
    accountNumber: string;
    netPnL: number;
    winRate: number;
  };
  portfolioRisk?: string;
};

type StructuredAnalysis = {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
};

type AnalysisResult = {
  locale: string;
  username?: string;
  generatedAt: string;
  structuredAnalysis: StructuredAnalysis;
  dataSummary: {
    totalAccounts: number;
    totalPortfolioValue: number;
    portfolioRisk: string;
    bestAccount: string;
    worstAccount: string;
  };
  error?: boolean;
};

type AnalysisStore = {
  // State
  accountPerformanceData: AccountPerformanceData | null;
  analysisResult: AnalysisResult | null;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAccountPerformanceData: (data: AccountPerformanceData | null) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateLastUpdated: () => void;
  clearAnalysis: () => void;

  // Helper methods
  hasValidData: () => boolean;
  getAccountByNumber: (accountNumber: string) => AccountMetrics | undefined;
  getBestPerformingAccount: () => AccountMetrics | undefined;
  getWorstPerformingAccount: () => AccountMetrics | undefined;
};

export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set, get) => ({
      // Initial state
      accountPerformanceData: null,
      analysisResult: null,
      lastUpdated: null,
      isLoading: false,
      error: null,

      // Actions
      setAccountPerformanceData: (data) => {
        set({
          accountPerformanceData: data,
          lastUpdated: data ? new Date() : get().lastUpdated,
          error: null,
        });
      },

      setAnalysisResult: (result) => {
        set({
          analysisResult: result,
          lastUpdated: result ? new Date() : get().lastUpdated,
          error: null,
        });
      },

      setIsLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error, isLoading: false });
      },

      updateLastUpdated: () => {
        set({ lastUpdated: new Date() });
      },

      clearAnalysis: () => {
        set({
          accountPerformanceData: null,
          analysisResult: null,
          lastUpdated: null,
          error: null,
          isLoading: false,
        });
      },

      // Helper methods
      hasValidData: () => {
        const state = get();
        return !!(
          state.accountPerformanceData?.accounts?.length || state.analysisResult
        );
      },

      getAccountByNumber: (accountNumber) => {
        const state = get();
        return state.accountPerformanceData?.accounts?.find(
          (account) => account.accountNumber === accountNumber,
        );
      },

      getBestPerformingAccount: () => {
        const state = get();
        if (!state.accountPerformanceData?.accounts?.length) return undefined;

        return state.accountPerformanceData.accounts.reduce((best, current) => {
          return current.netPnL > (best?.netPnL || -Infinity) ? current : best;
        }, state.accountPerformanceData.accounts[0]);
      },

      getWorstPerformingAccount: () => {
        const state = get();
        if (!state.accountPerformanceData?.accounts?.length) return undefined;

        return state.accountPerformanceData.accounts.reduce(
          (worst, current) => {
            return current.netPnL < (worst?.netPnL || Infinity)
              ? current
              : worst;
          },
          state.accountPerformanceData.accounts[0],
        );
      },
    }),
    {
      name: "deltalytix-analysis-store",
      storage: createJSONStorage(() => localStorage),
      // Persist all state except isLoading
      partialize: (state) => ({
        accountPerformanceData: state.accountPerformanceData,
        analysisResult: state.analysisResult,
        lastUpdated: state.lastUpdated,
        error: state.error,
      }),
      // Custom serialization for dates
      onRehydrateStorage: () => (state) => {
        if (state?.lastUpdated) {
          state.lastUpdated = new Date(state.lastUpdated);
        }
      },
    },
  ),
);

// Export types for use in components
export type {
  AccountMetrics,
  AccountAnalysis,
  AccountPerformanceData,
  StructuredAnalysis,
  AnalysisResult,
  AnalysisStore,
};
