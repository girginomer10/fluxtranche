export const CEX_CONFIG = {
    CEX_PRIORITY: ['binance', 'kucoin', 'htx', 'bitget', 'mexc', 'gate'],
    QUOTE_PRIORITY: ['USDT', 'USDC', 'USD', 'BUSD', 'TUSD'],
    BINANCE_API_BASE_URL: 'https://api.binance.com',
    // Using a proxy for binance as in SSOT
    BINANCE_PROXY_URL: 'http://144.91.93.154:8080',
    DEXSCREENER_PROXY_URL: 'http://144.91.93.154:3031'
};

export const DYDX_CONFIG = {
    ENABLED: true,
    INDEXER_URL: 'https://indexer.dydx.trade',
    MARKET_SUFFIX: '-USD'
};
