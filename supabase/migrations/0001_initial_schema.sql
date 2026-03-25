-- 1. symbols table
create table if not exists symbols (
  id uuid primary key default gen_random_uuid(),
  symbol text unique not null,
  created_at timestamp with time zone default now()
);

-- 2. market_data (Top Gainers)
create table if not exists market_data (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  price numeric,
  change_24h numeric,
  high_24h numeric,
  low_24h numeric,
  volume_24h numeric,
  rank int,
  created_at timestamp with time zone default now()
);

-- 3. klines table
create table if not exists klines (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  timeframe text not null,
  timestamp bigint not null,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  volume numeric,
  unique(symbol, timeframe, timestamp)
);

-- 4. indicators table
create table if not exists indicators (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  timeframe text not null,
  rolling_high numeric,
  rolling_low numeric,
  created_at timestamp with time zone default now(),
  unique(symbol, timeframe)
);

-- Enable RLS (Optional but recommended)
alter table symbols enable row level security;
alter table market_data enable row level security;
alter table klines enable row level security;
alter table indicators enable row level security;

-- Simple policy for anon access (if needed, otherwise restrict)
create policy "Allow public read access" on symbols for select using (true);
create policy "Allow public read access" on market_data for select using (true);
create policy "Allow public read access" on klines for select using (true);
create policy "Allow public read access" on indicators for select using (true);
