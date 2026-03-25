import express from "express";
import cron from "node-cron";
import dotenv from "dotenv";
import { DataFetcher } from "./data-fetcher";
import { DataProcessor } from "./data-processor";
import { StorageLayer } from "./storage-layer";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 环境参数
const OKX_BASE_URL = process.env.OKX_BASE_URL || "https://www.okx.com";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const TOP_N = parseInt(process.env.TOP_N || "50");
const MIN_CHANGE_PERCENT = parseFloat(process.env.MIN_CHANGE_PERCENT || "3");
const TIMEFRAMES = (process.env.TIMEFRAMES || "5m,15m,1h,4h,1d").split(",");
const ROLLING_WINDOW = parseInt(process.env.ROLLING_WINDOW || "50");
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "*/30 * * * *";
const TRACKING_DURATION_HOURS = parseInt(process.env.TRACKING_DURATION_HOURS || "24");

const storage = new StorageLayer(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const fetcher = new DataFetcher(OKX_BASE_URL);

/**
 * 核心任务逻辑
 */
async function runScraper() {
    console.log(`[${new Date().toISOString()}] Starting scraping task...`);
    try {
        // 1. 获取当前最新涨幅榜
        const tickers = await fetcher.fetchTopGainers(TOP_N, MIN_CHANGE_PERCENT);
        console.log(`- Found ${tickers.length} current gainers`);
        
        // 2. 标记这些币并更新实时行情
        await storage.upsertSymbols(tickers);

        // 3. 获取所有“正在追踪中”的币种 (之前上过榜但现在跌下来的)
        const activeSymbolsFromDb = await storage.getActiveSymbols(TRACKING_DURATION_HOURS);
        
        // 合并去重
        const symbolsToFetch = Array.from(new Set([...tickers.map(t => t.symbol), ...activeSymbolsFromDb]));
        console.log(`- Final tracking list: ${symbolsToFetch.length} symbols`);

        // 4. 批量抓取 K 线
        const rawKlines = await fetcher.fetchBatchKlines(symbolsToFetch, TIMEFRAMES, 100);
        console.log(`- Fetched ${rawKlines.length} klines total`);

        // 5. 计算指标
        const processedKlines = DataProcessor.processBatch(rawKlines, ROLLING_WINDOW);
        
        // 6. 存储结果
        await storage.saveKlines(processedKlines);

        // 7. 清理过期追踪
        await storage.deactivateStaleSymbols(TRACKING_DURATION_HOURS);
        
        console.log(`[${new Date().toISOString()}] Task completed successfully.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Task failed:`, error);
    }
}

// 1. 定时任务
cron.schedule(CRON_SCHEDULE, () => {
    runScraper();
});

// 2. API 路由与静态文件
app.use(express.static("public"));

app.get("/api/status", (req, res) => {
    res.json({ 
        message: "Short Gainers Screener VPS version is running",
        time: new Date().toISOString()
    });
});

app.get("/api/trigger", async (req, res) => {
    runScraper();
    res.json({ success: true, message: "Manual trigger started" });
});

// 获取追踪名单 (带实时行情)
app.get("/api/gainers", async (req, res) => {
    const { data, error } = await storage.client
        .from("symbols")
        .select("*")
        .eq("is_active", true)
        .order("change_24h", { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 获取指定币种和周期的 K 线 (带指标)
app.get("/api/klines", async (req, res) => {
    const symbol = req.query.symbol as string;
    const timeframe = req.query.timeframe as string;
    
    if (!symbol || !timeframe) {
        return res.status(400).json({ error: "Missing symbol or timeframe" });
    }

    const { data, error } = await storage.client
        .from("klines")
        .select("*")
        .eq("symbol", symbol)
        .eq("timeframe", timeframe)
        .order("open_time", { ascending: true })
        .limit(100);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${port}`);
    console.log(`Cron schedule: ${CRON_SCHEDULE}`);
    console.log(`Tracking duration: ${TRACKING_DURATION_HOURS}h`);
});
