import { expect, it } from "vitest";
import { mapFirm } from "./supabase-map";
import row from "./__fixtures__/db-fundora.json";
import raw from "../data/firms.json";
import type { Firm } from "./types";

// Supabase（propwari）から実際に取得した行で、DB経由でもJSONと同じデータになることを確認
it("DBの行を変換するとdata/firms.jsonと同じ内容になる", () => {
  const fromJson = (raw as unknown as { firms: Firm[] }).firms.find((f) => f.slug === "fundora")!;
  expect(mapFirm(row)).toEqual(fromJson);
});

it("フェーズはphase_no順、時刻はHH:mmに整形される", () => {
  const f = mapFirm(row);
  expect(f.programs[0].phases.map((p) => p.targetPct)).toEqual([8, 5]);
  expect(f.programs[0].dailyDd?.resetTime).toBe("17:00");
});
