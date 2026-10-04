import type { Firm, Program } from "./types";

/* DBの行（PostgRESTのネスト取得結果）をアプリの Firm 型に変換する */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapFirm(r: any): Firm {
  return {
    slug: r.slug,
    name: r.name,
    websiteUrl: r.website_url,
    affiliateUrl: r.affiliate_url,
    hqCountry: r.hq_country,
    status: r.status,
    jp: {
      residents: r.jp_residents,
      payoutProof: r.jp_payout_proof,
      card: r.jp_card_accepted,
      support: r.jp_support,
      note: r.jp_note,
    },
    payoutMethods: r.payout_methods ?? [],
    riskNote: r.risk_note,
    sourceUrl: r.source_url,
    verifyStatus: r.verify_status,
    lastVerifiedAt: r.last_verified_at,
    discounts: (r.discount_codes ?? [])
      .filter((d: any) => d.is_active && (!d.valid_until || new Date(d.valid_until) >= new Date()))
      .map((d: any) => ({ code: d.code, discountPct: Number(d.discount_pct), note: d.applies_note, validUntil: d.valid_until })),
    cashback: (r.cashback_offers ?? [])
      .filter((c: any) => c.is_active)
      .map((c: any) => ({ pct: Number(c.cashback_pct), note: c.note })),
    programs: (r.programs ?? []).filter((p: any) => p.is_active).map(mapProgram),
  };
}

function num(v: any): number | null {
  return v == null ? null : Number(v);
}

function mapProgram(p: any): Program {
  return {
    slug: p.slug,
    name: p.name,
    challengeType: p.challenge_type,
    platforms: p.platforms ?? [],
    dailyDd:
      p.daily_dd_basis === "none" || p.daily_dd_pct == null
        ? null
        : {
            pct: Number(p.daily_dd_pct),
            basis: p.daily_dd_basis,
            amountBase: p.daily_dd_amount_base,
            resetTime: p.daily_dd_reset_time ? String(p.daily_dd_reset_time).slice(0, 5) : null,
            resetTz: p.daily_dd_reset_tz,
          },
    maxDd: { pct: Number(p.max_dd_pct), type: p.max_dd_type },
    rules: {
      news: p.news_trading, newsNote: p.news_note ?? undefined,
      weekend: p.weekend_holding,
      ea: p.ea_allowed, eaNote: p.ea_note ?? undefined,
      copy: p.copy_trading, copyNote: p.copy_note ?? undefined,
    },
    consistency: p.consistency_scope
      ? { pct: num(p.consistency_rule_pct), scope: p.consistency_scope, note: p.consistency_note ?? "" }
      : null,
    leverageFx: p.leverage_fx,
    payout: {
      splitPct: num(p.profit_split_pct),
      splitMaxPct: num(p.profit_split_max_pct),
      firstPayoutDays: p.first_payout_days,
      frequency: p.payout_frequency,
      capNote: p.payout_cap_note,
      feeRefund: p.fee_refund,
    },
    phases: (p.program_phases ?? [])
      .sort((a: any, b: any) => a.phase_no - b.phase_no)
      .map((ph: any) => ({
        targetPct: Number(ph.profit_target_pct),
        minDays: ph.min_trading_days ?? 0,
        minTrades: ph.min_trades ?? 0,
        maxDays: ph.max_days,
      })),
    sizes: (p.account_sizes ?? [])
      .filter((s: any) => s.is_active)
      .sort((a: any, b: any) => Number(a.balance) - Number(b.balance))
      .map((s: any) => ({ balance: Number(s.balance), price: Number(s.price), currency: s.currency })),
    pricesVerified: Boolean(p.prices_verified),
    notes: p.notes,
    sourceUrl: p.source_url,
  };
}
