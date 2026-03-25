import { MarketData, Kline, Timeframe, OKXResponse, OKXMarketTicker, OKXCandle } from '../types';

export class OKXFetcher {
  private baseUrl: string;

  constructor(baseurl: string = 'https://www.okx.com') {
    this.baseUrl = baseurl;
  }

  /**
   * Fetch all spot tickers and filter for top gainers
   */
  async getTopGainers(limit: number = 50): Promise<MarketData[]> {
    const url = `${this.baseUrl}/api/v5/market/tickers?instType=SPOT`;
    const response = await fetch(url);
    const data = await response.json() as OKXResponse<OKXMarketTicker[]>;

    if (data.code !== '0') {
      throw new Error(`OKX API Error (code ${data.code}): ${data.msg}`);
    }

    const tickers: MarketData[] = data.data.map((t) => ({
      symbol: t.instId,
      price: parseFloat(t.last),
      change_24h: (parseFloat(t.last) - parseFloat(t.open24h)) / parseFloat(t.open24h) * 100,
      high_24h: parseFloat(t.high24h),
      low_24h: parseFloat(t.low24h),
      volume_24h: parseFloat(t.vol24h),
      rank: 0, // Will be calculated after sorting
    }));

    // Sort by 24h change percentage descending
    tickers.sort((a, b) => b.change_24h - a.change_24h);

    // Assign rank and slice to limit
    return tickers.slice(0, limit).map((t, index) => ({
      ...t,
      rank: index + 1,
    }));
  }

  /**
   * Fetch klines for a specific symbol and timeframe
   */
  async getKlines(symbol: string, timeframe: Timeframe, limit: number = 100): Promise<Kline[]> {
    // OKX expects uppercase for H and D, and lower for m
    const bar = timeframe.toLowerCase() === '1h' ? '1H' : 
                timeframe.toLowerCase() === '4h' ? '4H' :
                timeframe.toLowerCase() === '1d' ? '1D' : timeframe;

    const url = `${this.baseUrl}/api/v5/market/candles?instId=${symbol}&bar=${bar}&limit=${limit}`;
    const response = await fetch(url);
    const data = await response.json() as OKXResponse<OKXCandle[]>;

    if (data.code !== '0') {
      throw new Error(`OKX API Error (code ${data.code}): ${data.msg} for ${symbol} ${timeframe}`);
    }

    // OKX candles format: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
    return data.data.map((k) => ({
      symbol,
      timeframe,
      timestamp: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  }
}
