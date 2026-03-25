export interface MarketTicker {
    symbol: string;
    lastPrice: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
}

export interface Kline {
    symbol: string;
    timeframe: string;
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    rollingHigh?: number;
    rollingLow?: number;
}

export interface OKXResponse<T> {
    code: string;
    msg: string;
    data: T[];
}

export interface OKXTicker {
    instId: string;
    last: string;
    open24h: string;
    high24h: string;
    low24h: string;
    vol24h: string;
    volCcy24h: string;
}

export type OKXCandle = [string, string, string, string, string, string, string, string, string];
