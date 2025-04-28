export const URLs = {
    DEMO_URL:       "https://demo.tradovateapi.com/v1",
    LIVE_URL:       'https://live.tradovateapi.com/v1',
    MD_URL:         'wss://md.tradovateapi.com/v1/websocket',
    MD_DEMO_URL:    'wss://md-demo.tradovateapi.com/v1/websocket',
    WS_DEMO_URL:    'wss://demo.tradovateapi.com/v1/websocket',
    WS_LIVE_URL:    'wss://live.tradovateapi.com/v1/websocket',
    CHART_DATA_URL: (r = Math.random()) => `wss://md-demo.tradovateapi.com/v1/websocket?r=${r}`
}