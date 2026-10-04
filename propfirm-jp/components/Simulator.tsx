"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Firm, Program } from "@/lib/types";
import { closestSize, effectiveMultiplier, SIZE_TARGETS } from "@/lib/compare";
import { formatJpy, formatMoney, toJpy } from "@/lib/fx";
import { expectedCostPerPass, simulate, type SimParams, type SimResult } from "@/lib/sim";

interface ResultRow {
  firm: Firm;
  program: Program;
  result: SimResult;
  costPerPass: number | null;
  sizeLabel: string | null;
  /** 選んだ目安と口座サイズが2倍以上離れている */
  sizeMismatch: boolean;
}

const PATHS = 3000;

function NumField(props: {
  label: string; hint: string; value: number; step: number; min: number; max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{props.label}</span>
      <input
        type="number" inputMode="decimal"
        value={props.value} step={props.step} min={props.min} max={props.max}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="num bg-sheet border border-rule rounded px-2 py-1.5 w-28"
      />
      <span className="text-xs text-muted">{props.hint}</span>
    </label>
  );
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function Simulator({ firms }: { firms: Firm[] }) {
  const [winRatePct, setWinRatePct] = useState(50);
  const [rr, setRr] = useState(1.5);
  const [riskPct, setRiskPct] = useState(0.5);
  const [tradesPerDay, setTradesPerDay] = useState(2);
  const [maxDays, setMaxDays] = useState(60);
  const [sizeIdx, setSizeIdx] = useState(3);
  const [jpOnly, setJpOnly] = useState(true);
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [ranWith, setRanWith] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const invalid =
    !(winRatePct > 0 && winRatePct < 100) || !(rr > 0) || !(riskPct > 0 && riskPct <= 10) ||
    !(tradesPerDay >= 1 && tradesPerDay <= 20) || !(maxDays >= 5 && maxDays <= 365);

  function run() {
    const params: SimParams = {
      winRate: winRatePct / 100, rr, riskPct,
      tradesPerDay: Math.round(tradesPerDay), maxDays: Math.round(maxDays), paths: PATHS,
    };
    const target = SIZE_TARGETS[sizeIdx].jpy;
    startTransition(() => {
      // 描画を先に返してから重い計算を始める
      setTimeout(() => {
        const out: ResultRow[] = firms
          .filter((f) => !jpOnly || f.jp.residents === "yes")
          .flatMap((firm) =>
            firm.programs.map((program) => {
              const result = simulate(program, params);
              const size = closestSize(program.sizes, target);
              const price = size ? toJpy(size.price, size.currency) * effectiveMultiplier(firm) : null;
              return {
                firm, program, result,
                costPerPass: expectedCostPerPass(price, result.passRate),
                sizeLabel: size ? formatMoney(size.balance, size.currency) : null,
                sizeMismatch: size ? Math.abs(Math.log(toJpy(size.balance, size.currency) / target)) > Math.log(2) : false,
              };
            }),
          )
          .sort((a, b) => b.result.passRate - a.result.passRate);
        setRows(out);
        setRanWith(`勝率${winRatePct}%・RR ${rr}・1回のリスク${riskPct}%・1日${Math.round(tradesPerDay)}回・上限${Math.round(maxDays)}日`);
      }, 0);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-x-8 gap-y-5 items-start">
        <NumField label="勝率（%）" hint="1〜99" value={winRatePct} step={1} min={1} max={99} onChange={setWinRatePct} />
        <NumField label="リスクリワード比" hint="勝ち幅÷負け幅" value={rr} step={0.1} min={0.1} max={10} onChange={setRr} />
        <NumField label="1回のリスク（%）" hint="初期残高に対する損切り幅" value={riskPct} step={0.1} min={0.1} max={10} onChange={setRiskPct} />
        <NumField label="1日のトレード数" hint="1〜20" value={tradesPerDay} step={1} min={1} max={20} onChange={setTradesPerDay} />
        <NumField label="取引日数の上限" hint="超えたら未決着" value={maxDays} step={5} min={5} max={365} onChange={setMaxDays} />
        <label className="flex flex-col gap-1 text-sm">
          <span>費用計算の口座サイズ</span>
          <select value={sizeIdx} onChange={(e) => setSizeIdx(Number(e.target.value))} className="bg-sheet border border-rule rounded px-2 py-1.5">
            {SIZE_TARGETS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm mt-5">
        <input type="checkbox" checked={jpOnly} onChange={(e) => setJpOnly(e.target.checked)} className="accent-indigo" />
        日本居住者が使えるファームだけ
      </label>

      <button
        onClick={run} disabled={invalid || pending}
        className="mt-6 bg-indigo text-sheet px-6 py-2.5 rounded text-sm font-medium disabled:opacity-50"
      >
        {pending ? "計算しています" : "合格率を計算する"}
      </button>
      {invalid && <p className="text-sm text-breach mt-2">入力値が範囲外です。各欄の下の範囲に収めてください。</p>}

      {rows && (
        <section className="mt-12" aria-live="polite">
          <h2 className="font-serif text-2xl">結果</h2>
          <p className="text-sm text-muted num mt-1">{ranWith}・各プラン{PATHS.toLocaleString()}回試行</p>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mt-4" aria-hidden>
            <span className="flex items-center gap-1.5"><i className="inline-block w-3 h-3 bg-pass" />合格</span>
            <span className="flex items-center gap-1.5"><i className="inline-block w-3 h-3 bg-breach" />日次の損失上限で失格</span>
            <span className="flex items-center gap-1.5"><i className="inline-block w-3 h-3 bg-breach-deep" />最大損失で失格</span>
            <span className="flex items-center gap-1.5"><i className="inline-block w-3 h-3 bg-pending" />未決着</span>
          </div>

          <ol className="mt-4 border-t-2 border-ink">
            {rows.map(({ firm, program, result, costPerPass, sizeLabel, sizeMismatch }) => (
              <li key={`${firm.slug}/${program.slug}`} className="py-4 border-b border-rule">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <Link href={`/firms/${firm.slug}#${program.slug}`} className="font-medium hover:underline">
                    {firm.name}<span className="text-muted text-xs font-normal ml-2">{program.name}</span>
                  </Link>
                  <span className="num text-lg">{pct(result.passRate)}</span>
                </div>
                <div
                  className="flex h-3 mt-2 overflow-hidden rounded-sm"
                  role="img"
                  aria-label={`合格${pct(result.passRate)}、日次失格${pct(result.dailyFailRate)}、最大損失失格${pct(result.maxFailRate)}、未決着${pct(result.timeoutRate)}`}
                >
                  <div className="bg-pass" style={{ width: pct(result.passRate) }} />
                  <div className="bg-breach" style={{ width: pct(result.dailyFailRate) }} />
                  <div className="bg-breach-deep" style={{ width: pct(result.maxFailRate) }} />
                  <div className="bg-pending" style={{ width: pct(result.timeoutRate) }} />
                </div>
                <p className="text-xs text-muted mt-2 num">
                  日次失格 {pct(result.dailyFailRate)}・最大損失失格 {pct(result.maxFailRate)}
                  {result.timeoutRate > 0 && `・未決着 ${pct(result.timeoutRate)}`}
                  {result.medianDaysToPass != null && `・合格まで中央値${result.medianDaysToPass}日`}
                </p>
                <p className="text-sm mt-1 num">
                  {costPerPass != null
                    ? <>
                        1回合格するまでの参加費の目安 {formatJpy(costPerPass)}（{sizeLabel}口座）
                        {sizeMismatch && <span className="block text-xs text-muted">選んだ目安に近いサイズがないため、別のサイズで計算しています</span>}
                      </>
                    : <span className="text-muted">{result.passRate === 0 ? "この条件では合格例がありません" : "参加費が未確認のため費用は計算できません"}</span>}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
