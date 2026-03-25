import { Kline, MarketTicker, OKXResponse, OKXTicker, OKXCandle } from "./types";

export class DataFetcher {
    private baseUrl: string;

    constructor(baseUrl: string = "https://www.okx.com") {
        this.baseUrl = baseUrl;
    }

    async fetchTopGainers(topN: number = 50, minChange: number = 3): Promise<MarketTicker[]> {
        const url = `${this.baseUrl}/api/v5/market/tickers?instType=SPOT`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch tickers: ${response.statusText}`);

        const result = (await response.json()) as OKXResponse<OKXTicker>;
        if (result.code !== "0") throw new Error(`OKX API Error: ${result.msg}`);

        return result.data
            .filter((t) => t.instId.endsWith("-USDT"))
            .map((t) => {
                const last = parseFloat(t.last);
                const open = parseFloat(t.open24h);
                const change24h = open > 0 ? ((last - open) / open) * 100 : 0;
                return {
                    symbol: t.instId,
                    lastPrice: last,
                    change24h: change24h,
                    high24h: parseFloat(t.high24h),
                    low24h: parseFloat(t.low24h),
                    volume24h: parseFloat(t.volCcy24h),
                };
            })
            .filter((t) => t.change24h >= minChange && isFinite(t.change24h))
            .sort((a, b) => b.change24h - a.change24h)
            .slice(0, topN);
    }

    async fetchKlines(symbol: string, timeframe: string, limit: number = 100): Promise<Kline[]> {
        const url = `${this.baseUrl}/api/v5/market/candles?instId=${symbol}&bar=${timeframe}&limit=${limit}`;
        const response = await fetch(url);
        if (!response.ok) return [];

        const result = (await response.json()) as OKXResponse<OKXCandle>;
        if (result.code !== "0") return [];

        return result.data.map((c) => ({
            symbol,
            timeframe,
            openTime: parseInt(c[0]),
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[5]),
        }));
    }

    async fetchBatchKlines(symbols: string[], timeframes: string[], limit: number = 100, concurrency: number = 10): Promise<Kline[]> {
        const results: Kline[] = [];
        const tasks = symbols.flatMap(s => timeframes.map(tf => ({ s, tf })));

        for (let i = 0; i < tasks.length; i += concurrency) {
            const chunk = tasks.slice(i, i + concurrency);
            await Promise.all(chunk.map(async ({ s, tf }) => {
                const klines = await this.fetchKlines(s, tf, limit);
                results.push(...klines);
            }));
            // VPS 可以更快，这里只给 20ms 间隔
            await new Promise(r => setTimeout(r, 20));
        }
        return results;
    }
}
