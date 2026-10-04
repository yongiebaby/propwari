import type { Metadata } from "next";

export const metadata: Metadata = { title: "広告表記と編集方針", alternates: { canonical: "/disclosure" } };

export default function Disclosure() {
  return (
    <article className="max-w-2xl space-y-5">
      <h1 className="font-serif text-3xl">広告表記と編集方針</h1>
      <p>
        本サイトは、掲載している一部のプロップファームとアフィリエイト契約を結んでいます。
        本サイトのリンクから申し込みがあった場合、運営者が紹介料を受け取ることがあります。
        紹介料を受け取るリンクには「広告リンクです」と表示し、リンク属性に sponsored を付けています。
      </p>
      <p>
        比較表の並び順は、利用者が選んだ条件（参加費、利益目標、損失上限など）だけで決まり、紹介料の有無や金額では変えていません。
      </p>
      <p>
        掲載しているルールや価格は、各社の公式ページや公開情報をもとに整理しています。
        各ファームのページには確認の状況と出典を表示しています。ルールは予告なく変わることがあるため、申し込み前に必ず公式サイトで最新の規約を確認してください。
      </p>
      <p>本サイトの情報は投資助言ではありません。プロップファームの評価は損失や参加費の回収不能を伴うことがあります。</p>
      <p className="text-sm text-muted">運営者：［法人名・所在地・連絡先を記載］</p>
    </article>
  );
}
