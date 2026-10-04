import type { Metadata } from "next";
import Simulator from "@/components/Simulator";
import { getFirms } from "@/lib/data";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "合格率シミュレーター",
  alternates: { canonical: "/simulator" },
  description: "勝率・リスクリワード・1回のリスクを入れると、各プロップファームのルールで何%合格するか、失格理由の内訳と1合格あたりの参加費を試算します。",
};

export default async function SimulatorPage() {
  const firms = await getFirms();
  return (
    <>
      <div className="max-w-3xl pb-8">
        <h1 className="font-serif text-3xl md:text-4xl leading-snug">あなたの手法は、どのファームなら通るか</h1>
        <p className="mt-4 text-muted">
          勝率とリスクを入れると、各社のルールで評価を何千回も試し、合格・失格の割合を出します。
          同じ成績でも、日次損失の計算方法や最大損失の種類によって結果が変わります。
        </p>
      </div>
      <Simulator firms={firms} />
      <details className="mt-14 max-w-3xl text-sm text-muted">
        <summary className="cursor-pointer text-ink">計算の前提</summary>
        <ul className="list-disc pl-5 mt-3 space-y-1">
          <li>1回のリスクは初期残高に対する一定割合で、勝てば リスク×RR、負ければ −リスク。</li>
          <li>ポジションは日をまたがず、損失の判定は決済のたびに行います。含み損の途中経過は損切り幅として扱います。</li>
          <li>利益目標に届いた日はそこで取引をやめ、最低取引日数が足りない場合は損益の出ない最小取引で日数を満たす想定です。</li>
          <li>評価中に適用される一貫性ルールは計算に含め、報酬申請時だけのルールは含めません。</li>
          <li>1トレードの損失上限などの個別ルール、スプレッドや手数料は含みません。実際の合格率はこれより低くなり得ます。</li>
          <li>参加費の目安は返金・割引を除いた価格を合格率で割ったものです。</li>
        </ul>
      </details>
    </>
  );
}
