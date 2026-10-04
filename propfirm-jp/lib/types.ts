export type Availability = "yes" | "conditional" | "no" | "unknown";
export type ChallengeType = "one_step" | "two_step" | "three_step" | "instant";
export type DailyDdBasis =
  | "start_of_day_balance"
  | "start_of_day_equity"
  | "higher_of_balance_equity"
  | "initial_balance"
  | "none";
/** 日次の損失許容「額」を何に掛けて出すか */
export type DailyDdAmountBase = "initial" | "reference";
export type MaxDdType =
  | "static"
  | "trailing_balance"
  | "trailing_equity"
  | "trailing_lock_at_initial"
  | "eod_trailing";
export type VerifyStatus = "unverified" | "secondary" | "official";
export type Currency = "JPY" | "USD" | "EUR";

export interface DailyDd {
  pct: number;
  basis: DailyDdBasis;
  amountBase: DailyDdAmountBase;
  /** ファーム側の現地時刻 "HH:mm" */
  resetTime: string | null;
  /** IANAタイムゾーン */
  resetTz: string | null;
}

export interface Phase {
  targetPct: number;
  minDays: number;
  minTrades: number;
  maxDays: number | null;
}

export interface AccountSize {
  balance: number;
  price: number;
  currency: Currency;
}

export interface Program {
  slug: string;
  name: string;
  challengeType: ChallengeType;
  platforms: string[];
  dailyDd: DailyDd | null;
  maxDd: { pct: number; type: MaxDdType };
  rules: {
    news: Availability;
    newsNote?: string;
    weekend: Availability;
    ea: Availability;
    eaNote?: string;
    copy: Availability;
    copyNote?: string;
  };
  consistency: { pct: number | null; scope: "evaluation" | "payout"; note: string } | null;
  leverageFx: string | null;
  payout: {
    splitPct: number | null;
    splitMaxPct: number | null;
    firstPayoutDays: number | null;
    frequency: string | null;
    capNote: string | null;
    feeRefund: boolean | null;
  };
  phases: Phase[];
  sizes: AccountSize[];
  /** 価格を公式ページで確認済みか（ルールの確認状況とは別に管理） */
  pricesVerified: boolean;
  notes: string | null;
  sourceUrl: string | null;
}

export interface Discount {
  code: string;
  discountPct: number;
  note?: string;
  validUntil?: string | null;
}

export interface Firm {
  slug: string;
  name: string;
  websiteUrl: string | null;
  affiliateUrl: string | null;
  hqCountry: string | null;
  status: "active" | "paused" | "closed";
  jp: {
    residents: Availability;
    payoutProof: Availability;
    card: Availability;
    support: boolean | null;
    note: string | null;
  };
  payoutMethods: string[];
  riskNote: string | null;
  sourceUrl: string | null;
  verifyStatus: VerifyStatus;
  lastVerifiedAt: string | null;
  discounts: Discount[];
  cashback: { pct: number; note?: string }[];
  programs: Program[];
}

/** 比較表の1行（プログラム×選ばれた口座サイズ） */
export interface CompareRow {
  firm: Firm;
  program: Program;
  size: AccountSize | null;
  priceJpy: number | null;
  effectivePriceJpy: number | null;
  totalTargetPct: number;
}
