import { Kline } from "../types";

export class DataProcessor {
    /**
     * 计算滚动窗口的最高/最低价
     * @param klines K线数组 (按时间升序排列)
     * @param windowSize 窗口大小
     */
    static calculateRollingIndicators(klines: Kline[], windowSize: number): Kline[] {
        if (klines.length === 0) return [];

        // 确保 K 线按时间戳升序排序 (OKX 返回的通常是降序，需要反转)
        const sortedKlines = [...klines].sort((a, b) => a.openTime - b.openTime);

        return sortedKlines.map((k, index) => {
            // 获取当前窗口内的 K 线
            const start = Math.max(0, index - windowSize + 1);
            const window = sortedKlines.slice(start, index + 1);

            const rollingHigh = Math.max(...window.map((w) => w.high));
            const rollingLow = Math.min(...window.map((w) => w.low));

            return {
                ...k,
                rollingHigh,
                rollingLow,
            };
        });
    }

    /**
     * 批量处理多交易对、多周期的指标
     */
    static processBatch(klines: Kline[], windowSize: number): Kline[] {
        // 按 symbol + timeframe 分组处理
        const groups: Record<string, Kline[]> = {};
        
        for (const k of klines) {
            const key = `${k.symbol}_${k.timeframe}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(k);
        }

        const processedKlines: Kline[] = [];
        for (const key in groups) {
            const groupKlines = groups[key];
            const processed = this.calculateRollingIndicators(groupKlines, windowSize);
            processedKlines.push(...processed);
        }

        return processedKlines;
    }
}
