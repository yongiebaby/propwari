import type { Currency } from "./types";

/**
 * 概算の換算レート（1単位あたりの円）。
 * 比較用の目安なので、運用時は定期的に更新するか、為替APIからの取得に置き換える。
 */
export const FX_TO_JPY: Record<Currency, number> = {
  JPY: 1,
  USD: 150,
  EUR: 165,
};
export const FX_UPDATED_AT = "2026-10-04";

export function toJpy(amount: number, currency: Currency): number {
  return amount * FX_TO_JPY[currency];
}

export function formatJpy(v: number | null): string {
  if (v == null) return "—";
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}億円`;
  if (v >= 10_000) {
    const man = v / 10_000;
    return `${man >= 100 ? Math.round(man).toLocaleString("ja-JP") : man.toFixed(1).replace(/\.0$/, "")}万円`;
  }
  return `${Math.round(v).toLocaleString("ja-JP")}円`;
}

export function formatMoney(amount: number, currency: Currency): string {
  if (currency === "JPY") return formatJpy(amount);
  const sym = currency === "USD" ? "$" : "€";
  return `${sym}${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
