/** タイムゾーン tz における instant のUTCオフセット（ミリ秒） */
function tzOffsetMs(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant;
}

/** tz の現地時刻 "HH:mm"（指定日付）を日本時間 "H:mm" に変換 */
export function toJst(time: string, tz: string, y: number, m: number, d: number): string {
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // 2回反復してDST境界付近のずれを吸収
  let instant = guess - tzOffsetMs(guess, tz);
  instant = guess - tzOffsetMs(instant, tz);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", hour: "numeric", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(instant));
}

/** 日次リセット時刻の日本時間表記。夏冬で変わる場合は両方を返す */
export function resetTimeJst(time: string | null, tz: string | null): string | null {
  if (!time || !tz) return null;
  const year = new Date().getFullYear();
  const summer = toJst(time, tz, year, 7, 15);
  const winter = toJst(time, tz, year, 1, 15);
  return summer === winter ? summer : `夏 ${summer}／冬 ${winter}`;
}
