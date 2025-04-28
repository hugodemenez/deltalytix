import { LibrarySymbolInfo, ResolutionString } from '@/public/static/charting_library';
import { getStoredTokens, isTokenExpired, getAccessToken, Environment } from '@/app/[locale]/(dashboard)/lib/tradovate/api';

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

interface TradovateConfig {
    wsUrl?: string;
    onCaptchaRequired?: (ticket: string, time: number) => void;
    env?: Environment;
    credentials?: {
        name: string;
        password: string;
        cid: number;
        sec: string;
    };
}

// WebSocket connection rate limiting
const WS_RATE_LIMITS = {
    reconnectInitialDelay: 5000,    // Initial reconnect delay: 5 seconds
    reconnectMaxDelay: 300000,      // Maximum reconnect delay: 5 minutes
    reconnectBackoffFactor: 2,      // Double the delay each time
    maxReconnectAttempts: 10,       // Maximum reconnection attempts
    subscribeDelay: 500,            // Delay between subscribe requests: 500ms
    maxSubscriptionsPerBatch: 5,    // Maximum symbols to subscribe at once
};

export class TradovateUDFProvider {
    private socket: WebSocket | null = null;
    private wsUrl: string;
    private messageId: number = 0;
    private subscribers: Map<string, { 
        callback: (bar: Bar) => void;
        resolution: string;
    }> = new Map();
    private lastBars: Map<string, Bar> = new Map();
    private isInitialized: boolean = false;
    private env: Environment;
    private credentials?: TradovateConfig['credentials'];
    private onCaptchaRequired?: TradovateConfig['onCaptchaRequired'];
    private lastMessageTime: number = 0;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private readonly HEARTBEAT_INTERVAL = 2500; // 2.5 seconds as per Tradovate docs
    
    // Rate limiting state
    private reconnectAttempts: number = 0;
    private reconnectDelay: number = WS_RATE_LIMITS.reconnectInitialDelay;
    private pendingSubscriptions: Array<{
        symbol: string;
        resolution: string;
    }> = [];
    private subscriptionInProgress: boolean = false;
    private subscriptionTimer: NodeJS.Timeout | null = null;
    private rateLimitedUntil: number = 0;

    constructor(config?: TradovateConfig) {
        this.env = config?.env || 'demo';
        this.wsUrl = config?.wsUrl || (this.env === 'demo' 
            ? 'wss://demo.tradovateapi.com/v1/websocket'
            : 'wss://live.tradovateapi.com/v1/websocket');
        this.credentials = config?.credentials;
        this.onCaptchaRequired = config?.onCaptchaRequired;
        this.connect();
    }

    private async getOrRefreshToken(): Promise<string | null> {
        const tokens = getStoredTokens();
        
        if (tokens.mdAccessToken && !isTokenExpired()) {
            return tokens.mdAccessToken;
        }
        
        if (this.credentials) {
            try {
                const response = await getAccessToken({
                    ...this.credentials,
                    env: this.env
                });
                return response.mdAccessToken;
            } catch (error) {
                if (error instanceof Error && error.message === 'CAPTCHA_REQUIRED') {
                    // If the config provided a captcha handler, call it
                    // Default wait time - 60 minutes (3600 seconds)
                    let waitTime = 3600;
                    let ticket = '';
                    
                    // Try to extract ticket and time from error if available
                    if (error instanceof Error && 'captchaInfo' in error) {
                        const captchaInfo = (error as any).captchaInfo;
                        if (captchaInfo) {
                            ticket = captchaInfo.ticket || '';
                            waitTime = captchaInfo.time || 3600;
                        }
                    }
                    
                    // Call the onCaptchaRequired handler if provided
                    if (this.onCaptchaRequired) {
                        this.onCaptchaRequired(ticket, waitTime);
                    }
                    
                    // Set a longer rate limit to prevent reconnection attempts
                    this.rateLimitedUntil = Date.now() + (waitTime * 1000);
                    
                    console.warn(`CAPTCHA required. Waiting for ${Math.ceil(waitTime/60)} minutes before retrying`);
                    
                    return null;
                }
                throw error;
            }
        }

        return null;
    }

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

    private checkHeartbeat(): void {
        const now = Date.now();
        const timeSinceLastMessage = now - this.lastMessageTime;
        
        // Simplify heartbeat debugging - log only when actually sending a heartbeat
        if (timeSinceLastMessage >= this.HEARTBEAT_INTERVAL) {
            this.sendHeartbeat();
        }
    }

    private reconnect(): void {
        // Check if we're in a rate limit period
        if (Date.now() < this.rateLimitedUntil) {
            console.warn(`[Tradovate] WebSocket reconnection on hold until rate limit expires in ${Math.ceil((this.rateLimitedUntil - Date.now()) / 1000)}s`);
            
            // Schedule reconnection after rate limit expires
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectAttempts = 0; // Reset attempts after waiting for rate limit
                this.reconnectDelay = WS_RATE_LIMITS.reconnectInitialDelay;
                this.connect();
            }, this.rateLimitedUntil - Date.now());
            
            return;
        }
        
        // Check if we've exceeded max reconnect attempts
        if (this.reconnectAttempts >= WS_RATE_LIMITS.maxReconnectAttempts) {
            console.error(`[Tradovate] Maximum WebSocket reconnection attempts (${WS_RATE_LIMITS.maxReconnectAttempts}) reached.`);
            return; // Stop trying to reconnect
        }

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        
        // Calculate the actual delay with exponential backoff
        const actualDelay = Math.min(
            this.reconnectDelay * Math.pow(WS_RATE_LIMITS.reconnectBackoffFactor, this.reconnectAttempts),
            WS_RATE_LIMITS.reconnectMaxDelay
        );
        
        console.warn(`[Tradovate] Reconnecting in ${Math.floor(actualDelay / 1000)}s (attempt ${this.reconnectAttempts + 1}/${WS_RATE_LIMITS.maxReconnectAttempts})`);
        
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, actualDelay);
    }

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
            this.reconnectDelay = WS_RATE_LIMITS.reconnectInitialDelay;
            
            // Authorize the connection
            this.authorize().catch(error => {
                console.warn('[Tradovate] Authorization failed:', error);
                this.reconnect();
            });
        };

        this.socket.onmessage = (event: MessageEvent) => {
            this.handleMessage(event);
        };
        
        this.socket.onerror = (error) => {
            console.warn('[Tradovate] WebSocket connection error');
        };

        this.socket.onclose = (event) => {
            // Check for HTTP 429 response in close code
            if (event.code === 1006 || event.code === 1015) {
                // These codes can indicate network issues or server rejections
                // Could be due to rate limiting
                console.warn('[Tradovate] WebSocket closed abnormally, possibly rate limited');
                
                // Set a longer backoff period
                this.rateLimitedUntil = Date.now() + 60000; // 1 minute cooldown
            }
            
            this.reconnect();
        };
    }

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

    private handleMessage(event: MessageEvent): void {
        try {
            // Update last message time
            this.lastMessageTime = Date.now();
            // Check if we need to send a heartbeat
            this.checkHeartbeat();

            // Don't log heartbeat responses or other high-volume messages
            // Only log meaningful messages for debugging
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
                    console.warn('[TradovateUDFProvider] WebSocket error:', errorMessage);
                    
                    // Look for rate limiting messages (adjust these based on actual error messages from Tradovate)
                    if (errorMessage.includes('rate') || errorMessage.includes('limit') || errorMessage.includes('Too many')) {
                        // Treat as rate limited
                        this.rateLimitedUntil = Date.now() + 60000; // 1 minute cooldown
                        console.warn('[Tradovate] Rate limited, backing off for 1 minute');
                    }
                    
                    if (errorMessage.includes('Unauthorized')) {
                        this.handleUnauthorized();
                    }
                    break;
            }
        } catch (error) {
            // Silent error handling to avoid Next.js re-renders
        }
    }

    private handleMarketDataQuotes(quotes: any[]): void {
        // Process quotes without excessive logging
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

    private async handleUnauthorized(): Promise<void> {
        try {
            await this.authorize();
        } catch {
            this.socket?.close();
        }
    }

    // Process subscriptions in batches with rate limiting
    private processSubscriptionQueue(): void {
        if (!this.isInitialized || this.subscriptionInProgress || this.pendingSubscriptions.length === 0) {
            return;
        }
        
        this.subscriptionInProgress = true;
        
        // Get a batch of subscriptions
        const batch = this.pendingSubscriptions.splice(0, WS_RATE_LIMITS.maxSubscriptionsPerBatch);
        
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
        }, WS_RATE_LIMITS.subscribeDelay);
    }

    private resubscribeAll(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.isInitialized) return;

        // Clear any existing subscription queue
        this.pendingSubscriptions = [];
        if (this.subscriptionTimer) {
            clearTimeout(this.subscriptionTimer);
            this.subscriptionTimer = null;
        }
        
        // Add all subscribers to queue
        for (const [symbol, { resolution }] of this.subscribers) {
            this.pendingSubscriptions.push({ symbol, resolution });
        }
        
        // Start processing queue
        this.processSubscriptionQueue();
    }

    public async getBars(
        symbolInfo: LibrarySymbolInfo,
        resolution: string,
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
            const response = await fetch(
                url,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Check for rate limiting response
            if (response.status === 429) {
                console.warn('[TradovateUDFProvider] Rate limited on history request');
                
                // Try to get rate limit info
                const data = await response.json();
                if (data['p-time']) {
                    const waitTime = data['p-time'] * 1000;
                    console.warn(`[TradovateUDFProvider] Waiting ${waitTime/1000}s before retrying`);
                    
                    // Wait for the specified time
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    
                    // Retry with the same parameters
                    return this.getBars(symbolInfo, resolution, periodParams);
                } else {
                    // Generic backoff
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    return this.getBars(symbolInfo, resolution, periodParams);
                }
            }

            if (!response.ok) {
                console.warn('[TradovateUDFProvider] API request failed:', response.status);
                return { bars: [], meta: { noData: true } };
            }

            const data = await response.json();
            
            if (!data || !Array.isArray(data.bars)) {
                return { bars: [], meta: { noData: true } };
            }

            const bars = data.bars.map((bar: any) => ({
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
            console.warn('[TradovateUDFProvider] Error fetching bars');
            return { bars: [], meta: { noData: true } };
        }
    }

    public subscribeBars(
        symbolInfo: LibrarySymbolInfo,
        resolution: string,
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
} 