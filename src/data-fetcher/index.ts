import { Kline, MarketTicker, OKXResponse, OKXTicker, OKXCandle } from "../types";

export class DataFetcher {
    private baseUrl: string;

    constructor(baseUrl: string = "https://www.okx.com") {
        this.baseUrl = baseUrl;
    }

    /**
     * 获取 OKX 涨幅榜并筛选 Top N
     */
    async fetchTopGainers(topN: number = 50, minChange: number = 3): Promise<MarketTicker[]> {
        const url = `${this.baseUrl}/api/v5/market/tickers?instType=SPOT`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch tickers: ${response.statusText}`);
        }

        const result = (await response.json()) as OKXResponse<OKXTicker>;
        if (result.code !== "0") {
            throw new Error(`OKX API Error: ${result.msg}`);
        }

        // 统一处理数据：筛选 USDT 结算的币种，计算 24h 涨幅
        const tickers: MarketTicker[] = result.data
            .filter((t) => t.instId.endsWith("-USDT")) // 只关注 USDT 交易对
            .map((t) => {
                const last = parseFloat(t.last);
                const open = parseFloat(t.open24h);
                const change = ((last - open) / open) * 100;
                return {
                    symbol: t.instId,
                    lastPrice: last,
                    change24h: change,
                    high24h: parseFloat(t.high24h),
                    low24h: parseFloat(t.low24h),
                    volume24h: parseFloat(t.volCcy24h), // 成交金额 (USDT)
                };
            })
            // 筛选涨幅超过阈值且为正值的币种
            .filter((t) => t.change24h >= minChange)
            // 按涨幅降序排列
            .sort((a, b) => b.change24h - a.change24h)
            // 取前 N 名
            .slice(0, topN);

        return tickers;
    }

    /**
     * 获取指定交易对和周期的 K 线数据
     */
    async fetchKlines(symbol: string, timeframe: string, limit: number = 100): Promise<Kline[]> {
        // OKX 的 bar 周期对照：5m, 1h, 1d 等通常直接支持
        const url = `${this.baseUrl}/api/v5/market/candles?instId=${symbol}&bar=${timeframe}&limit=${limit}`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Error fetching klines for ${symbol}: ${response.statusText}`);
            return [];
        }

        const result = (await response.json()) as OKXResponse<OKXCandle>;
        if (result.code !== "0") {
            console.error(`OKX API Error for ${symbol}: ${result.msg}`);
            return [];
        }

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

    /**
     * 并发控制批量抓取 K 线
     */
    async fetchBatchKlines(
        symbols: string[],
        timeframes: string[],
        limit: number = 100,
        concurrency: number = 5
    ): Promise<Kline[]> {
        const results: Kline[] = [];
        const tasks: Array<() => Promise<void>> = [];

        for (const symbol of symbols) {
            for (const timeframe of timeframes) {
                tasks.push(async () => {
                    const klines = await this.fetchKlines(symbol, timeframe, limit);
                    results.push(...klines);
                });
            }
        }

        // 简单的并发控制 (Promise 池)
        for (let i = 0; i < tasks.length; i += concurrency) {
            const chunk = tasks.slice(i, i + concurrency);
            await Promise.all(chunk.map((task) => task()));
            // 可选：添加小额延迟以规避限速
            await new Promise((r) => setTimeout(r, 100));
        }

        return results;
    }
}
