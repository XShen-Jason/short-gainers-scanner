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
        const now = new Date().toISOString();
        const { error } = await this.client.from("symbols").upsert(
            tickers.map((t) => ({
                symbol: t.symbol,
                rank: (t as any).rank || null,
                last_price: t.lastPrice,
                change_24h: t.change24h,
                high_24h: t.high24h,
                low_24h: t.low24h,
                volume_24h: t.volume24h,
                is_active: true,
                first_tracked_at: now, // 核心修复：重置“死亡时钟”
                updated_at: now,
            })),
            { onConflict: "symbol" }
        );

        if (error) throw new Error(`Supabase Upsert Symbols Error: ${error.message}`);
    }

    /**
     * 获取当前处于活跃追踪状态的币种
     */
    async getActiveSymbols(maxDurationHours: number): Promise<string[]> {
        const cutoff = new Date(Date.now() - maxDurationHours * 60 * 60 * 1000).toISOString();
        const { data, error } = await this.client
            .from("symbols")
            .select("symbol")
            .eq("is_active", true)
            .gt("first_tracked_at", cutoff);

        if (error) throw new Error(`Supabase Get Active Symbols Error: ${error.message}`);
        return data.map((d: any) => d.symbol);
    }

    /**
     * 清理不再追踪的币种状态
     */
    async deactivateStaleSymbols(maxDurationHours: number) {
        const cutoff = new Date(Date.now() - maxDurationHours * 60 * 60 * 1000).toISOString();
        await this.client
            .from("symbols")
            .update({ is_active: false })
            .lt("first_tracked_at", cutoff);
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
