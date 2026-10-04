import { expect, it } from "vitest";
import { resetTimeJst, toJst } from "./time";

it("NYクローズ(17:00)は日本時間で夏6:00／冬7:00", () => {
  expect(resetTimeJst("17:00", "America/New_York")).toBe("夏 6:00／冬 7:00");
});
it("UTC+3固定の0時は日本時間6:00で夏冬共通", () => {
  expect(resetTimeJst("00:00", "Etc/GMT-3")).toBe("6:00");
});
it("プラハ0時は夏7:00／冬8:00", () => {
  expect(toJst("00:00", "Europe/Prague", 2026, 7, 15)).toBe("7:00");
  expect(toJst("00:00", "Europe/Prague", 2026, 1, 15)).toBe("8:00");
});
it("UTC 0時は日本時間9:00で夏冬共通（Fintokei）", () => {
  expect(resetTimeJst("00:00", "UTC")).toBe("9:00");
});
