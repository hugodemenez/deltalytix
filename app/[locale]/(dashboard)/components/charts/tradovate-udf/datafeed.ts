import {
    DatafeedConfiguration,
    LibrarySymbolInfo,
    ResolutionString,
    HistoryCallback,
    SubscribeBarsCallback,
    GetMarksCallback,
    Mark,
    TimescaleMark,
    IDatafeedChartApi,
    IExternalDatafeed,
    SearchSymbolsCallback,
    SearchSymbolResultItem,
} from '@/public/static/charting_library';
import { TradovateUDFProvider } from './index';

interface TradovateDatafeedConfig {
    credentials?: {
        name: string;
        password: string;
        cid: number;
        sec: string;
    };
    env?: 'demo' | 'live';
    onCaptchaRequired?: (ticket: string, time: number) => void;
}

export class TradovateDatafeed implements IExternalDatafeed, IDatafeedChartApi {
    private provider: TradovateUDFProvider;

    constructor(config?: TradovateDatafeedConfig) {
        // Initialize with proper configuration
        this.provider = new TradovateUDFProvider({
            env: config?.env || 'demo',
            credentials: config?.credentials || {
                // These are placeholder values - replace with your actual credentials
                name: process.env.NEXT_PUBLIC_TRADOVATE_USERNAME || '',
                password: process.env.NEXT_PUBLIC_TRADOVATE_PASSWORD || '',
                cid: Number(process.env.NEXT_PUBLIC_TRADOVATE_CID) || 0,
                sec: process.env.NEXT_PUBLIC_TRADOVATE_SECRET || ''
            },
            onCaptchaRequired: config?.onCaptchaRequired
        });
    }

    public onReady(callback: (configuration: DatafeedConfiguration) => void): void {
        const config: DatafeedConfiguration = {
            supported_resolutions: ['1', '5', '15', '30', '60', '1D', '1W', '1M'] as ResolutionString[],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
            exchanges: [
                {
                    value: 'CME',
                    name: 'CME',
                    desc: 'Chicago Mercantile Exchange',
                }
            ],
            symbols_types: [
                {
                    name: 'futures',
                    value: 'futures',
                }
            ],
        };
        
        setTimeout(() => callback(config), 0);
    }

    public searchSymbols(
        userInput: string,
        exchange: string,
        symbolType: string,
        onResult: SearchSymbolsCallback
    ): void {
        // Example implementation - you should implement proper symbol search
        const mockResults: SearchSymbolResultItem[] = [{
            symbol: 'ESZ3',
            description: 'E-mini S&P 500 Future Dec 2023',
            exchange: 'CME',
            ticker: 'ESZ3',
            type: 'futures'
        }];
        onResult(mockResults);
    }

    public resolveSymbol(
        symbolName: string,
        onResolve: (symbolInfo: LibrarySymbolInfo) => void,
        onError: (reason: string) => void
    ): void {
        const symbolInfo: LibrarySymbolInfo = {
            name: symbolName,
            ticker: symbolName,
            description: symbolName,
            type: 'futures',
            session: '24x7',
            timezone: 'America/Chicago',
            exchange: 'CME',
            listed_exchange: 'CME',
            format: 'price',
            minmov: 1,
            pricescale: 100,
            has_intraday: true,
            has_daily: true,
            has_weekly_and_monthly: true,
            supported_resolutions: ['1', '5', '15', '30', '60', '1D', '1W', '1M'] as ResolutionString[],
            volume_precision: 0,
            data_status: 'streaming',
        };
        
        onResolve(symbolInfo);
    }

    public async getBars(
        symbolInfo: LibrarySymbolInfo,
        resolution: ResolutionString,
        periodParams: { from: number; to: number; countBack: number; firstDataRequest: boolean },
        onResult: HistoryCallback,
        onError: (reason: string) => void
    ): Promise<void> {
        try {
            const result = await this.provider.getBars(symbolInfo, resolution, periodParams);
            onResult(result.bars, { noData: result.meta.noData });
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Unknown error');
        }
    }

    public subscribeBars(
        symbolInfo: LibrarySymbolInfo,
        resolution: ResolutionString,
        onTick: SubscribeBarsCallback,
        listenerGuid: string,
        onResetCacheNeededCallback: () => void
    ): void {
        this.provider.subscribeBars(
            symbolInfo,
            resolution,
            onTick,
            listenerGuid,
            onResetCacheNeededCallback
        );
    }

    public unsubscribeBars(listenerGuid: string): void {
        this.provider.unsubscribeBars(listenerGuid);
    }

    public getMarks?(
        symbolInfo: LibrarySymbolInfo,
        from: number,
        to: number,
        onDataCallback: GetMarksCallback<Mark>,
        resolution: ResolutionString
    ): void {
        // Implement if you want to show marks on the timeline
    }

    public getTimescaleMarks?(
        symbolInfo: LibrarySymbolInfo,
        from: number,
        to: number,
        onDataCallback: GetMarksCallback<TimescaleMark>,
        resolution: ResolutionString
    ): void {
        // Implement if you want to show marks on the timeline
    }

    public getServerTime?(callback: (serverTime: number) => void): void {
        callback(Math.floor(Date.now() / 1000));
    }
} 