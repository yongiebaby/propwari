import { describe, expect, it } from "vitest";
import { runPath, simulate, rngFrom, type SimParams } from "./sim";
import type { Program } from "./types";
import raw from "../data/firms.json";

function program(over: Partial<Program> = {}): Program {
  return {
    slug: "t", name: "t", challengeType: "two_step", platforms: [],
    dailyDd: { pct: 5, basis: "start_of_day_balance", amountBase: "initial", resetTime: null, resetTz: null },
    maxDd: { pct: 10, type: "static" },
    rules: { news: "unknown", weekend: "unknown", ea: "unknown", copy: "unknown" },
    consistency: null, leverageFx: null,
    payout: { splitPct: 80, splitMaxPct: 80, firstPayoutDays: null, frequency: null, capNote: null, feeRefund: null },
    phases: [{ targetPct: 10, minDays: 0, minTrades: 0, maxDays: null }],
    sizes: [], pricesVerified: false, notes: null, sourceUrl: null,
    ...over,
  };
}
const base: SimParams = { winRate: 0.5, rr: 1, riskPct: 1, tradesPerDay: 1, maxDays: 200, paths: 1 };
const always = () => 0;   // 常に勝ち
const never = () => 0.99; // 常に負け

describe("runPath", () => {
  it("全勝なら合格し、日数は目標/リスクで決まる", () => {
    const r = runPath(program(), { ...base, winRate: 1 }, always);
    expect(r).toEqual({ outcome: "pass", days: 10 });
  });

  it("1回の損失が日次上限を超えれば日次失格", () => {
    const r = runPath(program(), { ...base, winRate: 0, riskPct: 6 }, never);
    expect(r.outcome).toBe("daily");
  });

  it("日次で止まらない損失の積み重ねは最大DD失格", () => {
    // 1日1回1%負け → 11日目に-11%で最大DD(10%)割れ
    const r = runPath(program(), { ...base, winRate: 0 }, never);
    expect(r).toEqual({ outcome: "max", days: 11 });
  });

  it("最低取引日数に満たない場合は日数を消化してから合格", () => {
    const p = program({ phases: [{ targetPct: 2, minDays: 5, minTrades: 0, maxDays: null }] });
    const r = runPath(p, { ...base, winRate: 1 }, always);
    expect(r).toEqual({ outcome: "pass", days: 5 });
  });

  it("2フェーズは日数が合算される", () => {
    const p = program({
      phases: [
        { targetPct: 3, minDays: 0, minTrades: 0, maxDays: null },
        { targetPct: 2, minDays: 0, minTrades: 0, maxDays: null },
      ],
    });
    expect(runPath(p, { ...base, winRate: 1 }, always)).toEqual({ outcome: "pass", days: 5 });
  });

  it("評価中の一貫性ルール（Best Day 50%）は1日で目標達成しても合格させない", () => {
    const p = program({ consistency: { pct: 50, scope: "evaluation", note: "" } });
    const r = runPath(p, { ...base, winRate: 1, riskPct: 10 }, always);
    expect(r).toEqual({ outcome: "pass", days: 2 });
  });

  it("報酬時のみの一貫性ルールは評価に影響しない", () => {
    const p = program({ consistency: { pct: 33, scope: "payout", note: "" } });
    const r = runPath(p, { ...base, winRate: 1, riskPct: 10 }, always);
    expect(r).toEqual({ outcome: "pass", days: 1 });
  });

  it("日次DDの基準額が『基準額×%』だと、利益後は許容額が増える", () => {
    // 1日目 2連勝(+5.2%) → 2日目 2連敗(-5.2%)
    // 初期残高×5%型: 床 1.052-0.05=1.002 → 2日目に日次失格
    // 開始時残高×5%型: 床 1.052-0.0526=0.9994 → 2日目は生き残り、3日目に失格
    const seq = [0, 0, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99];
    const params = { ...base, riskPct: 2.6, tradesPerDay: 2 };
    const phases = [{ targetPct: 50, minDays: 0, minTrades: 0, maxDays: null }];
    let i = 0;
    const a = runPath(program({ phases }), params, () => seq[i++]);
    i = 0;
    const b = runPath(
      program({
        phases,
        dailyDd: { pct: 5, basis: "start_of_day_balance", amountBase: "reference", resetTime: null, resetTz: null },
      }),
      params,
      () => seq[i++],
    );
    expect(a).toEqual({ outcome: "daily", days: 2 });
    expect(b).toEqual({ outcome: "daily", days: 3 });
  });

  it("EOD追従型は利益後に失格ラインが上がる", () => {
    // 1日目 +10% → 終値HWM 1.10 → 床 1.00。2日目以降の連敗で -10%より手前で失格
    const p = program({
      dailyDd: null,
      maxDd: { pct: 10, type: "eod_trailing" },
      phases: [{ targetPct: 50, minDays: 0, minTrades: 0, maxDays: null }],
    });
    const seq = [0, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99];
    let i = 0;
    const r = runPath(p, { ...base, riskPct: 10, tradesPerDay: 1 }, () => seq[i++]);
    expect(r).toEqual({ outcome: "max", days: 3 });
  });
});

describe("simulate", () => {
  it("同じシードなら同じ結果", () => {
    const p = program();
    const params = { ...base, paths: 500, seed: 7 };
    expect(simulate(p, params)).toEqual(simulate(p, params));
  });

  it("結果の比率の合計は1", () => {
    const r = simulate(program(), { ...base, paths: 1000 });
    expect(r.passRate + r.dailyFailRate + r.maxFailRate + r.timeoutRate).toBeCloseTo(1, 10);
  });

  it("エッジなし（勝率50%・RR1）の静的10%/目標10%はおおむね五分五分", () => {
    const r = simulate(program({ dailyDd: null }), { ...base, paths: 4000, maxDays: 5000 });
    expect(r.passRate).toBeGreaterThan(0.45);
    expect(r.passRate).toBeLessThan(0.55);
  });

  it("収録データの全プログラムでエラーなく動く", () => {
    const firms = (raw as unknown as { firms: { programs: Program[] }[] }).firms;
    for (const f of firms) for (const p of f.programs) {
      const r = simulate(p, { winRate: 0.5, rr: 1.5, riskPct: 0.5, tradesPerDay: 2, maxDays: 120, paths: 200 });
      expect(r.passRate).toBeGreaterThanOrEqual(0);
    }
  });
});

it("rngFrom は 0以上1未満", () => {
  const r = rngFrom(1);
  for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
});
