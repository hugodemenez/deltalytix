import { apiKey } from './helpers';

interface SpotV1LatestTick {
    TYPE: string;
    INSTRUMENT: string;
    CCSEQ: number;
    MAPPED_INSTRUMENT: string;
    MARKET: string;
    CURRENT_HOUR_VOLUME: number;
    CURRENT_HOUR_VOLUME_BUY: number;
    CURRENT_HOUR_VOLUME_SELL: number;
    CURRENT_HOUR_VOLUME_UNKNOWN: number;
    CURRENT_HOUR_QUOTE_VOLUME: number;
    CURRENT_HOUR_QUOTE_VOLUME_BUY: number;
    CURRENT_HOUR_QUOTE_VOLUME_SELL: number;
    CURRENT_HOUR_QUOTE_VOLUME_UNKNOWN: number;
    CURRENT_HOUR_OPEN: number;
    CURRENT_HOUR_HIGH: number;
    CURRENT_HOUR_LOW: number;
    CURRENT_HOUR_TOTAL_TRADES: number;
    CURRENT_HOUR_TOTAL_TRADES_BUY: number;
    CURRENT_HOUR_TOTAL_TRADES_SELL: number;
    CURRENT_HOUR_TOTAL_TRADES_UNKNOWN: number;
    CURRENT_HOUR_CHANGE: number;
    CURRENT_HOUR_CHANGE_PERCENTAGE: number;
    PRICE: number;
    PRICE_FLAG: string;
    PRICE_LAST_UPDATE_TS: number;
    PRICE_LAST_UPDATE_TS_NS: number;
}

const socket = new WebSocket(
    'wss://data-streamer.cryptocompare.com/?api_key=' + apiKey
);

const channelToSubscription = new Map();

socket.addEventListener('open', () => {
    console.log('[socket] Connected');
});

socket.addEventListener('close', (reason) => {
    console.log('[socket] Disconnected:', reason);
});

socket.addEventListener('error', (error) => {
    console.log('[socket] Error:', error);
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data) as SpotV1LatestTick;
    console.log('[socket] Message:', data);

    if (data.TYPE !== "959") {
        // Skip all non-spot tick events
        return;
    }

    const channelString = `spot_v1_latest_tick~${data.MARKET}~${data.INSTRUMENT}`;
    const subscriptionItem = channelToSubscription.get(channelString);
    if (subscriptionItem === undefined) {
        return;
    }

    const bar = {
        time: data.PRICE_LAST_UPDATE_TS * 1000, // Convert to milliseconds
        open: data.CURRENT_HOUR_OPEN,
        high: data.CURRENT_HOUR_HIGH,
        low: data.CURRENT_HOUR_LOW,
        close: data.PRICE,
        volume: data.CURRENT_HOUR_VOLUME,
        // Additional useful information
        quoteVolume: data.CURRENT_HOUR_QUOTE_VOLUME,
        totalTrades: data.CURRENT_HOUR_TOTAL_TRADES,
        change: data.CURRENT_HOUR_CHANGE,
        changePercentage: data.CURRENT_HOUR_CHANGE_PERCENTAGE,
        priceFlag: data.PRICE_FLAG
    };

    // Send data to every subscriber of that symbol
    subscriptionItem.handlers.forEach((handler: { id: string; callback: (bar: any) => void }) => handler.callback(bar));
});

export function subscribeOnStream(
    symbolInfo: any,
    resolution: string,
    onRealtimeCallback: (bar: any) => void,
    subscriberUID: string,
    onResetCacheNeededCallback: () => void,
    lastDailyBar: any
) {
    const parsedSymbol = symbolInfo.name.split('-');
    if (!parsedSymbol || parsedSymbol.length !== 2) {
        console.error('Invalid symbol format');
        return;
    }

    const [fromSymbol, toSymbol] = parsedSymbol;
    const market = symbolInfo.exchange.toLowerCase();
    const channelString = `spot_v1_latest_tick~${market}~${fromSymbol}-${toSymbol}`;
    
    const handler = {
        id: subscriberUID,
        callback: onRealtimeCallback,
    };

    let subscriptionItem = channelToSubscription.get(channelString);
    if (subscriptionItem) {
        subscriptionItem.handlers.push(handler);
        return;
    }

    subscriptionItem = {
        subscriberUID,
        resolution,
        lastDailyBar,
        handlers: [handler],
    };

    channelToSubscription.set(channelString, subscriptionItem);
    console.log('[subscribeBars]: Subscribe to streaming. Channel:', channelString);

    const subRequest = {
        action: "SUBSCRIBE",
        type: "spot_v1_latest_tick",
        groups: ["VALUE", "CURRENT_DAY"],
        market: market,
        instruments: [`${fromSymbol}-${toSymbol}`]
    };

    socket.send(JSON.stringify(subRequest));
}

export function unsubscribeFromStream(subscriberUID: string) {
    // Find a subscription with id === subscriberUID
    for (const channelString of channelToSubscription.keys()) {
        const subscriptionItem = channelToSubscription.get(channelString);
        const handlerIndex = subscriptionItem.handlers.findIndex(
            (handler: { id: string; callback: (bar: any) => void }) => handler.id === subscriberUID
        );
        if (handlerIndex !== -1) {
            // Remove from handlers
            subscriptionItem.handlers.splice(handlerIndex, 1);
            if (subscriptionItem.handlers.length === 0) {
                // Unsubscribe from the channel if it was the last handler
                console.log(
                    '[unsubscribeBars]: Unsubscribe from streaming. Channel:',
                    channelString
                );
                
                const [_, market, instrument] = channelString.split('~');
                const subRequest = {
                    action: "SUB_REMOVE",
                    type: "1101",
                    groups: ["VALUE", "CURRENT_DAY"],
                    subscriptions: [{
                        market: market,
                        instrument: instrument
                    }]
                };
                
                socket.send(JSON.stringify(subRequest));
                channelToSubscription.delete(channelString);
                break;
            }
        }
    }
}