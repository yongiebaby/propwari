import "server-only";
import raw from "@/data/firms.json";
import type { Firm } from "./types";
import { createClient } from "@supabase/supabase-js";
import { mapFirm } from "./supabase-map";

/**
 * データ取得の入口。
 * SUPABASE の環境変数があればDBから、なければ data/firms.json から読む。
 * どちらでも同じ Firm[] 形式で返すので、画面側は取得元を意識しない。
 */
export async function getFirms(): Promise<Firm[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // 新形式の publishable key を優先。旧来の anon key でも動く
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const firms = url && key ? await fromSupabase(url, key) : (raw.firms as unknown as Firm[]);
  return firms.filter((f) => f.status === "active");
}

export async function getFirm(slug: string): Promise<Firm | undefined> {
  return (await getFirms()).find((f) => f.slug === slug);
}

// ---------- Supabase ----------
async function fromSupabase(url: string, key: string): Promise<Firm[]> {
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("firms")
    .select("*, programs(*, program_phases(*), account_sizes(*)), discount_codes(*), cashback_offers(*)")
    .order("name");
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data ?? []).map(mapFirm);
}
