import { NextResponse } from "next/server";
import { 
  fetchDatabentoBars, 
  calculateMAEMFE, 
  getExampleTrade, 
  getExampleTickDetails,
  type TradeData,
  type DatabentoBars
} from "@/lib/databento";
import { format, subDays } from "date-fns";

// Test endpoint to demonstrate MAE/MFE calculation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const useRealData = searchParams.get('real') === 'true';
    
    if (!useRealData) {
      // Return example with mock data
      const exampleTrade = getExampleTrade();
      const exampleTickDetails = getExampleTickDetails();
      
      // Create mock historical data for demonstration
      const mockBars: DatabentoBars[] = [
        {
          symbol: "ES.FUT.CME",
          timestamp: "2024-01-15T09:30:00.000Z",
          open: 4500.50,
          high: 4502.00,
          low: 4499.75,
          close: 4500.75,
          volume: 1500
        },
        {
          symbol: "ES.FUT.CME", 
          timestamp: "2024-01-15T09:35:00.000Z",
          open: 4500.75,
          high: 4515.25, // This is our MFE
          low: 4497.50,  // This contributes to MAE
          close: 4505.00,
          volume: 2100
        },
        {
          symbol: "ES.FUT.CME",
          timestamp: "2024-01-15T10:00:00.000Z", 
          open: 4505.00,
          high: 4512.75,
          low: 4495.25,  // This is our MAE (4500.75 - 4495.25 = 5.5 points)
          close: 4508.50,
          volume: 1800
        },
        {
          symbol: "ES.FUT.CME",
          timestamp: "2024-01-15T10:15:00.000Z",
          open: 4508.50,
          high: 4511.00,
          low: 4507.25,
          close: 4510.25, // Close price matches our example
          volume: 1200
        }
      ];
      
      const result = calculateMAEMFE(exampleTrade, mockBars);
      
      // Calculate monetary values using tick details
      const maeInDollars = (result.mae / exampleTickDetails.tickSize) * exampleTickDetails.tickValue;
      const mfeInDollars = (result.mfe / exampleTickDetails.tickSize) * exampleTickDetails.tickValue;
      
      return NextResponse.json({
        success: true,
        mode: "mock_data",
        trade: exampleTrade,
        tickDetails: exampleTickDetails,
        historicalBars: mockBars,
        results: {
          ...result,
          maeInDollars,
          mfeInDollars,
          explanation: {
            mae: `Maximum loss during trade: ${result.mae} points = $${maeInDollars.toFixed(2)}`,
            mfe: `Maximum profit potential during trade: ${result.mfe} points = $${mfeInDollars.toFixed(2)}`,
            efficiency: `Captured ${result.efficiency.toFixed(1)}% of the maximum favorable move`,
            riskReward: `Risk/Reward ratio: ${result.riskRewardRatio.toFixed(2)}:1`
          }
        }
      });
    }
    
    // Use real Databento data (requires API key)
    const symbol = searchParams.get('symbol') || 'ES';
    const endDate = new Date();
    const startDate = subDays(endDate, 1); // Get yesterday's data
    
    try {
      console.log(`Fetching real data for ${symbol}...`);
      
      const historicalBars = await fetchDatabentoBars(
        symbol,
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );
      
      // Create a sample trade using the first and last bars
      if (historicalBars.length < 2) {
        throw new Error('Not enough historical data available');
      }
      
      const firstBar = historicalBars[0];
      const lastBar = historicalBars[historicalBars.length - 1];
      
      const sampleTrade: TradeData = {
        id: "real-data-test",
        instrument: symbol,
        entryPrice: firstBar.close.toString(),
        closePrice: lastBar.close.toString(),
        entryDate: firstBar.timestamp,
        closeDate: lastBar.timestamp,
        side: "BUY",
        quantity: 1
      };
      
      const result = calculateMAEMFE(sampleTrade, historicalBars);
      
      return NextResponse.json({
        success: true,
        mode: "real_data",
        symbol,
        barsRetrieved: historicalBars.length,
        dateRange: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd')
        },
        sampleTrade,
        results: result,
        firstFewBars: historicalBars.slice(0, 3), // Show first 3 bars as sample
        lastFewBars: historicalBars.slice(-3) // Show last 3 bars as sample
      });
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        mode: "real_data_failed",
        error: error instanceof Error ? error.message : "Unknown error",
        fallbackToMock: "Set ?real=false to see mock example"
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error in MAE/MFE test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Also provide a POST endpoint for testing custom trade data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trade, mockBars } = body as { 
      trade: TradeData, 
      mockBars?: DatabentoBars[] 
    };
    
    if (!trade || !trade.instrument || !trade.entryPrice || !trade.closePrice) {
      return NextResponse.json({
        success: false,
        error: 'Invalid trade data. Required fields: instrument, entryPrice, closePrice, entryDate, closeDate, side, quantity'
      }, { status: 400 });
    }
    
    let historicalBars: DatabentoBars[];
    
    if (mockBars && mockBars.length > 0) {
      // Use provided mock data
      historicalBars = mockBars;
    } else {
      // Fetch real data from Databento
      const startDate = format(new Date(trade.entryDate), 'yyyy-MM-dd');
      const endDate = format(new Date(trade.closeDate), 'yyyy-MM-dd');
      
      historicalBars = await fetchDatabentoBars(trade.instrument, startDate, endDate);
    }
    
    const result = calculateMAEMFE(trade, historicalBars);
    
    return NextResponse.json({
      success: true,
      trade,
      barsUsed: historicalBars.length,
      results: result
    });
    
  } catch (error) {
    console.error('Error in MAE/MFE calculation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 