import { SupabaseClient } from "@supabase/supabase-js";

export class ApiLayer {
    private client: SupabaseClient;

    constructor(client: SupabaseClient) {
        this.client = client;
    }

    /**
     * 从数据库获取当前追踪的涨幅榜
     */
    async getTopGainers(limit: number = 50) {
        const { data, error } = await this.client
            .from("symbols")
            .select("*")
            .eq("is_active", true)
            .order("change_24h", { ascending: false })
            .limit(limit);

        if (error) throw new Error(`API Error (getTopGainers): ${error.message}`);
        return data;
    }

    /**
     * 获取指定交易对的 K 线
     */
    async getKlines(symbol: string, timeframe: string, limit: number = 100) {
        const { data, error } = await this.client
            .from("klines")
            .select("*")
            .eq("symbol", symbol)
            .eq("timeframe", timeframe)
            .order("open_time", { ascending: false })
            .limit(limit);

        if (error) throw new Error(`API Error (getKlines): ${error.message}`);
        return data;
    }

    /**
     * 统一 JSON 响应格式化
     */
    static formatResponse(data: any, status: number = 200) {
        return new Response(JSON.stringify({
            success: true,
            timestamp: Date.now(),
            data
        }), {
            status,
            headers: { "Content-Type": "application/json" }
        });
    }

    static formatError(message: string, status: number = 500) {
        return new Response(JSON.stringify({
            success: false,
            timestamp: Date.now(),
            error: message
        }), {
            status,
            headers: { "Content-Type": "application/json" }
        });
    }
}
