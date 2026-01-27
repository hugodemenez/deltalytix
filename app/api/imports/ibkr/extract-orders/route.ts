import { orderSchema } from '../fifo-computation/schema'
import { type FinancialInstrument } from './schema'

export const maxDuration = 60 // Allow up to 60 seconds for AI processing

interface TradeOrder {
  rawSymbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: string;
  commission?: number;
  accountNumber?: string;
  orderId?: string;
  orderType?: string;
}

const parseOrders = (text: string): TradeOrder[] => {
  // First, let's extract just the trades section
  const tradesMatch = text.match(/Trades[\s\S]*?(?=Financial Instrument Information|$)/);
  if (!tradesMatch) return [];

  
  const tradesText = tradesMatch[0];
  
  // Pattern to match order lines - now more flexible with whitespace
  const orderPattern = /U\*\*\*(\d+)\s+([A-Z0-9]+)\s+(\d{4}-\d{2}-\d{2}),\s*(\d{2}:\d{2}:\d{2})\s+(\d{4}-\d{2}-\d{2})\s+-\s+(BUY|SELL)\s+(-?\d+)\s+([\d,]+\.\d+)\s+(-?[\d,]+\.\d+)\s+(-?[\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([A-Z]+)\s+([OC])/g;

  const orders: TradeOrder[] = [];
  let match;
  let orderIndex = 1;

  while ((match = orderPattern.exec(tradesText)) !== null) {
    const [
      _,
      accountId,
      symbol,
      date,
      time,
      settleDate,
      side,
      quantity,
      price,
      value,
      commission,
      fee,
      orderType,
      code
    ] = match;

    // Convert datetime to ISO format
    const isoTimestamp = new Date(`${date}T${time}`).toISOString();
    
    // Generate a short unique ID: side + index + last 2 digits of seconds
    const timeSeconds = time.split(':')[2];
    const orderId = `${side.charAt(0)}${orderIndex}${timeSeconds}`;

    orders.push({
      rawSymbol: symbol,
      side: side as 'BUY' | 'SELL',
      quantity: Math.abs(parseInt(quantity)), // Use absolute value for quantity
      price: parseFloat(price.replace(/,/g, '')),
      timestamp: isoTimestamp,
      commission: parseFloat(fee.replace(/,/g, ''))+parseFloat(commission.replace(/,/g, '')),
      accountNumber: `U***${accountId}`,
      orderId: orderId,
      orderType: orderType
    });
    
    orderIndex++;
  }

  return orders;
};


const parseInstrumentInformation = (text: string): FinancialInstrument[] => {
  const instrumentInformationMatch = text.match(/Financial Instrument Information[\s\S]*?(?=Order Types|Generated:|$)/);
  if (!instrumentInformationMatch) return [];
  
  const instrumentInformationText = instrumentInformationMatch[0];
  console.log('instrumentInformationText', instrumentInformationText);
  
  // The text appears to be concatenated, so let's work with it as a single string
  // Pattern: "Financial Instrument Information Symbol Description Conid ... Code Futures SYMBOL DESC CONID ..."
  
  // First, find where the actual data starts after "Futures" (or other instrument types)
  const instrumentTypeMatch = instrumentInformationText.match(/(Futures|Options|Stocks|Bonds|ETFs?)/);
  if (!instrumentTypeMatch) return [];
  
  const instrumentType = instrumentTypeMatch[1];
  const instrumentTypeIndex = instrumentInformationText.indexOf(instrumentType);
  
  // Get the data part after the instrument type
  const dataText = instrumentInformationText.substring(instrumentTypeIndex + instrumentType.length).trim();
  
  // Now parse the instruments - each instrument should have these fields:
  // Symbol, Description (like "MES 20JUN25"), Conid, Underlying, Exchange, Multiplier, Expiry, DeliveryMonth
  // Pattern matches: SYMBOL DESC1 DESC2 CONID UNDERLYING EXCHANGE MULTIPLIER EXPIRY DELIVERYMONTH
  const instrumentPattern = /([A-Z0-9]+)\s+([A-Z0-9]+\s+[A-Z0-9]+)\s+(\d+)\s+([A-Z0-9]+)\s+([A-Z]+)\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2})/g;
  
  const instruments: FinancialInstrument[] = [];
  let match;
  
  while ((match = instrumentPattern.exec(dataText)) !== null) {
    const [
      _,
      symbol,
      description,
      conid,
      underlying,
      exchange,
      multiplier,
      expiry,
      deliveryMonth
    ] = match;
    
    instruments.push({
      symbol: symbol.trim(),
      description: description.trim(),
      conid: conid,
      underlying: underlying,
      listingExchange: exchange,
      multiplier: parseInt(multiplier),
      expiry: expiry,
      deliveryMonth: deliveryMonth,
      instrumentType: instrumentType
    });
  }
  
  console.log('instruments', instruments)
  return instruments;
};

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const { text } = json

    if (!text) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsedOrders = parseOrders(text)
    const instrumentInformation = parseInstrumentInformation(text)
    
    // Validate orders against schema
    const validOrders = parsedOrders.filter(order => {
      try {
        orderSchema.parse(order);
        return true;
      } catch (error) {
        console.warn('Order validation failed:', error, 'Order:', order);
        return false;
      }
    });

    return new Response(JSON.stringify({ 
      orders: validOrders, 
      instruments: instrumentInformation 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process request' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 