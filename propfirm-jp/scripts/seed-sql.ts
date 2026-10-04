/**
 * data/firms.json からシード用SQLを標準出力に書き出す（何度流しても同じ結果）
 *   npm run -s db:seed-sql > seed.sql
 * service_roleキーなしで、SupabaseのSQLエディタやMCPから流し込める。
 * 割引コードとキャッシュバックはDB側で管理するので触らない。
 */
import raw from "../data/firms.json";
import type { Firm } from "../lib/types";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return `array[${v.map(q).join(",")}]::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const out: string[] = ["begin;"];
for (const f of (raw as unknown as { firms: Firm[] }).firms) {
  out.push(`insert into firms (slug, name, website_url, affiliate_url, hq_country, status,
  jp_residents, jp_payout_proof, jp_card_accepted, jp_support, jp_note, payout_methods,
  risk_note, source_url, verify_status, last_verified_at)
values (${[f.slug, f.name, f.websiteUrl, f.affiliateUrl, f.hqCountry].map(q).join(", ")}, ${q(f.status)}::firm_status,
  ${q(f.jp.residents)}::availability, ${q(f.jp.payoutProof)}::availability, ${q(f.jp.card)}::availability,
  ${q(f.jp.support)}, ${q(f.jp.note)}, ${q(f.payoutMethods)},
  ${q(f.riskNote)}, ${q(f.sourceUrl)}, ${q(f.verifyStatus)}::verify_status, ${q(f.lastVerifiedAt)}::date)
on conflict (slug) do update set name = excluded.name, website_url = excluded.website_url,
  hq_country = excluded.hq_country, status = excluded.status,
  jp_residents = excluded.jp_residents, jp_payout_proof = excluded.jp_payout_proof,
  jp_card_accepted = excluded.jp_card_accepted, jp_support = excluded.jp_support, jp_note = excluded.jp_note,
  payout_methods = excluded.payout_methods, risk_note = excluded.risk_note, source_url = excluded.source_url,
  verify_status = excluded.verify_status, last_verified_at = excluded.last_verified_at;`);
  // affiliate_url はDB側で管理するので、既存行では上書きしない

  for (const p of f.programs) {
    const d = p.dailyDd;
    const fid = `(select id from firms where slug = ${q(f.slug)})`;
    out.push(`insert into programs (firm_id, slug, name, challenge_type, platforms,
  daily_dd_pct, daily_dd_basis, daily_dd_amount_base, daily_dd_reset_time, daily_dd_reset_tz,
  max_dd_pct, max_dd_type, news_trading, news_note, weekend_holding, ea_allowed, ea_note,
  copy_trading, copy_note, consistency_rule_pct, consistency_scope, consistency_note, leverage_fx,
  profit_split_pct, profit_split_max_pct, first_payout_days, payout_frequency, payout_cap_note,
  fee_refund, prices_verified, notes, source_url, is_active)
values (${fid}, ${q(p.slug)}, ${q(p.name)}, ${q(p.challengeType)}::challenge_type, ${q(p.platforms)},
  ${q(d?.pct ?? null)}, ${q(d?.basis ?? "none")}::daily_dd_basis, ${q(d?.amountBase ?? "reference")}::daily_dd_amount_base,
  ${q(d?.resetTime ?? null)}::time, ${q(d?.resetTz ?? null)},
  ${q(p.maxDd.pct)}, ${q(p.maxDd.type)}::max_dd_type,
  ${q(p.rules.news)}::availability, ${q(p.rules.newsNote)}, ${q(p.rules.weekend)}::availability,
  ${q(p.rules.ea)}::availability, ${q(p.rules.eaNote)}, ${q(p.rules.copy)}::availability, ${q(p.rules.copyNote)},
  ${q(p.consistency?.pct ?? null)}, ${q(p.consistency?.scope ?? null)}::consistency_scope, ${q(p.consistency?.note ?? null)},
  ${q(p.leverageFx)}, ${q(p.payout.splitPct)}, ${q(p.payout.splitMaxPct)}, ${q(p.payout.firstPayoutDays)},
  ${q(p.payout.frequency)}, ${q(p.payout.capNote)}, ${q(p.payout.feeRefund)}, ${q(p.pricesVerified)},
  ${q(p.notes)}, ${q(p.sourceUrl)}, true)
on conflict (firm_id, slug) do update set name = excluded.name, challenge_type = excluded.challenge_type,
  platforms = excluded.platforms, daily_dd_pct = excluded.daily_dd_pct, daily_dd_basis = excluded.daily_dd_basis,
  daily_dd_amount_base = excluded.daily_dd_amount_base, daily_dd_reset_time = excluded.daily_dd_reset_time,
  daily_dd_reset_tz = excluded.daily_dd_reset_tz, max_dd_pct = excluded.max_dd_pct, max_dd_type = excluded.max_dd_type,
  news_trading = excluded.news_trading, news_note = excluded.news_note, weekend_holding = excluded.weekend_holding,
  ea_allowed = excluded.ea_allowed, ea_note = excluded.ea_note, copy_trading = excluded.copy_trading,
  copy_note = excluded.copy_note, consistency_rule_pct = excluded.consistency_rule_pct,
  consistency_scope = excluded.consistency_scope, consistency_note = excluded.consistency_note,
  leverage_fx = excluded.leverage_fx, profit_split_pct = excluded.profit_split_pct,
  profit_split_max_pct = excluded.profit_split_max_pct, first_payout_days = excluded.first_payout_days,
  payout_frequency = excluded.payout_frequency, payout_cap_note = excluded.payout_cap_note,
  fee_refund = excluded.fee_refund, prices_verified = excluded.prices_verified, notes = excluded.notes,
  source_url = excluded.source_url, is_active = true;`);

    const pid = `(select p.id from programs p join firms f on f.id = p.firm_id where f.slug = ${q(f.slug)} and p.slug = ${q(p.slug)})`;
    out.push(`delete from program_phases where program_id = ${pid};`);
    p.phases.forEach((ph, i) =>
      out.push(`insert into program_phases (program_id, phase_no, profit_target_pct, min_trading_days, min_trades, max_days)
values (${pid}, ${i + 1}, ${q(ph.targetPct)}, ${q(ph.minDays)}, ${q(ph.minTrades)}, ${q(ph.maxDays)});`),
    );
    out.push(`delete from account_sizes where program_id = ${pid};`);
    for (const s of p.sizes) {
      out.push(`insert into account_sizes (program_id, balance, price, currency)
values (${pid}, ${q(s.balance)}, ${q(s.price)}, ${q(s.currency)});`);
    }
  }
}
out.push("commit;");
console.log(out.join("\n"));
