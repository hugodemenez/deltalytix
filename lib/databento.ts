import { format } from "date-fns";

// Databento API configuration
const DATABENTO_API_KEY = process.env.DATABENTO_API_KEY;
const DATABENTO_BASE_URL = 'https://hist.databento.com/v0';

export interface DatabentoBars {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeData {
  id: string;
  instrument: string;
  entryPrice: string;
  closePrice: string;
  entryDate: string;
  closeDate: string;
  side: string;
  quantity: number;
}

export interface MAEMFEResult {
  mae: number;
  mfe: number;
  entryPriceFromData: number;
  priceDifference: number;
  riskRewardRatio: number;
  efficiency: number;
}

// Databento symbol mapping for futures
export const FUTURES_SYMBOL_MAP: { [key: string]: string } = {
  // E-mini S&P 500
  'ES': 'ES.FUT.CME',
  'MES': 'MES.FUT.CME',
  
  // E-mini Nasdaq
  'NQ': 'NQ.FUT.CME',
  'MNQ': 'MNQ.FUT.CME',
  
  // E-mini Dow
  'YM': 'YM.FUT.CME',
  'MYM': 'MYM.FUT.CME',
  
  // E-mini Russell 2000
  'RTY': 'RTY.FUT.CME',
  'M2K': 'M2K.FUT.CME',
  
  // Crude Oil
  'CL': 'CL.FUT.NYMEX',
  'QM': 'QM.FUT.NYMEX',
  'MCL': 'MCL.FUT.NYMEX',
  
  // Natural Gas
  'NG': 'NG.FUT.NYMEX',
  'QG': 'QG.FUT.NYMEX',
  'MNG': 'MNG.FUT.NYMEX',
  
  // Gold
  'GC': 'GC.FUT.COMEX',
  'QO': 'QO.FUT.COMEX',
  'MGC': 'MGC.FUT.COMEX',
  
  // Silver
  'SI': 'SI.FUT.COMEX',
  'QI': 'QI.FUT.COMEX',
  'SIL': 'SIL.FUT.COMEX',
  
  // Copper
  'HG': 'HG.FUT.COMEX',
  'QC': 'QC.FUT.COMEX',
  'MHG': 'MHG.FUT.COMEX',
  
  // Bonds
  'ZB': 'ZB.FUT.CBOT',
  'ZN': 'ZN.FUT.CBOT',
  'ZF': 'ZF.FUT.CBOT',
  'ZT': 'ZT.FUT.CBOT',
  'UB': 'UB.FUT.CBOT',
  
  // Currencies
  '6E': '6E.FUT.CME', // Euro
  '6J': '6J.FUT.CME', // Japanese Yen
  '6B': '6B.FUT.CME', // British Pound
  '6A': '6A.FUT.CME', // Australian Dollar
  '6C': '6C.FUT.CME', // Canadian Dollar
  '6S': '6S.FUT.CME', // Swiss Franc
  'DX': 'DX.FUT.ICE', // Dollar Index
};

export async function fetchDatabentoBars(
  symbol: string, 
  startDate: string, 
  endDate: string,
  resolution: string = '1m'
): Promise<DatabentoBars[]> {
  if (!DATABENTO_API_KEY) {
    throw new Error('DATABENTO_API_KEY is not configured');
  }

  const databentSymbol = FUTURES_SYMBOL_MAP[symbol] || symbol;
  
  const params = new URLSearchParams({
    dataset: 'GLBX.MDP3', // CME Globex for futures
    symbols: databentSymbol,
    schema: 'ohlcv-1m', // 1-minute OHLCV bars
    start: startDate,
    end: endDate,
    stype_in: 'continuous', // Use continuous contracts
    encoding: 'json'
  });

  const response = await fetch(`${DATABENTO_BASE_URL}/timeseries.get_range?${params}`, {
    headers: {
      'Authorization': `Bearer ${DATABENTO_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Databento API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Transform Databento response to our format
  return data.map((bar: any) => ({
    symbol: databentSymbol,
    timestamp: new Date(bar.ts_event / 1000000).toISOString(), // Convert nanoseconds to milliseconds
    open: bar.open / 1000000000, // Convert from fixed-point
    high: bar.high / 1000000000,
    low: bar.low / 1000000000,
    close: bar.close / 1000000000,
    volume: bar.volume
  }));
}

export function calculateMAEMFE(
  trade: TradeData,
  historicalBars: DatabentoBars[]
): MAEMFEResult {
  const entryPrice = parseFloat(trade.entryPrice);
  const closePrice = parseFloat(trade.closePrice);
  const isLong = trade.side === 'BUY' || trade.side === 'LONG' || trade.quantity > 0;
  
  // Find entry price from historical data (closest to entry time)
  const entryTime = new Date(trade.entryDate);
  const entryBar = historicalBars.find(bar => {
    const barTime = new Date(bar.timestamp);
    return Math.abs(barTime.getTime() - entryTime.getTime()) < 60000; // Within 1 minute
  });
  
  const entryPriceFromData = entryBar ? entryBar.close : entryPrice;
  const priceDifference = Math.abs(entryPrice - entryPriceFromData);
  
  // Filter bars within the trade period
  const tradeStartTime = new Date(trade.entryDate);
  const tradeEndTime = new Date(trade.closeDate);
  
  const tradePeriodBars = historicalBars.filter(bar => {
    const barTime = new Date(bar.timestamp);
    return barTime >= tradeStartTime && barTime <= tradeEndTime;
  });
  
  if (tradePeriodBars.length === 0) {
    return { 
      mae: 0, 
      mfe: 0, 
      entryPriceFromData, 
      priceDifference,
      riskRewardRatio: 0,
      efficiency: 0
    };
  }
  
  let maxAdverse = 0; // MAE
  let maxFavorable = 0; // MFE
  
  tradePeriodBars.forEach(bar => {
    if (isLong) {
      // For long positions
      // MAE: How far below entry price did it go (adverse)
      const adverseMove = entryPrice - bar.low;
      if (adverseMove > maxAdverse) {
        maxAdverse = adverseMove;
      }
      
      // MFE: How far above entry price did it go (favorable)
      const favorableMove = bar.high - entryPrice;
      if (favorableMove > maxFavorable) {
        maxFavorable = favorableMove;
      }
    } else {
      // For short positions
      // MAE: How far above entry price did it go (adverse)
      const adverseMove = bar.high - entryPrice;
      if (adverseMove > maxAdverse) {
        maxAdverse = adverseMove;
      }
      
      // MFE: How far below entry price did it go (favorable)
      const favorableMove = entryPrice - bar.low;
      if (favorableMove > maxFavorable) {
        maxFavorable = favorableMove;
      }
    }
  });
  
  // Calculate additional metrics
  const riskRewardRatio = maxAdverse > 0 ? maxFavorable / maxAdverse : 0;
  const actualMove = Math.abs(closePrice - entryPrice);
  const efficiency = maxFavorable > 0 ? (actualMove / maxFavorable) * 100 : 0;
  
  return {
    mae: maxAdverse,
    mfe: maxFavorable,
    entryPriceFromData,
    priceDifference,
    riskRewardRatio,
    efficiency
  };
}

// Example usage with your trades and tick details
export function getExampleTrade(): TradeData {
  return {
    id: "example-trade-1",
    instrument: "ES", // E-mini S&P 500
    entryPrice: "4500.75",
    closePrice: "4510.25",
    entryDate: "2024-01-15T09:30:00.000Z",
    closeDate: "2024-01-15T10:15:00.000Z", 
    side: "BUY",
    quantity: 1
  };
}

export function getExampleTickDetails() {
  return {
    ticker: "ES",
    tickValue: 12.50, // $12.50 per tick
    tickSize: 0.25   // 0.25 points per tick
  };
} 