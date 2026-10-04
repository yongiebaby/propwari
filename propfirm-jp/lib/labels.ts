import type { Availability, ChallengeType, DailyDdBasis, MaxDdType, VerifyStatus } from "./types";

export const CHALLENGE_LABEL: Record<ChallengeType, string> = {
  one_step: "1ステップ",
  two_step: "2ステップ",
  three_step: "3ステップ",
  instant: "即時ファンド",
};

export const BASIS_LABEL: Record<DailyDdBasis, string> = {
  start_of_day_balance: "当日開始時の残高",
  start_of_day_equity: "当日開始時の有効証拠金",
  higher_of_balance_equity: "開始時の残高と有効証拠金の高い方",
  initial_balance: "初期残高",
  none: "日次制限なし",
};

export const MAXDD_LABEL: Record<MaxDdType, string> = {
  static: "固定（初期残高基準）",
  trailing_balance: "残高に追従",
  trailing_equity: "有効証拠金に追従",
  trailing_lock_at_initial: "追従（初期残高で停止）",
  eod_trailing: "日足終値に追従",
};

export const AVAIL_LABEL: Record<Availability, string> = {
  yes: "可",
  conditional: "条件付き",
  no: "不可",
  unknown: "未確認",
};

export const VERIFY_LABEL: Record<VerifyStatus, string> = {
  official: "公式で確認済み",
  secondary: "二次情報（公式確認待ち）",
  unverified: "未確認",
};

export const PLATFORM_LABEL: Record<string, string> = {
  mt4: "MT4",
  mt5: "MT5",
  ctrader: "cTrader",
  match_trader: "Match-Trader",
  dxtrade: "DXtrade",
  tradingview: "TradingView",
};
