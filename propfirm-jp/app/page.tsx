import type { Metadata } from "next";
import Link from "next/link";
import CompareTable from "@/components/CompareTable";
import { getFirms } from "@/lib/data";

export const revalidate = 3600;
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const firms = await getFirms();
  return (
    <>
      <div className="max-w-3xl pb-10">
        <h1 className="font-serif text-3xl md:text-4xl leading-snug">
          プロップファームのルールを、同じ物差しで比べる
        </h1>
        <p className="mt-4 text-muted">
          同じ「日次5%」でも、残高基準か有効証拠金基準か、損失額が初期残高で固定か当日の残高に連動するかで、失格になる場面は変わります。
          各社の定義をそろえて並べました。自分の勝率とリスクで合格率を試すなら
          <Link href="/simulator" className="text-indigo underline underline-offset-4 mx-1">合格率シミュレーター</Link>
          へ。
        </p>
      </div>
      <CompareTable firms={firms} />
    </>
  );
}
