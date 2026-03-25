import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Symbol, MarketData, Kline, Indicator } from '../types';

export class StorageLayer {
  private supabase: SupabaseClient;

  constructor(url: string, key: string) {
    this.supabase = createClient(url, key);
  }

  async upsertSymbols(symbols: string[]): Promise<void> {
    const data = symbols.map(s => ({ symbol: s }));
    const { error } = await this.supabase
      .from('symbols')
      .upsert(data, { onConflict: 'symbol' });

    if (error) throw error;
  }

  async saveMarketData(marketData: MarketData[]): Promise<void> {
    const { error } = await this.supabase
      .from('market_data')
      .insert(marketData);

    if (error) throw error;
  }

  async upsertKlines(klines: Kline[]): Promise<void> {
    const { error } = await this.supabase
      .from('klines')
      .upsert(klines, { onConflict: 'symbol,timeframe,timestamp' });

    if (error) throw error;
  }

  async upsertIndicators(indicators: Indicator[]): Promise<void> {
    const { error } = await this.supabase
      .from('indicators')
      .upsert(indicators, { onConflict: 'symbol,timeframe' });

    if (error) throw error;
  }

  async getGainers(): Promise<MarketData[]> {
    const { data, error } = await this.supabase
      .from('market_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  }

  async getKlinesBySymbol(symbol: string, timeframe: string): Promise<Kline[]> {
    const { data, error } = await this.supabase
      .from('klines')
      .select('*')
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  }
}
