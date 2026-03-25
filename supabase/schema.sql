-- ==========================================
-- Short Gainers Screener - Supabase Schema
-- ==========================================

-- 1. 交易对表
CREATE TABLE IF NOT EXISTS public.symbols (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,          -- 例如: 'BTC-USDT'
    rank INTEGER,                         -- 24h 涨幅榜排名
    is_active BOOLEAN DEFAULT TRUE,        -- 是否正在追踪
    last_price NUMERIC,                   -- 最新价格
    change_24h NUMERIC,                   -- 24小时涨幅 (%)
    high_24h NUMERIC,                     -- 24小时最高价
    low_24h NUMERIC,                      -- 24小时最低价
    volume_24h NUMERIC,                   -- 24小时成交量
    first_tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 首次开始追踪时间
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为排序添加索引
CREATE INDEX IF NOT EXISTS idx_symbols_rank ON public.symbols (rank ASC);

-- 2. K线数据表 (支持多周期)
CREATE TABLE IF NOT EXISTS public.klines (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,                  -- 交易对
    timeframe TEXT NOT NULL,               -- 周期: '5m', '1h', '1d' 等
    open_time BIGINT NOT NULL,             -- 开盘时间戳 (UTC)
    open_price NUMERIC NOT NULL,
    high_price NUMERIC NOT NULL,
    low_price NUMERIC NOT NULL,
    close_price NUMERIC NOT NULL,
    volume NUMERIC NOT NULL,
    -- 衍生指标 (由 data-processor 计算并填入)
    rolling_high NUMERIC,                  -- 滚动窗口最高价
    rolling_low NUMERIC,                   -- 滚动窗口最低价
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为 K线数据添加唯一约束，防止重复抓取
CREATE UNIQUE INDEX IF NOT EXISTS idx_klines_unique 
ON public.klines (symbol, timeframe, open_time);

-- 为查询性能添加索引
CREATE INDEX IF NOT EXISTS idx_klines_symbol_timeframe ON public.klines (symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_klines_open_time ON public.klines (open_time DESC);

-- 3. 实时涨幅快照 (可选，用于审计或 AI 训练)
CREATE TABLE IF NOT EXISTS public.market_snapshots (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    rank INTEGER,                         -- 涨幅榜排名
    change_percent NUMERIC,               -- 当时涨幅
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 开启 RLS (Row Level Security)
ALTER TABLE public.symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.klines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_snapshots ENABLE ROW LEVEL SECURITY;

-- 允许 Anon Role 读取数据 (根据需要配置)
CREATE POLICY "Allow Public Read" ON public.symbols FOR SELECT USING (true);
CREATE POLICY "Allow Public Read" ON public.klines FOR SELECT USING (true);

-- ==========================================
-- 4.逻辑抽象 (对应 README.md 中的存储概念)
-- ==========================================

-- 对应 README 中的 market_data: 提取核心行情数据
CREATE OR REPLACE VIEW public.market_data AS 
SELECT symbol, last_price, change_24h, high_24h, low_24h, volume_24h, rank, updated_at 
FROM public.symbols;

-- 对应 README 中的 indicators: 提取指标数据
CREATE OR REPLACE VIEW public.indicators AS 
SELECT id, symbol, timeframe, open_time, rolling_high, rolling_low, created_at
FROM public.klines;
