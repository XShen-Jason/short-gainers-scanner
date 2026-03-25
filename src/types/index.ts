// 统一市场数据结构
export interface MarketTicker {
    symbol: string;        // 例如: 'BTC-USDT'
    lastPrice: number;
    change24h: number;     // 24小时涨幅百分比
    high24h: number;
    low24h: number;
    volume24h: number;
}

// 统一K线数据结构
export interface Kline {
    symbol: string;
    timeframe: string;
    openTime: number;      // 开盘毫秒时间戳
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    // 衍生指标 (可选)
    rollingHigh?: number;
    rollingLow?: number;
}

// OKX API 原始响应类型 (部分字段)
export interface OKXTicker {
    instId: string;
    last: string;
    open24h: string;
    high24h: string;
    low24h: string;
    vol24h: string;
    volCcy24h: string;
}

// OKX K线原始数据是一个数组: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
export type OKXCandle = [string, string, string, string, string, string, string, string, string];

export interface OKXResponse<T> {
    code: string;
    msg: string;
    data: T[];
}
