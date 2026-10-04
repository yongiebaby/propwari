/**
 * data/firms.json を Supabase に流し込む（何度実行しても同じ結果になる）
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed
 * firms と programs は slug で上書き、フェーズと口座サイズは丸ごと入れ替える。
 * 割引コードとキャッシュバックはDB側（管理画面）で管理するので触らない。
 */
import { createClient } from "@supabase/supabase-js";
import raw from "../data/firms.json";
import type { Firm } from "../lib/types";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

async function must<T>(
  p: PromiseLike<{ data: T; error: { message: string } | null }>,
  what: string,
): Promise<NonNullable<T> | null> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data ?? null;
}

async function mustRow<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<NonNullable<T>> {
  const row = await must(p, what);
  if (!row) throw new Error(`${what}: 行が返りませんでした`);
  return row;
}

async function main() {
  const firms = (raw as unknown as { firms: Firm[] }).firms;
  for (const f of firms) {
    const firm = await mustRow(
      sb.from("firms").upsert(
        {
          slug: f.slug, name: f.name, website_url: f.websiteUrl, // affiliate_url はDB側で管理
          hq_country: f.hqCountry, status: f.status,
          jp_residents: f.jp.residents, jp_payout_proof: f.jp.payoutProof, jp_card_accepted: f.jp.card,
          jp_support: f.jp.support, jp_note: f.jp.note,
          payout_methods: f.payoutMethods, risk_note: f.riskNote, source_url: f.sourceUrl,
          verify_status: f.verifyStatus, last_verified_at: f.lastVerifiedAt,
        },
        { onConflict: "slug" },
      ).select("id").single(),
      `firm ${f.slug}`,
    );

    for (const p of f.programs) {
      const program = await mustRow(
        sb.from("programs").upsert(
          {
            firm_id: firm.id, slug: p.slug, name: p.name, challenge_type: p.challengeType, platforms: p.platforms,
            daily_dd_pct: p.dailyDd?.pct ?? null,
            daily_dd_basis: p.dailyDd?.basis ?? "none",
            daily_dd_amount_base: p.dailyDd?.amountBase ?? "reference",
            daily_dd_reset_time: p.dailyDd?.resetTime ?? null,
            daily_dd_reset_tz: p.dailyDd?.resetTz ?? null,
            max_dd_pct: p.maxDd.pct, max_dd_type: p.maxDd.type,
            news_trading: p.rules.news, news_note: p.rules.newsNote ?? null,
            weekend_holding: p.rules.weekend,
            ea_allowed: p.rules.ea, ea_note: p.rules.eaNote ?? null,
            copy_trading: p.rules.copy, copy_note: p.rules.copyNote ?? null,
            consistency_rule_pct: p.consistency?.pct ?? null,
            consistency_scope: p.consistency?.scope ?? null,
            consistency_note: p.consistency?.note ?? null,
            leverage_fx: p.leverageFx,
            profit_split_pct: p.payout.splitPct, profit_split_max_pct: p.payout.splitMaxPct,
            first_payout_days: p.payout.firstPayoutDays, payout_frequency: p.payout.frequency,
            payout_cap_note: p.payout.capNote, fee_refund: p.payout.feeRefund,
            notes: p.notes, source_url: p.sourceUrl, is_active: true,
          },
          { onConflict: "firm_id,slug" },
        ).select("id").single(),
        `program ${f.slug}/${p.slug}`,
      );

      await must(sb.from("program_phases").delete().eq("program_id", program.id), "phases delete");
      await must(
        sb.from("program_phases").insert(
          p.phases.map((ph, i) => ({
            program_id: program.id, phase_no: i + 1, profit_target_pct: ph.targetPct,
            min_trading_days: ph.minDays, min_trades: ph.minTrades, max_days: ph.maxDays,
          })),
        ),
        "phases insert",
      );

      await must(sb.from("account_sizes").delete().eq("program_id", program.id), "sizes delete");
      if (p.sizes.length) {
        await must(
          sb.from("account_sizes").insert(
            p.sizes.map((s) => ({ program_id: program.id, balance: s.balance, price: s.price, currency: s.currency })),
          ),
          "sizes insert",
        );
      }
    }
    console.log(`✓ ${f.name}（${f.programs.length}プラン）`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
