import { StorageLayer } from '../storage-layer/supabase';
import { Env } from '../types';

export class ApiHandler {
  static async handleRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const storage = new StorageLayer(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    try {
      if (url.pathname === '/api/gainers') {
        const data = await storage.getGainers();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname.startsWith('/api/klines')) {
        const symbol = url.searchParams.get('symbol');
        const tf = url.searchParams.get('tf') || '1H';
        if (!symbol) return new Response('Missing symbol', { status: 400 });

        const data = await storage.getKlinesBySymbol(symbol, tf);
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
