import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Kline, MarketTicker } from "./types";

export class StorageLayer {
    public client: SupabaseClient;

    constructor(url: string, key: string) {
        this.client = createClient(url, key);
    }

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
        if (error) throw new Error(`Supabase Error: ${error.message}`);
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
