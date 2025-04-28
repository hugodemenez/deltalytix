import { 
    Bar, 
    DatafeedConfiguration, 
    LibrarySymbolInfo, 
    ResolutionString, 
    SearchSymbolResultItem, 
    Timezone,
    PeriodParams,
    HistoryCallback,
    DatafeedErrorCallback
} from '../../../../../../public/charting_library/charting_library';
import { makeApiRequest, generateSymbol, parseFullSymbol } from './helpers';
import { subscribeOnStream, unsubscribeFromStream } from './streaming';

interface Instrument {
    TYPE: string;
    INSTRUMENT_STATUS: string;
    INSTRUMENT: string;
    HISTO_SHARD: string;
    MAPPED_INSTRUMENT: string;
    INSTRUMENT_MAPPING: Record<string, unknown>;
    HAS_TRADES_SPOT: boolean;
    FIRST_TRADE_SPOT_TIMESTAMP: number;
    LAST_TRADE_SPOT_TIMESTAMP: number;
    TOTAL_TRADES_SPOT: number;
}

interface HistoricalBar {
    UNIT: string;
    TIMESTAMP: number;
    TYPE: string;
    MARKET: string;
    INSTRUMENT: string;
    MAPPED_INSTRUMENT: string;
    BASE: string;
    BASE_ID: number;
    QUOTE: string;
    QUOTE_ID: number;
    OPEN: number;
    HIGH: number;
    LOW: number;
    CLOSE: number;
    FIRST_TRADE_PRICE: number;
    FIRST_TRADE_TIMESTAMP: number;
    HIGH_TRADE_PRICE: number;
    HIGH_TRADE_TIMESTAMP: number;
    LAST_TRADE_PRICE: number;
    LAST_TRADE_TIMESTAMP: number;
    LOW_TRADE_PRICE: number;
    LOW_TRADE_TIMESTAMP: number;
    VOLUME: number;
    VOLUME_BUY: number;
    VOLUME_SELL: number;
    VOLUME_UNKNOWN: number;
    QUOTE_VOLUME: number;
    QUOTE_VOLUME_BUY: number;
    QUOTE_VOLUME_SELL: number;
    QUOTE_VOLUME_UNKNOWN: number;
    TOTAL_TRADES: number;
    TOTAL_TRADES_BUY: number;
    TOTAL_TRADES_SELL: number;
    TOTAL_TRADES_UNKNOWN: number;
    TRANSFORM_FUNCTION: string;
}

interface InstrumentsResponse {
    Data: {
        kraken: {
            instruments: Record<string, Instrument>;
        };
    };
}

interface HistoricalResponse {
    Data: HistoricalBar[];
}

const lastBarsCache = new Map();

const configurationData: DatafeedConfiguration = {
    // Represents the resolutions for bars supported by your datafeed
    supported_resolutions: ['1D', '1W', '1M'] as ResolutionString[],
    // The `exchanges` arguments are used for the `searchSymbols` method if a user selects the exchange
    exchanges: [
        { value: 'Kraken', name: 'Kraken', desc: 'Kraken bitcoin exchange'},
    ],
    // The `symbols_types` arguments are used for the `searchSymbols` method if a user selects this symbol type
    symbols_types: [
        { name: 'crypto', value: 'crypto'}
    ]
};

async function getAllSymbols() {
    const data = await makeApiRequest('spot/v1/markets/instruments?market=kraken&instrument_status=ACTIVE') as InstrumentsResponse;
    let allSymbols: SearchSymbolResultItem[] = [];

    if (data.Data?.kraken?.instruments) {
        const instruments = data.Data.kraken.instruments;
        
        for (const [symbol, instrument] of Object.entries(instruments)) {
            if (instrument.INSTRUMENT_STATUS === 'ACTIVE') {
                allSymbols.push({
                    symbol: symbol,
                    ticker: symbol,
                    description: symbol,
                    exchange: 'Kraken',
                    type: 'crypto',
                });
            }
        }
    }
    
    return allSymbols;
}

const datafeed = {
    onReady: (callback: (configuration: DatafeedConfiguration) => void) => {
        callback(configurationData as DatafeedConfiguration);
    },
    searchSymbols: async (userInput: string, exchange: string, symbolType: string, onResultReadyCallback: (result: SearchSymbolResultItem[]) => void) => {
        const symbols = await getAllSymbols();
        const newSymbols = symbols.filter(symbol => {
            const isExchangeValid = exchange === '' || symbol.exchange === exchange;
            const fullName = `${symbol.exchange}:${symbol.ticker}`;
            const isFullSymbolContainsInput = fullName
                .toLowerCase()
                .indexOf(userInput.toLowerCase()) !== -1;
            return isExchangeValid && isFullSymbolContainsInput;
        });
        onResultReadyCallback(newSymbols);
    },
    resolveSymbol: async (symbolName: string, onSymbolResolvedCallback: (symbolInfo: LibrarySymbolInfo) => void, onResolveErrorCallback: (error: string) => void) => {
        const symbols = await getAllSymbols();
        const symbolItem = symbols.find(({ ticker }) => ticker === symbolName);
        if (!symbolItem) {
            console.log('[resolveSymbol]: Cannot resolve symbol', symbolName);
            onResolveErrorCallback('Cannot resolve symbol');
            return;
        }
        // Symbol information object
        const symbolInfo: LibrarySymbolInfo = {
            ticker: symbolItem.ticker,
            name: symbolItem.symbol,
            description: symbolItem.description,
            type: symbolItem.type,
            session: '24x7',
            timezone: 'Etc/UTC' as Timezone,
            exchange: symbolItem.exchange,
            listed_exchange: symbolItem.exchange,
            format: 'price',
            minmov: 1,
            pricescale: 100,
            has_intraday: false,
            visible_plots_set: 'ohlc',
            has_weekly_and_monthly: false,
            supported_resolutions: configurationData.supported_resolutions,
            volume_precision: 2,
            data_status: 'endofday',
        };
        console.log('[resolveSymbol]: Symbol resolved', symbolName);
        onSymbolResolvedCallback(symbolInfo);
    },
    getBars: async (symbolInfo: LibrarySymbolInfo, resolution: ResolutionString, periodParams: PeriodParams, onResult: HistoryCallback, onError: DatafeedErrorCallback) => {
        const { from, to, firstDataRequest } = periodParams;

        // Calculate the number of days between from and to, with a minimum of 30 days
        const days = Math.max(30, Math.ceil((to - from) / (24 * 60 * 60)));
        
        const parsedSymbol = parseFullSymbol(symbolInfo.name);
        if (!parsedSymbol) {
            onError('Invalid symbol format');
            return;
        }

        try {
            const url = `spot/v1/historical/days?market=kraken&instrument=${parsedSymbol.fromSymbol}-${parsedSymbol.toSymbol}&limit=${days}&aggregate=1&fill=true&apply_mapping=true&response_format=JSON`;
            console.log('[getBars]: Request URL', url);
            
            const data = await makeApiRequest(url) as HistoricalResponse;

            console.log('[getBars]: Data', data);
            if (!data.Data || data.Data.length === 0) {
                onResult([], { noData: true });
                return;
            }

            let bars: Bar[] = [];
            data.Data.forEach((bar: HistoricalBar) => {
                if (firstDataRequest) {
                    lastBarsCache.set(symbolInfo.name, {
                        time: bar.TIMESTAMP * 1000,
                        low: bar.LOW,
                        high: bar.HIGH,
                        open: bar.OPEN,
                        close: bar.CLOSE,
                        volume: bar.VOLUME,
                    });
                }
                
                if (bar.TIMESTAMP >= from && bar.TIMESTAMP < to) {
                    bars = [...bars, {
                        time: bar.TIMESTAMP * 1000,
                        low: bar.LOW,
                        high: bar.HIGH,
                        open: bar.OPEN,
                        close: bar.CLOSE,
                        volume: bar.VOLUME,
                    }];
                }
            });

            console.log(`[getBars]: returned ${bars.length} bar(s)`);
            onResult(bars, { noData: false });
        } catch (error) {
            console.log('[getBars]: Get error', error);
            onError(error instanceof Error ? error.message : String(error));
        }
    },
    subscribeBars: (symbolInfo: LibrarySymbolInfo, resolution: ResolutionString, onRealtimeCallback: (bar: Bar) => void, subscriberUID: string, onResetCacheNeededCallback: () => void) => {
        console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
        subscribeOnStream(
            symbolInfo,
            resolution,
            onRealtimeCallback,
            subscriberUID,
            onResetCacheNeededCallback,
            lastBarsCache.get(symbolInfo.name),
        );
    },
    unsubscribeBars: (subscriberUID: string) => {
        console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
        unsubscribeFromStream(subscriberUID);
    },
}

export default datafeed;
