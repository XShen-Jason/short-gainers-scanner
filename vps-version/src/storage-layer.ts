import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Kline, MarketTicker } from "./types";

export class StorageLayer {
    public client: SupabaseClient;

    constructor(url: string, key: string) {
        this.client = createClient(url, key);
    }

    async upsertSymbols(tickers: MarketTicker[]) {
        const now = new Date().toISOString();
        const { error } = await this.client.from("symbols").upsert(
            tickers.map((t, index) => ({
                symbol: t.symbol,
                rank: (t as any).rank || index + 1,
                last_price: t.lastPrice,
                change_24h: t.change24h,
                high_24h: t.high24h,
                low_24h: t.low24h,
                volume_24h: t.volume24h,
                is_active: true,
                first_tracked_at: now, // 核心修复：更新活跃币种的基准系统时间，重置延时关停时钟
                updated_at: now,
            })),
            { onConflict: "symbol" }
        );
        if (error) throw new Error(`Supabase Error: ${error.message}`);
    }

    async getActiveSymbols(maxDurationHours: number): Promise<string[]> {
        const cutoff = new Date(Date.now() - maxDurationHours * 60 * 60 * 1000).toISOString();
        const { data, error } = await this.client
            .from("symbols")
            .select("symbol")
            .eq("is_active", true)
            .gt("first_tracked_at", cutoff);

        if (error) throw new Error(`Supabase Error: ${error.message}`);
        return (data || []).map((d: any) => d.symbol);
    }

    async deactivateStaleSymbols(maxDurationHours: number) {
        const cutoff = new Date(Date.now() - maxDurationHours * 60 * 60 * 1000).toISOString();
        await this.client
            .from("symbols")
            .update({ is_active: false })
            .lt("first_tracked_at", cutoff);
    }

    async saveKlines(klines: Kline[]) {
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
        if (error) throw new Error(`Supabase Error: ${error.message}`);
    }
}
