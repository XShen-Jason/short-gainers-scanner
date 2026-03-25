import { Kline, Indicator } from '../types';

export class IndicatorProcessor {
  /**
   * Calculate rolling high and rolling low for a list of klines
   * @param klines List of klines sorted by timestamp (newest first for OKX)
   * @param window Size of the rolling window
   */
  static calculateRollingIndicators(klines: Kline[], window: number): Indicator {
    if (klines.length === 0) {
      throw new Error('Cannot calculate indicators for empty kline list');
    }

    const symbol = klines[0].symbol;
    const timeframe = klines[0].timeframe;

    // OKX candles are returned newest first by default
    const windowKlines = klines.slice(0, window);

    const highPrices = windowKlines.map(k => k.high);
    const lowPrices = windowKlines.map(k => k.low);

    return {
      symbol,
      timeframe,
      rolling_high: Math.max(...highPrices),
      rolling_low: Math.min(...lowPrices),
    };
  }
}
