"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CompareRow, Firm } from "@/lib/types";
import { buildRows, feeRatioPct, SIZE_TARGETS } from "@/lib/compare";
import { formatJpy, formatMoney } from "@/lib/fx";
import { AVAIL_LABEL, BASIS_LABEL, CHALLENGE_LABEL, MAXDD_LABEL, PLATFORM_LABEL } from "@/lib/labels";

type SortKey = "fee" | "price" | "target" | "daily" | "max";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "fee", label: "口座残高に対する参加費が安い順" },
  { key: "price", label: "参加費が安い順" },
  { key: "target", label: "合計利益目標が低い順" },
  { key: "daily", label: "日次の損失許容が大きい順" },
  { key: "max", label: "最大損失許容が大きい順" },
];

function sortRows(rows: CompareRow[], key: SortKey): CompareRow[] {
  const nullLast = (v: number | null) => (v == null ? Infinity : v);
  const byKey: Record<SortKey, (r: CompareRow) => number> = {
    fee: (r) => nullLast(feeRatioPct(r)),
    price: (r) => nullLast(r.effectivePriceJpy),
    target: (r) => r.totalTargetPct,
    daily: (r) => -(r.program.dailyDd?.pct ?? 100),
    max: (r) => -r.program.maxDd.pct,
  };
  return [...rows].sort((a, b) => byKey[key](a) - byKey[key](b));
}

const selectCls =
  "bg-sheet border border-rule rounded px-2 py-1.5 text-sm text-ink";

export default function CompareTable({ firms }: { firms: Firm[] }) {
  const [sizeIdx, setSizeIdx] = useState(3);
  const [type, setType] = useState<"all" | "one_step" | "two_step">("all");
  const [jpOnly, setJpOnly] = useState(true);
  const [eaOnly, setEaOnly] = useState(false);
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState<SortKey>("fee");

  const platforms = useMemo(
    () => [...new Set(firms.flatMap((f) => f.programs.flatMap((p) => p.platforms)))],
    [firms],
  );

  const rows = useMemo(() => {
    const all = buildRows(firms, SIZE_TARGETS[sizeIdx].jpy).filter(
      (r) =>
        (type === "all" || r.program.challengeType === type) &&
        (!jpOnly || r.firm.jp.residents === "yes") &&
        (!eaOnly || r.program.rules.ea === "yes" || r.program.rules.ea === "conditional") &&
        (platform === "all" || r.program.platforms.includes(platform)),
    );
    return sortRows(all, sort);
  }, [firms, sizeIdx, type, jpOnly, eaOnly, platform, sort]);

  return (
    <section aria-label="比較表">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 pb-5 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-muted">口座サイズの目安</span>
          <select className={selectCls} value={sizeIdx} onChange={(e) => setSizeIdx(Number(e.target.value))}>
            {SIZE_TARGETS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">評価の段階</span>
          <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="all">すべて</option>
            <option value="one_step">1ステップ</option>
            <option value="two_step">2ステップ</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">プラットフォーム</span>
          <select className={selectCls} value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="all">すべて</option>
            {platforms.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p] ?? p}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">並び順</span>
          <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={jpOnly} onChange={(e) => setJpOnly(e.target.checked)} className="accent-indigo" />
            日本居住者が使えるファームだけ
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={eaOnly} onChange={(e) => setEaOnly(e.target.checked)} className="accent-indigo" />
            EA（自動売買）が使えるプランだけ
          </label>
        </div>
      </div>

      <p className="text-sm text-muted pb-3 num">{rows.length}件のプラン</p>

      {rows.length === 0 ? (
        <p className="py-10 border-t border-rule">
          条件に合うプランがありません。チェックを外すか、プラットフォームを「すべて」に戻してください。
        </p>
      ) : (
        <>
          {/* PC: 帳簿型の表 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="ledger text-sm">
              <thead>
                <tr>
                  <th>ファーム／プラン</th>
                  <th className="r">利益目標</th>
                  <th>日次の損失上限</th>
                  <th>最大損失</th>
                  <th className="r">分配率</th>
                  <th>EA</th>
                  <th className="r">参加費</th>
                  <th className="r">残高比</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => <DesktopRow key={`${r.firm.slug}/${r.program.slug}`} r={r} />)}
              </tbody>
            </table>
          </div>

          <p className="hidden md:block text-xs text-muted pt-3">
            * 価格は二次情報をもとにした目安です。公式サイトでの確認が済んでいません。
          </p>

          {/* スマホ: 1プラン1ブロック */}
          <ul className="md:hidden border-t-2 border-ink">
            {rows.map((r) => <MobileRow key={`${r.firm.slug}/${r.program.slug}`} r={r} />)}
          </ul>
          <p className="md:hidden text-xs text-muted pt-3">
            * 価格は二次情報をもとにした目安です。公式サイトでの確認が済んでいません。
          </p>
        </>
      )}
    </section>
  );
}

function targetText(r: CompareRow) {
  return r.program.phases.map((p) => `${p.targetPct}%`).join(" → ");
}

function dailyText(r: CompareRow) {
  const d = r.program.dailyDd;
  if (!d) return { head: "なし", sub: "" };
  return {
    head: `${d.pct}%`,
    sub: `${BASIS_LABEL[d.basis]}基準${d.amountBase === "initial" ? "・額は初期残高の" + d.pct + "%" : ""}`,
  };
}

function priceCell(r: CompareRow) {
  if (!r.size) return { head: "価格未確認", sub: "" };
  return {
    head: formatJpy(r.effectivePriceJpy) + (r.program.pricesVerified ? "" : "*"),
    sub:
      r.size.currency === "JPY"
        ? `${formatMoney(r.size.balance, "JPY")}口座`
        : `${formatMoney(r.size.balance, r.size.currency)}口座・${formatMoney(r.size.price, r.size.currency)}`,
  };
}

function DesktopRow({ r }: { r: CompareRow }) {
  const daily = dailyText(r);
  const price = priceCell(r);
  const ratio = feeRatioPct(r);
  return (
    <tr>
      <td>
        <Link href={`/firms/${r.firm.slug}#${r.program.slug}`} className="font-medium hover:underline">
          {r.firm.name}
        </Link>
        <div className="text-muted text-xs">{r.program.name}・{CHALLENGE_LABEL[r.program.challengeType]}</div>
      </td>
      <td className="r num whitespace-nowrap">{targetText(r)}</td>
      <td>
        <span className="num">{daily.head}</span>
        <div className="text-muted text-xs">{daily.sub}</div>
      </td>
      <td>
        <span className="num">{r.program.maxDd.pct}%</span>
        <div className="text-muted text-xs">{MAXDD_LABEL[r.program.maxDd.type]}</div>
      </td>
      <td className="r num whitespace-nowrap">
        {r.program.payout.splitPct ?? "—"}%
        {r.program.payout.splitMaxPct && r.program.payout.splitMaxPct !== r.program.payout.splitPct
          ? <div className="text-muted text-xs">最大{r.program.payout.splitMaxPct}%</div>
          : null}
      </td>
      <td className={`whitespace-nowrap ${r.program.rules.ea === "unknown" ? "text-muted" : ""}`}>{AVAIL_LABEL[r.program.rules.ea]}</td>
      <td className="r num whitespace-nowrap">
        {price.head}
        <div className="text-muted text-xs">{price.sub}</div>
      </td>
      <td className="r num">{ratio == null ? "—" : `${ratio.toFixed(2)}%`}</td>
    </tr>
  );
}

function MobileRow({ r }: { r: CompareRow }) {
  const daily = dailyText(r);
  const price = priceCell(r);
  const ratio = feeRatioPct(r);
  return (
    <li className="border-b border-rule py-4">
      <div className="flex items-baseline justify-between gap-3">
        <Link href={`/firms/${r.firm.slug}#${r.program.slug}`} className="font-medium">
          {r.firm.name}
          <span className="text-muted text-xs font-normal ml-2">{r.program.name}</span>
        </Link>
        <span className="num text-sm shrink-0">{price.head}</span>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
        <dt className="text-muted">利益目標</dt><dd className="num">{targetText(r)}</dd>
        <dt className="text-muted">日次</dt><dd><span className="num">{daily.head}</span> <span className="text-muted text-xs">{daily.sub}</span></dd>
        <dt className="text-muted">最大</dt><dd><span className="num">{r.program.maxDd.pct}%</span> <span className="text-muted text-xs">{MAXDD_LABEL[r.program.maxDd.type]}</span></dd>
        <dt className="text-muted">分配率</dt><dd className="num">{r.program.payout.splitPct ?? "—"}%</dd>
        <dt className="text-muted">EA</dt><dd>{AVAIL_LABEL[r.program.rules.ea]}</dd>
        {r.size && <><dt className="text-muted">口座</dt><dd className="num">{price.sub}{ratio != null && `（残高比 ${ratio.toFixed(2)}%）`}</dd></>}
      </dl>
    </li>
  );
}
