'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Trade } from '@/prisma/generated/prisma/browser'
import { Input } from "@/components/ui/input"

interface ContractSpec {
  tickSize: number;
  tickValue: number;
}

const defaultContractSpecs: { [key: string]: ContractSpec } = {
  // Micro E-mini Futures
  MES: { tickSize: 0.25, tickValue: 1.25 },    // Micro E-mini S&P 500
  MNQ: { tickSize: 0.25, tickValue: 0.50 },    // Micro E-mini Nasdaq-100
  MYM: { tickSize: 1.00, tickValue: 0.50 },    // Micro E-mini Dow
  M2K: { tickSize: 0.10, tickValue: 0.50 },    // Micro E-mini Russell 2000
  FDXS: { tickSize: 1.00, tickValue: 0.50 },   // Micro-DAX
  FSXE: { tickSize: 1.00, tickValue: 0.50 },   // Micro-EURO STOXX 50

  // Stock Index Futures
  ES: { tickSize: 0.25, tickValue: 12.50 },    // E-mini S&P 500
  NQ: { tickSize: 0.25, tickValue: 5.00 },     // E-mini Nasdaq-100
  YM: { tickSize: 1.00, tickValue: 5.00 },     // E-mini Dow
  RTY: { tickSize: 0.10, tickValue: 10.00 },   // E-mini Russell 2000
  EMD: { tickSize: 0.10, tickValue: 10.00 },   // E-mini S&P MidCap 400
  FDAX: { tickSize: 0.50, tickValue: 12.50 },  // DAX
  FESX: { tickSize: 1.00, tickValue: 10.00 },  // EURO STOXX 50

  // Currencies
  '6A': { tickSize: 0.0001, tickValue: 10.00 },  // Australian Dollar
  '6B': { tickSize: 0.0001, tickValue: 6.25 },   // British Pound
  '6C': { tickSize: 0.0001, tickValue: 10.00 },  // Canadian Dollar
  '6E': { tickSize: 0.0001, tickValue: 12.50 },  // Euro FX
  '6J': { tickSize: 0.000001, tickValue: 12.50 }, // Japanese Yen
  '6N': { tickSize: 0.0001, tickValue: 10.00 },  // New Zealand Dollar
  '6S': { tickSize: 0.0001, tickValue: 12.50 },  // Swiss Franc
  M6A: { tickSize: 0.00001, tickValue: 1.00 },   // Micro AUD/USD
  M6B: { tickSize: 0.00001, tickValue: 0.62 },   // Micro GBP/USD
  M6E: { tickSize: 0.00001, tickValue: 1.25 },   // Micro EUR/USD
  MJY: { tickSize: 0.000001, tickValue: 1.25 },  // Micro JPY/USD

  // Metals
  GC: { tickSize: 0.10, tickValue: 10.00 },     // Gold
  SI: { tickSize: 0.005, tickValue: 25.00 },    // Silver
  HG: { tickSize: 0.0005, tickValue: 12.50 },   // Copper
  MGC: { tickSize: 0.10, tickValue: 1.00 },     // Micro Gold
  SIL: { tickSize: 0.005, tickValue: 2.50 },    // Micro Silver
  MHG: { tickSize: 0.0005, tickValue: 1.25 },   // Micro Copper
  PL: { tickSize: 0.10, tickValue: 5.00 },      // Platinum

  // Energies
  CL: { tickSize: 0.01, tickValue: 10.00 },     // Crude Oil
  NG: { tickSize: 0.001, tickValue: 10.00 },    // Natural Gas
  MCL: { tickSize: 0.01, tickValue: 1.00 },     // Micro WTI Crude Oil
  MNG: { tickSize: 0.001, tickValue: 1.00 },    // Micro Natural Gas
  RB: { tickSize: 0.0001, tickValue: 4.20 },    // RBOB Gasoline
  HO: { tickSize: 0.0001, tickValue: 4.20 },    // Heating Oil

  // Grains
  ZC: { tickSize: 0.25, tickValue: 12.50 },     // Corn
  ZW: { tickSize: 0.25, tickValue: 12.50 },     // Chicago SRW Wheat
  ZS: { tickSize: 0.25, tickValue: 12.50 },     // Soybeans
  ZM: { tickSize: 0.10, tickValue: 10.00 },     // Soybean Meal
  ZL: { tickSize: 0.0001, tickValue: 6.00 },    // Soybean Oil
  ZO: { tickSize: 0.25, tickValue: 12.50 },     // Oats
  ZR: { tickSize: 0.005, tickValue: 10.00 },    // Rough Rice

  // Interest Rates
  ZN: { tickSize: 1/128, tickValue: 15.625 },   // 10-Year Note
  ZB: { tickSize: 1/32, tickValue: 31.25 },     // 30-Year Bond
  ZF: { tickSize: 1/128, tickValue: 7.8125 },   // 5-Year Note
  ZT: { tickSize: 1/128, tickValue: 15.625 },   // 2-Year Note
  UB: { tickSize: 1/32, tickValue: 31.25 },     // Ultra Bond
  SR3: { tickSize: 0.0025, tickValue: 6.25 },   // 3-Month SOFR

  // Softs
  CC: { tickSize: 1.00, tickValue: 10.00 },     // Cocoa
  KC: { tickSize: 0.05, tickValue: 18.75 },     // Coffee
  CT: { tickSize: 0.01, tickValue: 5.00 },      // Cotton
  SB: { tickSize: 0.01, tickValue: 11.20 },     // Sugar
  OJ: { tickSize: 0.05, tickValue: 7.50 },      // Orange Juice

  // Meats
  LE: { tickSize: 0.025, tickValue: 10.00 },    // Live Cattle
  GF: { tickSize: 0.025, tickValue: 12.50 },    // Feeder Cattle
  HE: { tickSize: 0.025, tickValue: 10.00 },    // Lean Hogs

  // European Fixed Income
  FGBL: { tickSize: 0.01, tickValue: 10.00 },   // Euro-Bund
  FGBM: { tickSize: 0.01, tickValue: 10.00 },   // Euro-Bobl
  FGBS: { tickSize: 0.005, tickValue: 5.00 },   // Euro-Schatz
  FGBX: { tickSize: 0.02, tickValue: 20.00 },   // Euro-Buxl
  FBTP: { tickSize: 0.01, tickValue: 10.00 },   // Long-Term Euro-BTP
  FBTS: { tickSize: 0.01, tickValue: 10.00 },   // Short-Term Euro-BTP
  FOAT: { tickSize: 0.01, tickValue: 10.00 },   // Euro-OAT
  L: { tickSize: 0.005, tickValue: 6.25 },      // 3-Month Sterling (Short Sterling)
  R: { tickSize: 0.01, tickValue: 10.00 },      // Long Gilt
  JGB: { tickSize: 0.01, tickValue: 10000 },    // 10-Year Japanese Government Bond
  JB: { tickSize: 0.01, tickValue: 100 },       // SGX 10-Year Mini JGB
  IR: { tickSize: 0.01, tickValue: 24.00 },     // ASX 90-Day Bank Bill
  XT: { tickSize: 0.005, tickValue: 47.00 },    // ASX 10-Year Aus Treasury Bond
  YT: { tickSize: 0.01, tickValue: 30.00 },     // ASX 3-Year Aus Interest Rate Swap
}

// Add CQG symbol mapping from AMP Futures
const cqgSymbolMap: { [key: string]: string } = {
  // Micro E-mini Futures
  MES: 'MES',   // Micro E-mini S&P 500
  MNQ: 'MNQ',   // Micro E-mini Nasdaq-100
  MYM: 'MYM',   // Micro E-mini Dow
  M2K: 'M2K',   // Micro E-mini Russell 2000
  FDXS: 'FDXS', // Micro-DAX
  FSXE: 'FSXE', // Micro-EURO STOXX 50

  // Stock Index Futures
  ES: 'EP',     // E-mini S&P 500
  NQ: 'ENQ',    // E-mini Nasdaq-100
  YM: 'YM',     // E-mini Dow
  RTY: 'RTY',   // E-mini Russell 2000
  EMD: 'EMD',   // E-mini S&P MidCap 400
  NKD: 'NKD',   // NIKKEI 225/USD
  FDAX: 'DD',   // DAX
  FDXM: 'FDXM', // Mini-DAX
  FESX: 'DSX',  // EURO STOXX 50
  FXXP: 'FXXP', // STOXX Europe 600
  FESB: 'ESB',  // EURO STOXX Banks
  FSTX: 'DTX',  // STOXX Europe 50
  FVS: 'FVS',   // VSTOXX
  VX: 'VX',     // CBOE Volatility Index
  VXM: 'MVI',   // Mini CBOE Volatility Index
  Y: 'Y2',      // FTSE 250 Index
  Z: 'QFA',     // FTSE 100 Index
  MC225: 'MC225', // Nikkei 225 micro (Osaka)
  MJNK: 'MJNK',  // Nikkei 225 mini (Osaka)
  JNK: 'JNK',    // Nikkei 225 (Osaka)
  JTPX: 'JTPX',  // TOPIX
  JMT: 'JMT',    // Mini-TOPIX
  J400: 'J400',  // JPX-Nikkei Index 400
  NK: 'ZNA',     // SGX Nikkei 225 Index
  NS: 'NS',      // SGX Mini Nikkei 225 Index
  NU: 'ZU',      // SGX USD Nikkei 225 Index
  TW: 'TWN',     // FTSE Taiwan Stock Index
  AP: 'AP',      // ASX SPI200 Index
  HSI: 'HSI',    // Hang Seng Index
  MHI: 'MHI',    // Mini-Hang Seng Index
  HHI: 'HHI',    // Hang Seng China Ent. Index
  MCH: 'MCH',    // Mini-Hang-Seng China Ent. Index

  // Currencies
  '6A': 'DA6',   // Australian Dollar
  '6B': 'BP6',   // British Pound
  '6C': 'CA6',   // Canadian Dollar
  '6E': 'EU6',   // Euro FX
  '6J': 'JY6',   // Japanese Yen
  '6N': 'NE6',   // New Zealand Dollar
  '6S': 'SF6',   // Swiss Franc
  E7: 'EEU',     // E-mini Euro FX
  J7: 'EJY',     // E-mini Japanese Yen
  M6A: 'M6A',    // Micro AUD/USD
  M6B: 'M6B',    // Micro GBP/USD
  MCD: 'GMCD',   // Micro CAD/USD
  M6E: 'M6E',    // Micro EUR/USD
  MJY: 'MJY',    // Micro JPY/USD
  MSF: 'MSF',    // Micro CHF/USD
  DX: 'DXE',     // Dollar Index

  // Energies
  CL: 'CLE',     // Crude Oil
  QM: 'NQM',     // E-mini Crude Oil
  MCL: 'MCLE',   // Micro WTI Crude Oil
  NG: 'NGE',     // Natural Gas
  QG: 'NQG',     // E-mini Natural Gas
  MNG: 'MNG',    // Micro Henry Hub Natural Gas
  RB: 'RBE',     // RBOB Gasoline
  HO: 'HOE',     // Heating Oil
  BRN: 'QO',     // ICE Brent Crude
  T: 'ET',       // ICE WTI Crude
  N: 'EN',       // ICE (RBOB) Gasoline
  G: 'QP',       // ICE Gas Oil
  O: 'QHO',      // ICE Heating Oil

  // Metals
  GC: 'GCE',     // Gold
  QO: 'MQO',     // E-mini Gold
  MGC: 'MGC',    // Micro Gold
  HG: 'CPE',     // Copper
  QC: 'MQC',     // E-mini Copper
  MHG: 'MHG',    // Micro Copper
  SI: 'SIE',     // Silver
  QI: 'MQI',     // E-mini Silver
  SIL: 'SIL',    // E-micro Silver
  ZG: 'ZO',      // 100 oz Gold
  YG: 'YG',      // Mini Gold
  ZI: 'ZI',      // 5000 oz Silver
  YI: 'YI',      // Mini-Silver
  PL: 'PLE',     // Platinum

  // Financials
  UB: 'ULA',     // Ultra U.S. Treasury Bond
  MWN: 'MWNA',   // Micro Ultra U.S. Treasury Bond
  TN: 'TNA',     // Ultra 10-Year U.S. Treasury Note
  MTN: 'MTNA',   // Micro Ultra 10-Year U.S. Treasury Note
  Z3N: 'Z3N',    // 3-Year U.S. Treasury Note
  ZB: 'USA',     // U.S. Treasury Bond
  '30YY': 'Z30Y', // Micro 30-Year Yield
  ZF: 'FVA',     // 5-Year U.S. Treasury Note
  '5YY': 'Z5YY', // Micro 5-Year Yield
  ZN: 'TYA',     // 10-Year U.S. Treasury Note
  '10YY': 'Z10Y', // Micro 10-Year Yield
  ZQ: 'ZQE',     // 30-Day Federal Funds
  ZT: 'TUA',     // 2-Year U.S. Treasury Note
  '2YY': 'Z2YY', // Micro 2-Year Yield
  SR1: 'SR1',    // One-Month SOFR
  SR3: 'SR3',    // Three-Month SOFR
  FGBL: 'DB',    // Euro-Bund
  FGBM: 'DL',    // Euro-Bobl
  FGBS: 'DG',    // Euro-Schatz
  FGBX: 'FGBX',  // Euro-Buxl
  FBTP: 'FBTP',  // Long-Term Euro-BTP
  FBTS: 'FBTS',  // Short-Term Euro-BTP
  FOAT: 'FOAT',  // Euro-OAT
  L: 'QSA',      // 3-Month Sterling
  R: 'QGA',      // Long Gilt
  JGB: 'JGB',    // 10-Year Japanese Government Bond
  JB: 'ZT',      // SGX 10-Year Mini JGB
  IR: 'HBS',     // ASX 90-Day Bank Bill
  XT: 'HXS',     // ASX 10-Year Aus Treasury Bond
  YT: 'HTS',     // ASX 3-Year Aus Interest Rate Swap

  // Grains
  ZC: 'ZCE',     // Corn
  ZW: 'ZWA',     // Chicago SRW Wheat
  ZS: 'ZSE',     // Soybeans
  ZL: 'ZLE',     // Soybean Oil
  ZM: 'ZME',     // Soybean Meal
  ZO: 'ZOE',     // Oats
  ZR: 'ZRE',     // Rough Rice
  XC: 'XC',      // Mini-Corn
  XW: 'XW',      // Mini-sized Chicago SRW Wheat
  XK: 'XB',      // Mini Soybean

  // Softs
  DC: 'GDC',     // Class III Milk
  LB: 'LBR',     // Lumber
  CC: 'CCE',     // Cocoa
  CT: 'CTE',     // Cotton
  KC: 'KCE',     // Coffee
  OJ: 'OJE',     // Orange Juice
  SB: 'SBE',     // Sugar #11

  // Meats
  GF: 'GF',      // Feeder Cattle
  HE: 'HE',      // Lean Hog
  LE: 'GLE',     // Live Cattle
}

// Add reverse mapping for CQG to regular symbols
const reverseCqgSymbolMap: { [key: string]: string } = Object.entries(cqgSymbolMap).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {} as { [key: string]: string });

// Helper function to check if a character is a letter
function isLetter(char: string): boolean {
  return /[a-zA-Z]/.test(char);
}

// Helper function to check if a character is a number
function isNumber(char: string): boolean {
  return /[0-9]/.test(char);
}

// Helper function to parse contract month/year from symbol
function parseContractCode(symbol: string): { baseSymbol: string, contractCode: string } {
  if (symbol.length < 2) return { baseSymbol: symbol, contractCode: '' };
  
  const lastChar = symbol.charAt(symbol.length - 1);
  const secondLastChar = symbol.charAt(symbol.length - 2);
  
  if (isNumber(lastChar) && isLetter(secondLastChar)) {
    return {
      baseSymbol: symbol.slice(0, -2),
      contractCode: symbol.slice(-2)
    };
  }
  
  return { baseSymbol: symbol, contractCode: '' };
}

// Helper function to convert CQG symbol to regular symbol
function convertCqgToRegularSymbol(symbol: string): string {
  return reverseCqgSymbolMap[symbol] || symbol;
}

// Helper function to get final instrument symbol
function getFinalInstrumentSymbol(symbol: string): string {
  // First parse out the contract code
  const { baseSymbol } = parseContractCode(symbol);
  
  // Then convert from CQG to regular symbol if needed
  return convertCqgToRegularSymbol(baseSymbol);
}

// Helper function to parse date string to ISO string
function parseDateTime(dateTimeStr: string): string {
  // First try to parse the format from Trades dec.csv: "2024-12-20 7:17:03 PM +03:00"
  const formatOne = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)\s+([+-]\d{2}:\d{2})/;
  const matchOne = dateTimeStr.match(formatOne);
  
  if (matchOne) {
    const [_, date, hours, minutes, seconds, ampm, timezone] = matchOne;
    let hour = parseInt(hours);
    
    // Convert 12-hour to 24-hour format
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
    // Create date string in ISO format
    const isoString = `${date}T${hour.toString().padStart(2, '0')}:${minutes}:${seconds}${timezone}`;
    const parsedDate = new Date(isoString);
    
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }
  
  // Then try to parse the format from Quantower.csv: "10/7/24 9:50:07 PM +01:00"
  const formatTwo = /(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)\s+([+-]\d{2}:\d{2})/;
  const matchTwo = dateTimeStr.match(formatTwo);
  
  if (matchTwo) {
    const [_, month, day, year, hours, minutes, seconds, ampm, timezone] = matchTwo;
    let hour = parseInt(hours);
    
    // Convert 12-hour to 24-hour format
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
    // Create date string in ISO format with full year
    const fullYear = parseInt(year) + 2000;
    const isoString = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minutes}:${seconds}${timezone}`;
    const parsedDate = new Date(isoString);
    
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }
  
  // If neither format matches, throw an error
  throw new Error(`Invalid date format: ${dateTimeStr}`);
}

interface QuantowerOrderProcessorProps {
  csvData: string[][]
  headers: string[]
  processedTrades: Partial<Trade>[]
  setProcessedTrades: React.Dispatch<React.SetStateAction<Partial<Trade>[]>>
}

interface Order {
  quantity: number;
  price: number;
  commission: number;
  timestamp: string;
  orderId: string;
}

interface OpenPosition {
  accountNumber: string;
  quantity: number;
  instrument: string;
  side: 'long' | 'short';
  userId: string;
  entryOrders: Order[];
  exitOrders: Order[];
  averageEntryPrice: number;
  entryDate: string;
  totalCommission: number;
  originalQuantity: number;
  openingOrderDetails?: string;
}

export default function QuantowerOrderProcessor({ csvData, headers, processedTrades, setProcessedTrades }: QuantowerOrderProcessorProps) {
  const [contractSpecs, setContractSpecs] = useState<{ [key: string]: ContractSpec }>(defaultContractSpecs)
  const [incompleteTrades, setIncompleteTrades] = useState<OpenPosition[]>([])
  const [unknownSymbols, setUnknownSymbols] = useState<string[]>([])

  const calculatePnL = (entryOrders: Order[], exitOrders: Order[], contractSpec: ContractSpec, side: 'long' | 'short'): number => {
    const totalEntryQuantity = entryOrders.reduce((sum, order) => sum + order.quantity, 0)
    const totalExitQuantity = exitOrders.reduce((sum, order) => sum + order.quantity, 0)
    const quantity = Math.min(totalEntryQuantity, totalExitQuantity)

    const avgEntryPrice = entryOrders.reduce((sum, order) => sum + order.price * order.quantity, 0) / totalEntryQuantity
    const avgExitPrice = exitOrders.reduce((sum, order) => sum + order.price * order.quantity, 0) / totalExitQuantity

    const priceDifference = avgExitPrice - avgEntryPrice
    const ticks = priceDifference / contractSpec.tickSize
    const rawPnL = ticks * contractSpec.tickValue * quantity
    return side === 'long' ? rawPnL : -rawPnL
  }

  const processOrders = useCallback(() => {
    const processedTrades: Partial<Trade>[] = []
    const openPositions: { [key: string]: OpenPosition } = {}
    const incompleteTradesArray: OpenPosition[] = []
    const unknownSymbolsSet = new Set<string>()

    // Sort orders by Date/Time column in ascending order using parseDateTime
    const sortedCsvData = [...csvData].sort((a, b) => {
      try {
        const dateA = new Date(parseDateTime(a[1]));
        const dateB = new Date(parseDateTime(b[1]));
        return dateA.getTime() - dateB.getTime();
      } catch (error) {
        console.error('Error parsing date during sort:', error);
        return 0;  // Keep original order if date parsing fails
      }
    });

    sortedCsvData.forEach((row) => {
      const [account, dateTime, symbol, description, symbolType, expirationDate, strikePrice, side, orderType, quantity, price, grossPnL, fee, netPnL, tradeValue, tradeId, orderId, positionId] = row;

      if (!symbol) {
        console.error('Invalid row: symbol is undefined', row);
        return; // Skip this row
      }

      // Parse the symbol and get the regular symbol for processing
      const { baseSymbol, contractCode } = parseContractCode(symbol);
      const regularSymbol = convertCqgToRegularSymbol(baseSymbol);
      
      // Use regular symbol for contract specs and position tracking
      if (!(regularSymbol in contractSpecs)) {
        unknownSymbolsSet.add(regularSymbol);
        contractSpecs[regularSymbol] = { tickSize: 0.25, tickValue: 5 }; // Default values
      }

      const contractSpec = contractSpecs[regularSymbol];

      const newOrder: Order = {
        quantity: Math.abs(parseFloat(quantity)),
        price: parseFloat(price),
        commission: parseFloat(fee),
        timestamp: dateTime,
        orderId
      }

      if (openPositions[regularSymbol]) {
        const openPosition = openPositions[regularSymbol]
        
        if ((side === 'Buy' && openPosition.side === 'short') || (side === 'Sell' && openPosition.side === 'long')) {
          // Close or reduce position
          openPosition.exitOrders.push(newOrder)
          openPosition.quantity -= newOrder.quantity
          openPosition.totalCommission += newOrder.commission

          if (openPosition.quantity <= 0) {
            // Close position
            const pnl = calculatePnL(openPosition.entryOrders, openPosition.exitOrders, contractSpec, openPosition.side)

            const trade: Partial<Trade> = {
              accountNumber: openPosition.accountNumber,
              quantity: openPosition.originalQuantity,
              entryId: openPosition.entryOrders.map(o => o.orderId).join('-'),
              closeId: openPosition.exitOrders.map(o => o.orderId).join('-'),
              instrument: getFinalInstrumentSymbol(symbol),
              entryPrice: openPosition.averageEntryPrice.toFixed(2),
              closePrice: (openPosition.exitOrders.reduce((sum, o) => sum + o.price * o.quantity, 0) / 
                           openPosition.exitOrders.reduce((sum, o) => sum + o.quantity, 0)).toFixed(2),
              entryDate: parseDateTime(openPosition.entryDate),
              closeDate: parseDateTime(dateTime),
              pnl: pnl,
              timeInPosition: (new Date(parseDateTime(dateTime)).getTime() - new Date(parseDateTime(openPosition.entryDate)).getTime()) / 1000,
              userId: openPosition.userId,
              side: openPosition.side,
              commission: openPosition.totalCommission,
            }

            processedTrades.push(trade)

            if (openPosition.quantity < 0) {
              // Reverse position
              openPositions[regularSymbol] = {
                accountNumber: account,
                quantity: -openPosition.quantity,
                instrument: regularSymbol,
                side: side === 'Buy' ? 'long' : 'short',
                userId: openPosition.userId,
                entryOrders: [newOrder],
                exitOrders: [],
                averageEntryPrice: newOrder.price,
                entryDate: dateTime,
                totalCommission: newOrder.commission,
                originalQuantity: -openPosition.quantity,
                openingOrderDetails: `${side} ${quantity} @ ${price}`
              }
            } else {
              // Full close
              delete openPositions[regularSymbol]
            }
          }
        } else {
          // Add to position
          openPosition.entryOrders.push(newOrder)
          const newQuantity = openPosition.quantity + newOrder.quantity
          const newAverageEntryPrice = (openPosition.averageEntryPrice * openPosition.quantity + newOrder.price * newOrder.quantity) / newQuantity
          openPosition.quantity = newQuantity
          openPosition.originalQuantity = newQuantity
          openPosition.averageEntryPrice = newAverageEntryPrice
          openPosition.totalCommission += newOrder.commission
        }
      } else {
        // Open new position
        openPositions[regularSymbol] = {
          accountNumber: account,
          quantity: newOrder.quantity,
          instrument: regularSymbol,
          side: side === 'Buy' ? 'long' : 'short',
          userId: '', // This should be set to the actual user ID
          entryOrders: [newOrder],
          exitOrders: [],
          averageEntryPrice: newOrder.price,
          entryDate: dateTime,
          totalCommission: newOrder.commission,
          originalQuantity: newOrder.quantity,
          openingOrderDetails: `${side} ${quantity} @ ${price}`
        }
      }
    })

    // Handle remaining open positions
    Object.entries(openPositions).forEach(([symbol, position]) => {
      incompleteTradesArray.push(position)
    })

    setProcessedTrades(processedTrades)
    setIncompleteTrades(incompleteTradesArray)

    if (incompleteTradesArray.length > 0) {
      toast.error("Incomplete Trades Detected", {
        description: `${incompleteTradesArray.length} trade(s) were not completed and have been removed from the analysis.`,
      })
    }

    setUnknownSymbols(Array.from(unknownSymbolsSet));
  }, [csvData, setProcessedTrades, contractSpecs])

  useEffect(() => {
    processOrders()
  }, [processOrders])

  const uniqueSymbols = useMemo(() => Array.from(new Set(processedTrades.map(trade => trade.instrument).filter(Boolean))), [processedTrades])

  const totalPnL = useMemo(() => processedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0), [processedTrades])
  const totalCommission = useMemo(() => processedTrades.reduce((sum, trade) => sum + (trade.commission || 0), 0), [processedTrades])

  const handleContractSpecChange = (symbol: string, field: keyof ContractSpec, value: string) => {
    setContractSpecs(prev => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        [field]: parseFloat(value)
      }
    }))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-6">
          {incompleteTrades.length > 0 && (
            <div className="flex-none bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r" role="alert">
              <p className="font-bold">Incomplete Trades Detected</p>
              <p>{`${incompleteTrades.length} trade(s) were not completed and have been removed from the analysis.`}</p>
              <ul className="list-disc list-inside mt-2">
                {incompleteTrades.map((trade, index) => (
                  <li key={index}>
                    {`${trade.instrument}: ${trade.side} ${trade.quantity} @ ${trade.averageEntryPrice.toFixed(2)} (Opened on ${new Date(trade.entryDate).toLocaleString()})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {unknownSymbols.length > 0 && (
            <div className="flex-none bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r" role="alert">
              <h3 className="font-bold">Unknown Contract Specifications</h3>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {unknownSymbols.map((symbol) => (
                  <div key={symbol} className="space-y-2">
                    <h4 className="font-medium">{symbol}</h4>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm">Tick Size:</label>
                      <Input
                        type="number"
                        value={contractSpecs[symbol].tickSize}
                        onChange={(e) => handleContractSpecChange(symbol, 'tickSize', e.target.value)}
                        className="w-24"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm">Tick Value:</label>
                      <Input
                        type="number"
                        value={contractSpecs[symbol].tickValue}
                        onChange={(e) => handleContractSpecChange(symbol, 'tickValue', e.target.value)}
                        className="w-24"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="px-2">
            <h3 className="text-lg font-semibold mb-2">Processed Trades</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Close Price</TableHead>
                  <TableHead>Entry Date</TableHead>
                  <TableHead>Close Date</TableHead>
                  <TableHead>PnL</TableHead>
                  <TableHead>Time in Position</TableHead>
                  <TableHead>Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedTrades.map((trade, index) => (
                  <TableRow key={trade.entryId || index}>
                    <TableCell>{trade.instrument}</TableCell>
                    <TableCell>{trade.side}</TableCell>
                    <TableCell>{trade.quantity}</TableCell>
                    <TableCell>{trade.entryPrice}</TableCell>
                    <TableCell>{trade.closePrice || '-'}</TableCell>
                    <TableCell>{trade.entryDate ? new Date(trade.entryDate).toLocaleString() : '-'}</TableCell>
                    <TableCell>{trade.closeDate ? new Date(trade.closeDate).toLocaleString() : '-'}</TableCell>
                    <TableCell className={(trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {(trade.pnl || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{trade.timeInPosition ? `${Math.floor(trade.timeInPosition / 60)}m ${Math.floor(trade.timeInPosition % 60)}s` : '-'}</TableCell>
                    <TableCell>{(trade.commission || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-between px-2 py-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Total PnL</h3>
              <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPnL.toFixed(2)}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Total Commission</h3>
              <p className="text-xl font-bold text-blue-600">
                {totalCommission.toFixed(2)}
              </p>
            </div>
          </div>
          
          <div className="px-2">
            <h3 className="text-lg font-semibold mb-2">Instruments Traded</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueSymbols.map((symbol) => (
                <Button
                  key={symbol}
                  variant="outline"
                >
                  {symbol}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}