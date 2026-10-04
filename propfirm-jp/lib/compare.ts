import type { AccountSize, CompareRow, Firm, Program } from "./types";
import { toJpy } from "./fx";

/** 口座サイズの目安（円換算） */
export const SIZE_TARGETS = [
  { label: "約150万円（$10K）", jpy: 1_500_000 },
  { label: "約375万円（$25K）", jpy: 3_750_000 },
  { label: "約750万円（$50K）", jpy: 7_500_000 },
  { label: "約1,500万円（$100K）", jpy: 15_000_000 },
  { label: "約3,000万円（$200K）", jpy: 30_000_000 },
] as const;

/** 目安に最も近い口座サイズ（対数距離）を選ぶ */
export function closestSize(sizes: AccountSize[], targetJpy: number): AccountSize | null {
  if (sizes.length === 0) return null;
  return sizes.reduce((best, s) => {
    const d = Math.abs(Math.log(toJpy(s.balance, s.currency) / targetJpy));
    const bd = Math.abs(Math.log(toJpy(best.balance, best.currency) / targetJpy));
    return d < bd ? s : best;
  });
}

export function effectiveMultiplier(firm: Firm): number {
  const disc = Math.max(0, ...firm.discounts.map((d) => d.discountPct));
  const cb = Math.max(0, ...firm.cashback.map((c) => c.pct));
  return (1 - disc / 100) * (1 - cb / 100);
}

export function totalTarget(p: Program): number {
  return p.phases.reduce((s, ph) => s + ph.targetPct, 0);
}

export function buildRows(firms: Firm[], targetJpy: number): CompareRow[] {
  return firms.flatMap((firm) =>
    firm.programs.map((program) => {
      const size = closestSize(program.sizes, targetJpy);
      const priceJpy = size ? toJpy(size.price, size.currency) : null;
      return {
        firm,
        program,
        size,
        priceJpy,
        effectivePriceJpy: priceJpy == null ? null : priceJpy * effectiveMultiplier(firm),
        totalTargetPct: totalTarget(program),
      };
    }),
  );
}

/** 口座残高に対する参加費の比率（%）。サイズ違いを横並びで比べるための指標 */
export function feeRatioPct(row: CompareRow): number | null {
  if (!row.size || row.effectivePriceJpy == null) return null;
  return (row.effectivePriceJpy / toJpy(row.size.balance, row.size.currency)) * 100;
}
