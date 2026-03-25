import { Kline } from "./types";

export class DataProcessor {
    static calculateRollingIndicators(klines: Kline[], windowSize: number): Kline[] {
        if (klines.length === 0) return [];
        const sortedKlines = [...klines].sort((a, b) => a.openTime - b.openTime);
        return sortedKlines.map((k, index) => {
            const start = Math.max(0, index - windowSize + 1);
            const window = sortedKlines.slice(start, index + 1);
            return {
                ...k,
                rollingHigh: Math.max(...window.map(w => w.high)),
                rollingLow: Math.min(...window.map(w => w.low)),
            };
        });
    }

    static processBatch(klines: Kline[], windowSize: number): Kline[] {
        const groups: Record<string, Kline[]> = {};
        for (const k of klines) {
            const key = `${k.symbol}_${k.timeframe}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(k);
        }
        return Object.values(groups).flatMap(group => this.calculateRollingIndicators(group, windowSize));
    }
}
