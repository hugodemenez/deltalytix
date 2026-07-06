import { create } from "zustand";

// Chart data point shape from server (dynamic keys for account equities, payouts, etc.)
export type EquityChartDataPoint = {
  date: string;
  [key: `equity_${string}`]: number | undefined;
  equity?: number;
  dailyPnL?: number | undefined;
  dailyCommissions?: number | undefined;
  netPnL?: number | undefined;
  [key: `payout_${string}`]: boolean;
  [key: `reset_${string}`]: boolean;
  [key: `payoutStatus_${string}`]: string;
  [key: `payoutAmount_${string}`]: number;
};

export type EquityChartDataResult = {
  chartData: EquityChartDataPoint[];
  accountNumbers: string[];
};

type EquityChartDataStore = {
  chartData: EquityChartDataPoint[];
  accountNumbers: string[];
  isLoading: boolean;
  setData: (result: EquityChartDataResult) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
};

const initialState = {
  chartData: [] as EquityChartDataPoint[],
  accountNumbers: [] as string[],
};

export const useEquityChartDataStore = create<EquityChartDataStore>()((set) => ({
  ...initialState,
  isLoading: false,

  setData: (result) =>
    set({
      chartData: result.chartData,
      accountNumbers: result.accountNumbers,
    }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  reset: () => set({ ...initialState, isLoading: false }),
}));
