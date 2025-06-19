// CRON JOB RUNNING EVERY WEEK

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, subWeeks, parseISO, format } from "date-fns";

// PURPOSE:
// - Compute MAE and MFE for all trades of the week
// - Group trades by instruments
// - Get earliest trade date for each instrument
// - Get latest trade date for each instrument
// - Get the data from Databento
// - Save the data in database for later use

// Compute MAE and MFE for all trades
// Based on the entry date (entry price check (it shouldn't differ from the data from Databento))
// If price is different we might have an issue with either the trade date or from the data from Databento
// What could be issues: 
// - Broker data is not up to date
// - Databento data is not up to date
// - Missmatch in timezones between broker and Databento

interface DatabentoBars {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradeWithMAEMFE {
  id: string;
  instrument: string;
  entryPrice: number;
  closePrice: number;
  entryDate: Date;
  closeDate: Date;
  side: string;
  quantity: number;
  mae: number; // Maximum Adverse Excursion
  mfe: number; // Maximum Favorable Excursion
  entryPriceFromData: number; // Actual price from Databento at entry time
  priceDifference: number; // Difference between reported entry price and market data
}

interface InstrumentData {
  instrument: string;
  trades: any[];
  earliestDate: Date;
  latestDate: Date;
}

// Databento API configuration
const DATABENTO_API_KEY = process.env.DATABENTO_API_KEY;
const DATABENTO_BASE_URL = 'https://hist.databento.com/v0';

// Databento symbol mapping for futures
const FUTURES_SYMBOL_MAP: { [key: string]: string } = {
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

async function fetchDatabentoBars(
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

function calculateMAEMFE(
  trade: any,
  historicalBars: DatabentoBars[]
): { mae: number; mfe: number; entryPriceFromData: number; priceDifference: number } {
  const entryPrice = parseFloat(trade.entryPrice);
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
    return { mae: 0, mfe: 0, entryPriceFromData, priceDifference };
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
  
  return {
    mae: maxAdverse,
    mfe: maxFavorable,
    entryPriceFromData,
    priceDifference
  };
}

async function processInstrumentTrades(instrumentData: InstrumentData): Promise<TradeWithMAEMFE[]> {
  const { instrument, trades, earliestDate, latestDate } = instrumentData;
  
  try {
    // Format dates for Databento API (YYYY-MM-DD)
    const startDateStr = format(earliestDate, 'yyyy-MM-dd');
    const endDateStr = format(latestDate, 'yyyy-MM-dd');
    
    console.log(`Fetching data for ${instrument} from ${startDateStr} to ${endDateStr}`);
    
    // Fetch historical data from Databento
    const historicalBars = await fetchDatabentoBars(instrument, startDateStr, endDateStr);
    
    console.log(`Retrieved ${historicalBars.length} bars for ${instrument}`);
    
    // Calculate MAE/MFE for each trade
    const processedTrades: TradeWithMAEMFE[] = trades.map(trade => {
      const { mae, mfe, entryPriceFromData, priceDifference } = calculateMAEMFE(trade, historicalBars);
      
      return {
        id: trade.id,
        instrument: trade.instrument,
        entryPrice: parseFloat(trade.entryPrice),
        closePrice: parseFloat(trade.closePrice),
        entryDate: new Date(trade.entryDate),
        closeDate: new Date(trade.closeDate),
        side: trade.side,
        quantity: trade.quantity,
        mae,
        mfe,
        entryPriceFromData,
        priceDifference
      };
    });
    
    return processedTrades;
  } catch (error) {
    console.error(`Error processing ${instrument}:`, error);
    return trades.map(trade => ({
      id: trade.id,
      instrument: trade.instrument,
      entryPrice: parseFloat(trade.entryPrice),
      closePrice: parseFloat(trade.closePrice),
      entryDate: new Date(trade.entryDate),
      closeDate: new Date(trade.closeDate),
      side: trade.side,
      quantity: trade.quantity,
      mae: 0,
      mfe: 0,
      entryPriceFromData: parseFloat(trade.entryPrice),
      priceDifference: 0
    }));
  }
}

export async function GET() {
  try {
    console.log('Starting MAE/MFE computation cron job');
    
    if (!DATABENTO_API_KEY) {
      throw new Error('DATABENTO_API_KEY environment variable is required');
    }
    
    // Get the date range for last week
    const now = new Date();
    const lastWeekStart = startOfWeek(subWeeks(now, 1));
    const lastWeekEnd = endOfWeek(subWeeks(now, 1));
    
    console.log(`Processing trades from ${format(lastWeekStart, 'yyyy-MM-dd')} to ${format(lastWeekEnd, 'yyyy-MM-dd')}`);
    
    // Fetch all trades from last week
    const trades = await prisma.trade.findMany({
      where: {
        entryDate: {
          gte: lastWeekStart.toISOString(),
          lte: lastWeekEnd.toISOString()
        }
      },
      orderBy: {
        entryDate: 'asc'
      }
    });
    
    console.log(`Found ${trades.length} trades to process`);
    
    if (trades.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No trades found for the specified period',
        processed: 0
      });
    }
    
    // Group trades by instrument
    const instrumentGroups = trades.reduce((acc, trade) => {
      const instrument = trade.instrument;
      if (!acc[instrument]) {
        acc[instrument] = {
          instrument,
          trades: [],
          earliestDate: new Date(trade.entryDate),
          latestDate: new Date(trade.closeDate)
        };
      }
      
      acc[instrument].trades.push(trade);
      
      // Update date range
      const entryDate = new Date(trade.entryDate);
      const closeDate = new Date(trade.closeDate);
      
      if (entryDate < acc[instrument].earliestDate) {
        acc[instrument].earliestDate = entryDate;
      }
      if (closeDate > acc[instrument].latestDate) {
        acc[instrument].latestDate = closeDate;
      }
      
      return acc;
    }, {} as { [key: string]: InstrumentData });
    
    console.log(`Processing ${Object.keys(instrumentGroups).length} unique instruments`);
    
    // Process each instrument group
    const allProcessedTrades: TradeWithMAEMFE[] = [];
    
    for (const instrumentData of Object.values(instrumentGroups)) {
      const processedTrades = await processInstrumentTrades(instrumentData);
      allProcessedTrades.push(...processedTrades);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Save the MAE/MFE data to database
    console.log(`Successfully processed ${allProcessedTrades.length} trades, saving to database...`);
    
    const savedAnalytics = await Promise.allSettled(
      allProcessedTrades.map(async (trade) => {
        // Calculate additional metrics
        const riskRewardRatio = trade.mae > 0 ? trade.mfe / trade.mae : 0;
        const efficiency = trade.mfe > 0 ? (Math.abs(trade.closePrice - trade.entryPrice) / trade.mfe) * 100 : 0;
        
        return prisma.tradeAnalytics.upsert({
          where: { tradeId: trade.id },
          update: {
            mae: trade.mae,
            mfe: trade.mfe,
            entryPriceFromData: trade.entryPriceFromData,
            priceDifference: trade.priceDifference,
            riskRewardRatio,
            efficiency,
            updatedAt: new Date()
          },
          create: {
            tradeId: trade.id,
            mae: trade.mae,
            mfe: trade.mfe,
            entryPriceFromData: trade.entryPriceFromData,
            priceDifference: trade.priceDifference,
            riskRewardRatio,
            efficiency
          }
        });
      })
    );
    
    const successfulSaves = savedAnalytics.filter(result => result.status === 'fulfilled').length;
    const failedSaves = savedAnalytics.filter(result => result.status === 'rejected').length;
    
    console.log(`Saved ${successfulSaves} trade analytics, ${failedSaves} failed`);
    
    // Example of potential data issues to log
    const priceDiscrepancies = allProcessedTrades.filter(trade => trade.priceDifference > 0.5);
    if (priceDiscrepancies.length > 0) {
      console.warn(`Found ${priceDiscrepancies.length} trades with significant price discrepancies`);
    }
    
         return NextResponse.json({
       success: true,
       message: `Successfully computed MAE/MFE for ${allProcessedTrades.length} trades`,
       processed: allProcessedTrades.length,
       saved: successfulSaves,
       failed: failedSaves,
       instruments: Object.keys(instrumentGroups),
       priceDiscrepancies: priceDiscrepancies.length,
       data: allProcessedTrades.slice(0, 5), // Return first 5 as sample
       summary: {
         averageMAE: allProcessedTrades.reduce((sum, t) => sum + t.mae, 0) / allProcessedTrades.length,
         averageMFE: allProcessedTrades.reduce((sum, t) => sum + t.mfe, 0) / allProcessedTrades.length,
         maxMAE: Math.max(...allProcessedTrades.map(t => t.mae)),
         maxMFE: Math.max(...allProcessedTrades.map(t => t.mfe)),
         averageRiskReward: allProcessedTrades
           .filter(t => t.mae > 0)
           .reduce((sum, t) => sum + (t.mfe / t.mae), 0) / allProcessedTrades.filter(t => t.mae > 0).length || 0
       }
     }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
    
  } catch (error) {
    console.error('Error in MAE/MFE computation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      processed: 0
    }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
}