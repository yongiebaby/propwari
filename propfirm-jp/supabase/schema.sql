-- =========================================================
-- プロップ割  スキーマ v2（Supabase / PostgreSQL）
-- v1からの変更点
--   firms.verify_status            … 情報の確認状況（公式／二次情報／未確認）
--   programs.slug                  … URLアンカーとシードの照合キー
--   programs.daily_dd_amount_base  … 日次損失「額」が初期残高×%か、基準額×%か
--   programs.consistency_scope     … 一貫性ルールが評価中か報酬申請時か
--   programs.copy_note / payout_cap_note / notes
--   program_phases.min_trades      … 最低取引回数（Funded7など）
--   programs.prices_verified       … 価格の確認状況（ルールとは別管理）
-- =========================================================

create type availability as enum ('yes', 'conditional', 'no', 'unknown');
create type firm_status as enum ('active', 'paused', 'closed');
create type verify_status as enum ('unverified', 'secondary', 'official');
create type challenge_type as enum ('one_step', 'two_step', 'three_step', 'instant');
create type kyc_timing as enum ('before_purchase', 'before_funded', 'before_payout', 'unknown');
create type daily_dd_basis as enum (
  'start_of_day_balance', 'start_of_day_equity', 'higher_of_balance_equity', 'initial_balance', 'none'
);
create type daily_dd_amount_base as enum ('initial', 'reference');
create type max_dd_type as enum (
  'static', 'trailing_balance', 'trailing_equity', 'trailing_lock_at_initial', 'eod_trailing'
);
create type consistency_scope as enum ('evaluation', 'payout');

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- firms ----------
create table firms (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  name              text not null,
  website_url       text,
  affiliate_url     text,
  hq_country        text,
  status            firm_status not null default 'active',
  jp_residents      availability not null default 'unknown',
  jp_payout_proof   availability not null default 'unknown',
  jp_card_accepted  availability not null default 'unknown',
  crypto_payment    boolean,
  jp_support        boolean,
  jp_note           text,
  kyc_timing        kyc_timing not null default 'unknown',
  payout_methods    text[] not null default '{}',
  risk_note         text,
  source_url        text,
  verify_status     verify_status not null default 'unverified',
  last_verified_at  date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_firms_updated before update on firms
  for each row execute function public.set_updated_at();

-- ---------- programs ----------
create table programs (
  id                    uuid primary key default gen_random_uuid(),
  firm_id               uuid not null references firms(id) on delete cascade,
  slug                  text not null,
  name                  text not null,
  challenge_type        challenge_type not null,
  platforms             text[] not null default '{}',

  daily_dd_pct          numeric(5,2),
  daily_dd_basis        daily_dd_basis not null default 'start_of_day_balance',
  daily_dd_amount_base  daily_dd_amount_base not null default 'reference',
  daily_dd_reset_time   time,
  daily_dd_reset_tz     text,      -- IANA。NYクローズ型は 17:00 America/New_York
  max_dd_pct            numeric(5,2) not null,
  max_dd_type           max_dd_type not null default 'static',

  news_trading          availability not null default 'unknown',
  news_note             text,
  weekend_holding       availability not null default 'unknown',
  ea_allowed            availability not null default 'unknown',
  ea_note               text,
  copy_trading          availability not null default 'unknown',
  copy_note             text,
  hft_arb_note          text,
  consistency_rule_pct  numeric(5,2),
  consistency_scope     consistency_scope,   -- nullなら一貫性ルールなし
  consistency_note      text,
  max_lot_note          text,

  leverage_fx           text,
  leverage_metals       text,
  leverage_indices      text,
  leverage_crypto       text,
  commission_note       text,

  profit_split_pct      numeric(5,2),
  profit_split_max_pct  numeric(5,2),
  first_payout_days     int,
  payout_frequency      text,
  payout_cap_note       text,
  fee_refund            boolean,
  scaling_note          text,
  prices_verified       boolean not null default false,  -- 価格を公式で確認済みか
  notes                 text,

  is_active             boolean not null default true,
  source_url            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (firm_id, slug)
);
create index on programs (firm_id);
create trigger trg_programs_updated before update on programs
  for each row execute function public.set_updated_at();

-- ---------- program_phases ----------
create table program_phases (
  id                uuid primary key default gen_random_uuid(),
  program_id        uuid not null references programs(id) on delete cascade,
  phase_no          int not null,
  profit_target_pct numeric(5,2) not null,
  min_trading_days  int not null default 0,
  min_trades        int not null default 0,
  max_days          int,
  unique (program_id, phase_no)
);

-- ---------- account_sizes ----------
create table account_sizes (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs(id) on delete cascade,
  balance     numeric(14,2) not null,
  price       numeric(12,2) not null,
  currency    text not null default 'USD' check (currency in ('JPY', 'USD', 'EUR')),
  is_active   boolean not null default true,
  unique (program_id, balance)
);

-- ---------- 割引コード / キャッシュバック ----------
create table discount_codes (
  id            uuid primary key default gen_random_uuid(),
  firm_id       uuid not null references firms(id) on delete cascade,
  code          text not null,
  discount_pct  numeric(5,2) not null,
  applies_note  text,
  valid_until   date,
  is_active     boolean not null default true
);
create index on discount_codes (firm_id);

create table cashback_offers (
  id            uuid primary key default gen_random_uuid(),
  firm_id       uuid not null references firms(id) on delete cascade,
  cashback_pct  numeric(5,2) not null,
  note          text,
  is_active     boolean not null default true
);
create index on cashback_offers (firm_id);

-- ---------- 規約変更履歴 ----------
create table rule_changes (
  id          bigserial primary key,
  table_name  text not null,
  record_id   uuid not null,
  old_data    jsonb,
  new_data    jsonb,
  changed_at  timestamptz not null default now()
);

create or replace function public.log_rule_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if to_jsonb(old) - 'updated_at' is distinct from to_jsonb(new) - 'updated_at' then
    insert into public.rule_changes (table_name, record_id, old_data, new_data)
    values (tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger trg_firms_log after update on firms
  for each row execute function public.log_rule_change();
create trigger trg_programs_log after update on programs
  for each row execute function public.log_rule_change();

-- ---------- RLS: 公開は読み取りのみ。書き込みは service_role から ----------
alter table firms           enable row level security;
alter table programs        enable row level security;
alter table program_phases  enable row level security;
alter table account_sizes   enable row level security;
alter table discount_codes  enable row level security;
alter table cashback_offers enable row level security;
alter table rule_changes    enable row level security;

create policy "public read" on firms           for select using (true);
create policy "public read" on programs        for select using (true);
create policy "public read" on program_phases  for select using (true);
create policy "public read" on account_sizes   for select using (true);
create policy "public read" on discount_codes  for select using (true);
create policy "public read" on cashback_offers for select using (true);
create policy "public read" on rule_changes    for select using (true);
