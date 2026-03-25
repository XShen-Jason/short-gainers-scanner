import { OKXFetcher } from './data-fetcher/okx';
import { IndicatorProcessor } from './data-processor/indicators';
import { StorageLayer } from './storage-layer/supabase';
import { Env, Timeframe } from './types';
import { RateLimiter } from './utils/rate-limiter';
import { ApiHandler } from './api-layer';

async function syncData(env: Env) {
  const okx = new OKXFetcher(env.OKX_BASE_URL);
  const storage = new StorageLayer(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const limiter = new RateLimiter(5); // 5 calls per second

  console.log('Starting data synchronization...');

  try {
    // 1. Fetch Top Gainers
    const limit = parseInt(env.FETCH_LIMIT || '50');
    const gainers = await okx.getTopGainers(limit);
    console.log(`Fetched ${gainers.length} top gainers.`);

    // 2. Save symbols and market data
    await storage.upsertSymbols(gainers.map(g => g.symbol));
    await storage.saveMarketData(gainers);

    // 3. Fetch Klines and calculate indicators for each gainer in parallel timeframes
    const timeframes: Timeframe[] = ['5m', '15m', '1H', '4H', '1D'];
    const window = parseInt(env.ROLLING_WINDOW || '20');

    for (const gainer of gainers) {
      console.log(`Processing ${gainer.symbol}...`);
      await Promise.all(timeframes.map(async (tf) => {
        try {
          // Rule requirement: parallelized for different timeframes
          await limiter.wait();
          const klines = await okx.getKlines(gainer.symbol, tf, window + 10);
          await storage.upsertKlines(klines);

          const indicator = IndicatorProcessor.calculateRollingIndicators(klines, window);
          await storage.upsertIndicators([indicator]);
        } catch (err) {
          console.error(`Error processing ${gainer.symbol} ${tf}:`, err);
        }
      }));
    }

    console.log('Data synchronization completed.');
  } catch (err) {
    console.error('Data synchronization failed:', err);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle manual sync trigger
    if (url.pathname === '/api/sync') {
      ctx.waitUntil(syncData(env));
      return new Response('Sync started', { status: 202 });
    }

    // Delegate other API requests to ApiHandler
    return ApiHandler.handleRequest(request, env);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(syncData(env));
  },
};
