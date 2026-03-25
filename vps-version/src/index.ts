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
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "*/30 * * * *"; // 默认每30分钟

const storage = new StorageLayer(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const fetcher = new DataFetcher(OKX_BASE_URL);

/**
 * 核心任务逻辑
 */
async function runScraper() {
    console.log(`[${new Date().toISOString()}] Starting scraping task...`);
    try {
        const tickers = await fetcher.fetchTopGainers(TOP_N, MIN_CHANGE_PERCENT);
        console.log(`- Found ${tickers.length} tickers`);
        await storage.upsertSymbols(tickers);

        const symbols = tickers.map(t => t.symbol);
        const rawKlines = await fetcher.fetchBatchKlines(symbols, TIMEFRAMES, 100);
        console.log(`- Fetched ${rawKlines.length} klines`);

        const processedKlines = DataProcessor.processBatch(rawKlines, ROLLING_WINDOW);
        await storage.saveKlines(processedKlines);
        console.log(`[${new Date().toISOString()}] Task completed successfully.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Task failed:`, error);
    }
}

// 1. 定时任务
cron.schedule(CRON_SCHEDULE, () => {
    runScraper();
});

// 2. API 路由
app.get("/", (req, res) => {
    res.json({ message: "Short Gainers Screener VPS version is running" });
});

app.get("/api/trigger", async (req, res) => {
    runScraper();
    res.json({ success: true, message: "Manual trigger started" });
});

app.get("/api/gainers", async (req, res) => {
    const { data, error } = await storage.client
        .from("symbols")
        .select("*")
        .order("change_24h", { ascending: false })
        .limit(TOP_N);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`Cron schedule: ${CRON_SCHEDULE}`);
});
