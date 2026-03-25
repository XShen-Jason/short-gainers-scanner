import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Kline, MarketTicker } from "../types";

export class StorageLayer {
    private client: SupabaseClient;

    constructor(url: string, key: string) {
        this.client = createClient(url, key);
    }

    /**
     * 更新或插入交易对基础信息
     */
    async upsertSymbols(tickers: MarketTicker[]) {
        const { error } = await this.client.from("symbols").upsert(
            tickers.map((t) => ({
                symbol: t.symbol,
                last_price: t.lastPrice,
                change_24h: t.change24h,
                high_24h: t.high24h,
                low_24h: t.low24h,
                volume_24h: t.volume24h,
                updated_at: new Date().toISOString(),
            })),
            { onConflict: "symbol" }
        );

        if (error) throw new Error(`Supabase Upsert Symbols Error: ${error.message}`);
    }

    /**
     * 批量保存 K 线及其指标
     */
    async saveKlines(klines: Kline[]) {
        // 由于 K 线数据量可能较大，且 idx_klines_unique 已在数据库层处理冲突
        const { error } = await this.client.from("klines").upsert(
            klines.map((k) => ({
                symbol: k.symbol,
                timeframe: k.timeframe,
                open_time: k.openTime,
                open_price: k.open,
                high_price: k.high,
                low_price: k.low,
                close_price: k.close,
                volume: k.volume,
                rolling_high: k.rollingHigh,
                rolling_low: k.rollingLow,
            })),
            { onConflict: "symbol,timeframe,open_time" }
        );

        if (error) throw new Error(`Supabase Upsert Klines Error: ${error.message}`);
    }

    /**
     * 记录市场涨幅快照
     */
    async saveSnapshots(tickers: MarketTicker[]) {
        const { error } = await this.client.from("market_snapshots").insert(
            tickers.map((t, index) => ({
                symbol: t.symbol,
                rank: index + 1,
                change_percent: t.change24h,
            }))
        );

        if (error) throw new Error(`Supabase Insert Snapshots Error: ${error.message}`);
    }
}
