import type { Program } from "./types";

/**
 * 合格率シミュレーション
 *
 * モデルの前提（画面にも明記する）
 * - 1トレードのリスクは初期残高に対する一定割合。勝てば +リスク×RR、負ければ −リスク
 * - ポジションは日をまたがない（日の開始時は 残高 = 有効証拠金）
 * - 損失判定は各トレードの決済時点で行う（含み損の途中経過は負けトレードの損切り幅として表現）
 * - 利益目標に届いたらその日は取引をやめ、最低取引日数が足りなければ
 *   ノーリスクの最小取引で日数だけ消化する
 * - 評価中に適用される一貫性ルールは、満たすまで取引を続けて薄める
 */

export interface SimParams {
  /** 勝率 0〜1 */
  winRate: number;
  /** リスクリワード比（勝ち幅 / 負け幅） */
  rr: number;
  /** 1トレードのリスク（初期残高に対する%） */
  riskPct: number;
  tradesPerDay: number;
  /** 全フェーズ合計の取引日数の上限。超えたら「未決着」 */
  maxDays: number;
  paths: number;
  seed?: number;
}

export type Outcome = "pass" | "daily" | "max" | "timeout";

export interface SimResult {
  passRate: number;
  dailyFailRate: number;
  maxFailRate: number;
  timeoutRate: number;
  /** 合格したケースの所要取引日数の中央値 */
  medianDaysToPass: number | null;
}

const EPS = 1e-9;

/** 再現性のある乱数（mulberry32） */
export function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function maxFloor(program: Program, hwm: number): number {
  const m = program.maxDd.pct / 100;
  switch (program.maxDd.type) {
    case "static":
      return 1 - m;
    case "trailing_lock_at_initial":
      return Math.min(hwm - m, 1);
    default:
      return hwm - m;
  }
}

function consistencyOk(program: Program, dayProfits: number[]): boolean {
  const c = program.consistency;
  if (!c || c.scope !== "evaluation" || c.pct == null) return true;
  const positives = dayProfits.filter((p) => p > 0);
  const sum = positives.reduce((s, p) => s + p, 0);
  if (sum <= 0) return true;
  return Math.max(...positives) <= (c.pct / 100) * sum + EPS;
}

export function runPath(program: Program, params: SimParams, rng: () => number): { outcome: Outcome; days: number } {
  const risk = params.riskPct / 100;
  const dd = program.dailyDd;
  const intradayTrailing =
    program.maxDd.type === "trailing_balance" ||
    program.maxDd.type === "trailing_equity" ||
    program.maxDd.type === "trailing_lock_at_initial";
  let totalDays = 0;

  for (const phase of program.phases) {
    let bal = 1;
    let hwm = 1;
    let days = 0;
    let trades = 0;
    let reached = false;
    const dayProfits: number[] = [];
    const target = 1 + phase.targetPct / 100;

    for (;;) {
      if (totalDays >= params.maxDays) return { outcome: "timeout", days: totalDays };
      if (phase.maxDays != null && days >= phase.maxDays) return { outcome: "timeout", days: totalDays };

      const dayStart = bal;
      let dailyFloor = -Infinity;
      if (dd && dd.basis !== "none") {
        // 日をまたがない前提なので、開始時の残高 = 有効証拠金
        const ref = dd.basis === "initial_balance" ? 1 : dayStart;
        const amount = (dd.pct / 100) * (dd.amountBase === "initial" ? 1 : ref);
        dailyFloor = ref - amount;
      }
      days++;
      totalDays++;

      if (!reached) {
        for (let t = 0; t < params.tradesPerDay; t++) {
          bal += rng() < params.winRate ? risk * params.rr : -risk;
          trades++;
          if (intradayTrailing) hwm = Math.max(hwm, bal);
          if (bal < dailyFloor - EPS) return { outcome: "daily", days: totalDays };
          if (bal < maxFloor(program, hwm) - EPS) return { outcome: "max", days: totalDays };
          if (bal >= target - EPS && trades >= phase.minTrades) {
            reached = true;
            break;
          }
        }
      } else {
        trades++; // 日数消化のための最小取引
      }

      dayProfits.push(bal - dayStart);
      if (program.maxDd.type === "eod_trailing") hwm = Math.max(hwm, bal);

      if (reached && days >= phase.minDays) {
        if (consistencyOk(program, dayProfits)) break; // このフェーズは合格
        reached = false; // 一貫性ルールを満たすまで取引を続ける
      }
    }
  }
  return { outcome: "pass", days: totalDays };
}

export function simulate(program: Program, params: SimParams): SimResult {
  const rng = rngFrom(params.seed ?? 20261004);
  const counts: Record<Outcome, number> = { pass: 0, daily: 0, max: 0, timeout: 0 };
  const passDays: number[] = [];

  for (let i = 0; i < params.paths; i++) {
    const { outcome, days } = runPath(program, params, rng);
    counts[outcome]++;
    if (outcome === "pass") passDays.push(days);
  }
  passDays.sort((a, b) => a - b);
  const n = params.paths;
  return {
    passRate: counts.pass / n,
    dailyFailRate: counts.daily / n,
    maxFailRate: counts.max / n,
    timeoutRate: counts.timeout / n,
    medianDaysToPass: passDays.length ? passDays[Math.floor(passDays.length / 2)] : null,
  };
}

/** 1回合格するまでに見込まれる参加費（返金は考慮しない） */
export function expectedCostPerPass(priceJpy: number | null, passRate: number): number | null {
  if (priceJpy == null || passRate <= 0) return null;
  return priceJpy / passRate;
}
