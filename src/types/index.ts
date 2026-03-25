export interface Symbol {
  id?: string;
  symbol: string;
  created_at?: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change_24h: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  rank: number;
  created_at?: string;
}

export interface Kline {
  symbol: string;
  timeframe: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicator {
  symbol: string;
  timeframe: string;
  rolling_high: number;
  rolling_low: number;
  created_at?: string;
}

export type Timeframe = '5m' | '15m' | '1H' | '4H' | '1D';

export interface Env {
  OKX_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  FETCH_LIMIT: string;
  ROLLING_WINDOW: string;
}

// OKX API Response Types
export interface OKXResponse<T> {
  code: string;
  msg: string;
  data: T;
}

export interface OKXMarketTicker {
  instId: string;
  last: string;
  open24h: string;
  high24h: string;
  low24h: string;
  vol24h: string;
  volCcy24h: string;
  ts: string;
}

// OKX Candle: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
export type OKXCandle = [string, string, string, string, string, string, string, string, string];
