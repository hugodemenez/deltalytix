/**
 * Tradovate Client - Consolidated API for TradingView integration
 * Combines functionality from api.ts, datafeed.ts, and provider implementation
 */

import { LibrarySymbolInfo, ResolutionString, IDatafeedChartApi, IExternalDatafeed } from '@/public/static/charting_library';

// API Endpoints
const DEMO_URL = 'https://demo.tradovateapi.com/v1';
const LIVE_URL = 'https://live.tradovateapi.com/v1';

export type Environment = 'demo' | 'live';

// Core data structures
interface Bar {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface PeriodParams {
    from: number;
    to: number;
    countBack: number;
    firstDataRequest: boolean;
}

// Configuration interfaces
export interface TradovateCredentials {
    name: string;
    password: string;
    cid: number;
    sec: string;
}

export interface TradovateClientConfig {
    credentials?: TradovateCredentials;
    env?: Environment;
    onCaptchaRequired?: (ticket: string, time: number) => void;
}

// Token response interface
interface TokenResponse {
    accessToken: string;
    mdAccessToken: string;
    expirationTime: string;
    userId: number;
    name: string;
    hasLive: boolean;
}

// Rate limiting constants
const RATE_LIMITS = {
    // API rate limits
    minRequestGap: 200,      // 200ms minimum between API requests
    initialBackoff: 1000,    // Start with 1s backoff
    maxBackoff: 60000,       // Max 60s backoff
    backoffFactor: 1.5,      // Increase backoff by 1.5x on each attempt
    maxRetries: 5,           // Maximum number of retries

    // WebSocket rate limits
    reconnectInitialDelay: 5000,     // Initial reconnect delay (5s)
    reconnectMaxDelay: 300000,       // Maximum reconnect delay (5m)
    reconnectBackoffFactor: 2,       // Double the delay each time
    maxReconnectAttempts: 10,        // Maximum reconnection attempts
    subscribeDelay: 500,             // Delay between subscribe requests
    maxSubscriptionsPerBatch: 5,     // Maximum symbols to subscribe at once
    heartbeatInterval: 2500,         // 2.5s as per Tradovate docs
};

// Token storage helpers
function storeTokens(response: TokenResponse): void {
    if (typeof localStorage === 'undefined') return;
    
    localStorage.setItem('tvAccessToken', response.accessToken);
    localStorage.setItem('tvMdAccessToken', response.mdAccessToken);
    localStorage.setItem('tvTokenExpiration', response.expirationTime);
}

function getStoredTokens() {
    if (typeof localStorage === 'undefined') {
        return { accessToken: null, mdAccessToken: null, expirationTime: null };
    }
    
    return {
        accessToken: localStorage.getItem('tvAccessToken'),
        mdAccessToken: localStorage.getItem('tvMdAccessToken'),
        expirationTime: localStorage.getItem('tvTokenExpiration'),
    };
}

function clearTokens() {
    if (typeof localStorage === 'undefined') return;
    
    localStorage.removeItem('tvAccessToken');
    localStorage.removeItem('tvMdAccessToken');
    localStorage.removeItem('tvTokenExpiration');
}

function isTokenExpired(): boolean {
    const expirationTime = localStorage.getItem('tvTokenExpiration');
    if (!expirationTime) return true;
    
    // Return true if token expires in less than 5 minutes
    const expiry = new Date(expirationTime).getTime();
    const now = Date.now();
    return (expiry - now) < 5 * 60 * 1000;
}

/**
 * TradovateClient - Main class that handles authentication, data fetching, and streaming
 * Implements IExternalDatafeed and IDatafeedChartApi interfaces for TradingView integration
 */
export class TradovateClient implements IExternalDatafeed, IDatafeedChartApi {
    // Core state
    private env: Environment;
    private credentials?: TradovateCredentials;
    private onCaptchaRequired?: (ticket: string, time: number) => void;
    
    // WebSocket state
    private socket: WebSocket | null = null;
    private wsUrl: string;
    private lastMessageTime: number = 0;
    private isInitialized: boolean = false;
    
    // Rate limiting state
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private reconnectAttempts: number = 0;
    private rateLimitedUntil: number = 0;
    
    // Subscription state
    private subscribers: Map<string, { 
        callback: (bar: Bar) => void;
        resolution: string;
    }> = new Map();
    private lastBars: Map<string, Bar> = new Map();
    private pendingSubscriptions: Array<{
        symbol: string;
        resolution: string;
    }> = [];
    private subscriptionInProgress: boolean = false;
    private subscriptionTimer: NodeJS.Timeout | null = null;
    
    // Request tracking
    private pendingRequests: Map<string, NodeJS.Timeout> = new Map();
    private lastRequestTime: number = 0;

    constructor(config?: TradovateClientConfig) {
        this.env = config?.env || 'demo';
        this.wsUrl = this.env === 'demo' 
            ? 'wss://demo.tradovateapi.com/v1/websocket'
            : 'wss://live.tradovateapi.com/v1/websocket';
        this.credentials = config?.credentials;
        this.onCaptchaRequired = config?.onCaptchaRequired;
        
        // Connect if credentials are provided
        if (this.credentials) {
            this.connect();
        }
    }

    // ------------- TradingView DataFeed Interface Methods -------------

    public onReady(callback: (config: any) => void): void {
        const config = {
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
        onResult: (items: any[]) => void
    ): void {
        // Example implementation - you should implement proper symbol search
        const mockResults = [{
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
        onResult: (bars: Bar[], meta: { noData: boolean }) => void,
        onError: (reason: string) => void
    ): Promise<void> {
        try {
            const result = await this.fetchBars(symbolInfo, resolution, periodParams);
            onResult(result.bars, { noData: result.meta.noData });
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Unknown error');
        }
    }

    public subscribeBars(
        symbolInfo: LibrarySymbolInfo,
        resolution: ResolutionString,
        onTick: (bar: Bar) => void,
        listenerGuid: string,
        onResetCacheNeededCallback: () => void
    ): void {
        // First store the subscriber info
        this.subscribers.set(listenerGuid, {
            callback: onTick,
            resolution: resolution
        });
        
        // Then queue the subscription
        if (this.isInitialized) {
            this.pendingSubscriptions.push({
                symbol: symbolInfo.name,
                resolution: resolution
            });
            
            // Start processing if not already in progress
            if (!this.subscriptionInProgress) {
                this.processSubscriptionQueue();
            }
        }
    }

    public unsubscribeBars(listenerGuid: string): void {
        const subscriber = this.subscribers.get(listenerGuid);
        if (!subscriber || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.subscribers.delete(listenerGuid);
        
        // Rate-limit unsubscriptions
        setTimeout(() => {
            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    e: 'md/unsubscribeQuote',
                    d: {
                        symbol: listenerGuid
                    }
                }));
            }
        }, Math.random() * 1000); // Random delay up to 1 second to spread out requests
    }

    public getServerTime?(callback: (serverTime: number) => void): void {
        callback(Math.floor(Date.now() / 1000));
    }

    // ------------- API Methods -------------

    /**
     * Fetches bars for a given symbol and time period
     */
    private async fetchBars(
        symbolInfo: LibrarySymbolInfo,
        resolution: ResolutionString | string,
        periodParams: PeriodParams
    ): Promise<{
        bars: Bar[];
        meta: { noData: boolean };
    }> {
        const token = await this.getOrRefreshToken();
        if (!token) {
            return { bars: [], meta: { noData: true } };
        }

        const url = `${this.env === 'demo' ? 'https://demo' : 'https://live'}.tradovateapi.com/v1/md/history?` +
            new URLSearchParams({
                symbol: symbolInfo.name,
                resolution: resolution,
                from: new Date(periodParams.from * 1000).toISOString(),
                to: new Date(periodParams.to * 1000).toISOString()
            });

        try {
            const response = await this.makeRequest({
                url,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response || !Array.isArray(response.bars)) {
                return { bars: [], meta: { noData: true } };
            }

            const bars = response.bars.map((bar: any) => ({
                time: new Date(bar.timestamp).getTime(),
                open: parseFloat(bar.open),
                high: parseFloat(bar.high),
                low: parseFloat(bar.low),
                close: parseFloat(bar.close),
                volume: parseFloat(bar.volume || 0)
            }));

            return {
                bars,
                meta: { noData: bars.length === 0 }
            };
        } catch (error) {
            console.warn('[Tradovate] Error fetching bars:', error);
            return { bars: [], meta: { noData: true } };
        }
    }

    /**
     * Makes a rate-limited request with retries and backoff
     */
    private async makeRequest({
        url,
        method = 'GET',
        headers = {},
        body,
        retry = 0
    }: {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: any;
        retry?: number;
    }): Promise<any> {
        // Generate a unique request ID
        const requestId = `${method}-${url}`;
        
        // Enforce rate limiting
        const now = Date.now();
        const timeToWait = Math.max(0, this.lastRequestTime + RATE_LIMITS.minRequestGap - now);
        
        if (timeToWait > 0) {
            await new Promise(resolve => setTimeout(resolve, timeToWait));
        }
        
        this.lastRequestTime = Date.now();
        
        try {
            const response = await fetch(url, {
                method,
                headers,
                ...(body ? { body: JSON.stringify(body) } : {})
            });
            
            // Handle rate limit response
            if (response.status === 429) {
                if (retry >= RATE_LIMITS.maxRetries) {
                    throw new Error(`Rate limit exceeded after ${retry} retries`);
                }
                
                // Parse the response to check for ticket and time
                const responseData = await response.json();
                
                if (responseData['p-captcha']) {
                    // This requires human intervention
                    this.handleCaptchaRequired(responseData);
                    throw new Error('CAPTCHA_REQUIRED');
                }
                
                const waitTime = responseData['p-time'] 
                    ? responseData['p-time'] * 1000 
                    : RATE_LIMITS.initialBackoff * Math.pow(RATE_LIMITS.backoffFactor, retry);
                
                console.warn(`[Tradovate] Rate limited. Retrying in ${waitTime/1000}s`);
                
                // Wait for the specified time
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                // Retry the request
                return this.makeRequest({
                    url,
                    method,
                    headers,
                    body,
                    retry: retry + 1
                });
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error instanceof Error && error.message !== 'CAPTCHA_REQUIRED' && retry < RATE_LIMITS.maxRetries) {
                const waitTime = RATE_LIMITS.initialBackoff * Math.pow(RATE_LIMITS.backoffFactor, retry);
                console.warn(`[Tradovate] Request failed. Retrying in ${waitTime/1000}s`);
                
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                return this.makeRequest({
                    url,
                    method,
                    headers,
                    body,
                    retry: retry + 1
                });
            }
            throw error;
        }
    }

    /**
     * Gets or refreshes the access token
     */
    private async getOrRefreshToken(): Promise<string | null> {
        const tokens = getStoredTokens();
        
        if (tokens.mdAccessToken && !isTokenExpired()) {
            return tokens.mdAccessToken;
        }
        
        if (!this.credentials) {
            return null;
        }
        
        try {
            const response = await this.getAccessToken();
            return response.mdAccessToken;
        } catch (error) {
            if (error instanceof Error && error.message === 'CAPTCHA_REQUIRED') {
                console.warn('[Tradovate] CAPTCHA required for authentication');
                return null;
            }
            console.error('[Tradovate] Error getting token:', error);
            throw error;
        }
    }

    /**
     * Requests an access token using credentials
     */
    private async getAccessToken(): Promise<TokenResponse> {
        if (!this.credentials) {
            throw new Error('No credentials provided');
        }
        
        const data = {
            ...this.credentials,
            appId: 'Sample App',
            appVersion: '1.0',
            deviceId: typeof crypto !== 'undefined' && 'randomUUID' in crypto 
                ? crypto.randomUUID() 
                : Math.random().toString(36).substring(2, 15)
        };
        
        const baseURL = this.env === 'demo' ? DEMO_URL : LIVE_URL;
        
        try {
            const response = await this.makeRequest({
                url: `${baseURL}/auth/accessTokenRequest`,
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: data
            });
            
            if (response['p-captcha']) {
                this.handleCaptchaRequired(response);
                throw new Error('CAPTCHA_REQUIRED');
            }
            
            // Store the tokens
            storeTokens(response);
            
            return response;
        } catch (error) {
            console.warn('[Tradovate] Failed to get access token:', error);
            throw error;
        }
    }

    /**
     * Handles CAPTCHA requirement
     */
    private handleCaptchaRequired(response: any): void {
        // Extract ticket and time from response
        const ticket = response['p-ticket'] || '';
        const waitTime = response['p-time'] || 3600; // Default 1 hour
        
        // Set a longer rate limit to prevent reconnection attempts
        this.rateLimitedUntil = Date.now() + (waitTime * 1000);
        
        // Call the handler if provided
        if (this.onCaptchaRequired) {
            this.onCaptchaRequired(ticket, waitTime);
        }
        
        console.warn(`[Tradovate] CAPTCHA required. Waiting for ${Math.ceil(waitTime/60)} minutes before retrying`);
    }

    // ------------- WebSocket Methods -------------

    /**
     * Establishes WebSocket connection
     */
    private connect(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.socket = new WebSocket(this.wsUrl);
        this.isInitialized = false;
        
        this.socket.onopen = () => {
            this.lastMessageTime = Date.now();
            // Reset reconnect counters on successful connection
            this.reconnectAttempts = 0;
            
            // Authorize the connection
            this.authorize().catch(error => {
                console.warn('[Tradovate] Authorization failed:', error);
                this.reconnect();
            });
        };

        this.socket.onmessage = (event: MessageEvent) => {
            this.handleMessage(event);
        };
        
        this.socket.onerror = () => {
            console.warn('[Tradovate] WebSocket connection error');
        };

        this.socket.onclose = (event) => {
            // Check for HTTP 429 response in close code
            if (event.code === 1006 || event.code === 1015) {
                // These codes can indicate network issues or server rejections
                console.warn('[Tradovate] WebSocket closed abnormally, possibly rate limited');
                
                // Set a backoff period
                this.rateLimitedUntil = Date.now() + 60000; // 1 minute cooldown
            }
            
            this.reconnect();
        };
    }

    /**
     * Handles WebSocket reconnection with backoff
     */
    private reconnect(): void {
        // Check if we're in a rate limit period
        if (Date.now() < this.rateLimitedUntil) {
            const waitTime = Math.ceil((this.rateLimitedUntil - Date.now()) / 1000);
            console.warn(`[Tradovate] WebSocket reconnection delayed: rate limited for ${waitTime}s`);
            
            // Schedule reconnection after rate limit expires
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectAttempts = 0;
                this.connect();
            }, this.rateLimitedUntil - Date.now());
            
            return;
        }
        
        // Check if we've exceeded max reconnect attempts
        if (this.reconnectAttempts >= RATE_LIMITS.maxReconnectAttempts) {
            console.error(`[Tradovate] Maximum WebSocket reconnection attempts (${RATE_LIMITS.maxReconnectAttempts}) reached.`);
            return; // Stop trying to reconnect
        }

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        
        // Calculate the actual delay with exponential backoff
        const actualDelay = Math.min(
            RATE_LIMITS.reconnectInitialDelay * Math.pow(RATE_LIMITS.reconnectBackoffFactor, this.reconnectAttempts),
            RATE_LIMITS.reconnectMaxDelay
        );
        
        console.warn(`[Tradovate] Reconnecting in ${Math.floor(actualDelay / 1000)}s (attempt ${this.reconnectAttempts + 1}/${RATE_LIMITS.maxReconnectAttempts})`);
        
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, actualDelay);
    }

    /**
     * Authorizes WebSocket connection
     */
    private async authorize(): Promise<void> {
        const token = await this.getOrRefreshToken();
        if (!token) {
            throw new Error('Failed to get access token');
        }

        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(`authorize\n0\n\n${token}`);
        } else {
            this.reconnect();
        }
    }

    /**
     * Sends a heartbeat message
     */
    private sendHeartbeat(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.reconnect();
            return;
        }

        try {
            // Send empty array as text for heartbeat as per Tradovate docs
            this.socket.send('[]');
        } catch (error) {
            this.reconnect();
        }
    }

    /**
     * Checks if a heartbeat is needed
     */
    private checkHeartbeat(): void {
        const now = Date.now();
        const timeSinceLastMessage = now - this.lastMessageTime;
        
        if (timeSinceLastMessage >= RATE_LIMITS.heartbeatInterval) {
            this.sendHeartbeat();
        }
    }

    /**
     * Handles WebSocket messages
     */
    private handleMessage(event: MessageEvent): void {
        try {
            // Update last message time
            this.lastMessageTime = Date.now();
            // Check if we need to send a heartbeat
            this.checkHeartbeat();

            const [type, id, ...rest] = event.data.split('\n');
            
            switch (type) {
                case 'authorized':
                    this.isInitialized = true;
                    // Process any pending subscriptions
                    this.processSubscriptionQueue();
                    break;
                
                case 'md': {
                    const data = JSON.parse(rest.join('\n'));
                    
                    if (data.e === 'md' && data.d?.quotes) {
                        this.handleMarketDataQuotes(data.d.quotes);
                    }
                    break;
                }
                
                case 'error':
                    // Check for rate limiting errors
                    const errorMessage = rest.join('\n');
                    console.warn('[Tradovate] WebSocket error:', errorMessage);
                    
                    // Look for rate limiting messages
                    if (errorMessage.includes('rate') || errorMessage.includes('limit') || errorMessage.includes('Too many')) {
                        // Treat as rate limited
                        this.rateLimitedUntil = Date.now() + 60000; // 1 minute cooldown
                        console.warn('[Tradovate] Rate limited, backing off for 1 minute');
                    }
                    
                    if (errorMessage.includes('Unauthorized')) {
                        this.authorize().catch(() => this.reconnect());
                    }
                    break;
            }
        } catch (error) {
            // Silent error handling to avoid React re-renders
        }
    }

    /**
     * Processes market data quotes
     */
    private handleMarketDataQuotes(quotes: any[]): void {
        for (const quote of quotes) {
            const symbol = quote.contractId.toString();
            const subscriber = this.subscribers.get(symbol);
            
            if (!subscriber) continue;

            const bar: Bar = {
                time: new Date(quote.timestamp).getTime(),
                open: quote.entries.OpeningPrice?.price || quote.entries.Trade?.price,
                high: quote.entries.HighPrice?.price || quote.entries.Trade?.price,
                low: quote.entries.LowPrice?.price || quote.entries.Trade?.price,
                close: quote.entries.Trade?.price || quote.entries.SettlementPrice?.price,
                volume: quote.entries.TotalTradeVolume?.size || 0
            };

            // Check if we have a complete bar
            if (bar.open && bar.high && bar.low && bar.close) {
                this.lastBars.set(symbol, bar);
                subscriber.callback(bar);
            }
        }
    }

    /**
     * Processes subscription queue
     */
    private processSubscriptionQueue(): void {
        if (!this.isInitialized || this.subscriptionInProgress || this.pendingSubscriptions.length === 0) {
            return;
        }
        
        this.subscriptionInProgress = true;
        
        // Get a batch of subscriptions
        const batch = this.pendingSubscriptions.splice(0, RATE_LIMITS.maxSubscriptionsPerBatch);
        
        // Send subscriptions
        batch.forEach(({ symbol, resolution }) => {
            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    e: 'md/subscribeQuote',
                    d: {
                        symbol,
                        resolution
                    }
                }));
            }
        });
        
        // Schedule the next batch
        this.subscriptionTimer = setTimeout(() => {
            this.subscriptionInProgress = false;
            this.processSubscriptionQueue();
        }, RATE_LIMITS.subscribeDelay);
    }
} 