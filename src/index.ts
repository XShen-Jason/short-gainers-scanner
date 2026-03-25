import { DataFetcher } from "./data-fetcher";
import { DataProcessor } from "./data-processor";
import { StorageLayer } from "./storage-layer";
import { ApiLayer } from "./api-layer";

export interface Env {
	OKX_BASE_URL: string;
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string; // 使用 service_role 以绕过 RLS
	TOP_N: string;
	MIN_CHANGE_PERCENT: string;
	TIMEFRAMES: string;
	ROLLING_WINDOW: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const storage = new StorageLayer(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
		const api = new ApiLayer((storage as any).client); // Accessing the private client for API queries

		try {
			// 0. 根路径指引
			if (url.pathname === "/" || url.pathname === "") {
				return ApiLayer.formatResponse({
					message: "Short Gainers Screener API is running",
					usage: "Please use one of the follow endpoints",
					endpoints: {
						fetch_control: "/api/cron-fetch",
						view_gainers: "/api/gainers",
						view_klines: "/api/klines?symbol=BTC-USDT&timeframe=1h"
					}
				});
			}

			// 1. 触发数据抓取任务 (手动或通过定时触发器)
			if (url.pathname === "/api/cron-fetch") {
				const fetcher = new DataFetcher(env.OKX_BASE_URL);
				const topN = parseInt(env.TOP_N) || 50;
				const minChange = parseFloat(env.MIN_CHANGE_PERCENT) || 3;
				const timeframes = (env.TIMEFRAMES || "5m,15m,1h,4h,1d").split(",");
				const windowSize = parseInt(env.ROLLING_WINDOW) || 50;
				const trackingHours = parseInt((env as any).TRACKING_DURATION_HOURS) || 24;

				// 1. 获取最新涨幅榜
				const tickers = await fetcher.fetchTopGainers(topN, minChange);
				
				// 2. 标记这些币为活跃 (并更新行情)
				await storage.upsertSymbols(tickers);
				await storage.saveSnapshots(tickers);

				// 3. 获取所有“正在追踪中”的币种 (包括那些已经跌下涨幅榜但还在设定窗口内的)
				const activeSymbols = await storage.getActiveSymbols(trackingHours);
				
				// 合并去重
				const symbolsToFetch = Array.from(new Set([...tickers.map(t => t.symbol), ...activeSymbols]));

				// 4. 批量抓取 K 线
				const rawKlines = await fetcher.fetchBatchKlines(symbolsToFetch, timeframes, 100);

				// 5. 计算指标
				const processedKlines = DataProcessor.processBatch(rawKlines, windowSize);

				// 6. 存储 K 线
				await storage.saveKlines(processedKlines);

				// 7. 清理过期追踪
				await storage.deactivateStaleSymbols(trackingHours);

				return ApiLayer.formatResponse({ 
					message: "Tracking task completed", 
					gainers_count: tickers.length,
					total_tracked_count: symbolsToFetch.length 
				});
			}

			// 2. 获取涨幅榜数据
			if (url.pathname === "/api/gainers") {
				const data = await api.getTopGainers(parseInt(env.TOP_N) || 50);
				return ApiLayer.formatResponse(data);
			}

			// 3. 获取特定 K 线数据
			if (url.pathname === "/api/klines") {
				const symbol = url.searchParams.get("symbol");
				const timeframe = url.searchParams.get("timeframe") || "1h";
				if (!symbol) return ApiLayer.formatError("Missing symbol parameter", 400);

				const data = await api.getKlines(symbol, timeframe);
				return ApiLayer.formatResponse(data);
			}

			return ApiLayer.formatError("Route not found", 404);

		} catch (error: any) {
			console.error(error);
			return ApiLayer.formatError(error.message, 500);
		}
	},
} satisfies ExportedHandler<Env>;
