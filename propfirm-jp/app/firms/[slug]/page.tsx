import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFirm, getFirms } from "@/lib/data";
import type { Availability, Program } from "@/lib/types";
import { formatJpy, formatMoney, toJpy } from "@/lib/fx";
import { resetTimeJst } from "@/lib/time";
import { SITE_URL } from "@/lib/site";
import { AVAIL_LABEL, BASIS_LABEL, CHALLENGE_LABEL, MAXDD_LABEL, PLATFORM_LABEL, VERIFY_LABEL } from "@/lib/labels";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getFirms()).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/firms/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const firm = await getFirm(slug);
  if (!firm) return {};
  return {
    title: `${firm.name}のルールと参加費`,
    alternates: { canonical: `/firms/${firm.slug}` },
    description: `${firm.name}の利益目標、日次損失の計算基準、最大損失、参加費、日本居住者の利用可否をまとめています。`,
  };
}

function Avail({ v, note }: { v: Availability; note?: string | null }) {
  return (
    <>
      <span className={v === "unknown" ? "text-muted" : ""}>{AVAIL_LABEL[v]}</span>
      {note && <span className="block text-xs text-muted">{note}</span>}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted py-2 pr-6 border-b border-rule">{label}</dt>
      <dd className="py-2 border-b border-rule">{children}</dd>
    </>
  );
}

function ProgramSection({ p }: { p: Program }) {
  const reset = p.dailyDd ? resetTimeJst(p.dailyDd.resetTime, p.dailyDd.resetTz) : null;
  return (
    <section id={p.slug} className="pt-10 scroll-mt-6">
      <h2 className="font-serif text-2xl">{p.name}</h2>
      <p className="text-sm text-muted">{CHALLENGE_LABEL[p.challengeType]}{p.platforms.length > 0 && `・${p.platforms.map((x) => PLATFORM_LABEL[x] ?? x).join(" / ")}`}</p>

      <table className="ledger text-sm mt-5 max-w-xl">
        <thead><tr><th>フェーズ</th><th className="r">利益目標</th><th className="r">最低取引日数</th><th className="r">期限</th></tr></thead>
        <tbody>
          {p.phases.map((ph, i) => (
            <tr key={i}>
              <td>フェーズ{i + 1}</td>
              <td className="r num">{ph.targetPct}%</td>
              <td className="r num">{ph.minDays ? `${ph.minDays}日` : "なし"}{ph.minTrades ? `・${ph.minTrades}取引` : ""}</td>
              <td className="r">{ph.maxDays ? `${ph.maxDays}日` : "無期限"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] text-sm mt-6 max-w-3xl">
        <Row label="日次の損失上限">
          {p.dailyDd ? (
            <>
              <span className="num">{p.dailyDd.pct}%</span>（{BASIS_LABEL[p.dailyDd.basis]}を基準
              {p.dailyDd.amountBase === "initial" ? `、損失額は初期残高の${p.dailyDd.pct}%で固定` : `、損失額は基準額の${p.dailyDd.pct}%`}）
              <span className="block text-xs text-muted">
                {reset ? `リセットは日本時間 ${reset}` : "リセット時刻は未確認"}
              </span>
            </>
          ) : "なし"}
        </Row>
        <Row label="最大損失"><span className="num">{p.maxDd.pct}%</span>（{MAXDD_LABEL[p.maxDd.type]}）</Row>
        <Row label="一貫性ルール">
          {p.consistency ? (
            <>
              {p.consistency.scope === "evaluation" ? "評価中に適用" : "報酬申請時に適用"}
              <span className="block text-xs text-muted">{p.consistency.note}</span>
            </>
          ) : "なし（または未確認）"}
        </Row>
        <Row label="EA（自動売買）"><Avail v={p.rules.ea} note={p.rules.eaNote} /></Row>
        <Row label="ニュース取引"><Avail v={p.rules.news} note={p.rules.newsNote} /></Row>
        <Row label="週末持ち越し"><Avail v={p.rules.weekend} /></Row>
        <Row label="コピートレード"><Avail v={p.rules.copy} note={p.rules.copyNote} /></Row>
        {p.leverageFx && <Row label="レバレッジ（FX）"><span className="num">{p.leverageFx}</span></Row>}
        <Row label="利益分配率">
          <span className="num">{p.payout.splitPct ?? "—"}%</span>
          {p.payout.splitMaxPct && p.payout.splitMaxPct !== p.payout.splitPct && <span className="num">（最大{p.payout.splitMaxPct}%）</span>}
          {p.payout.frequency && <span className="block text-xs text-muted">{p.payout.frequency}</span>}
          {p.payout.capNote && <span className="block text-xs text-muted">{p.payout.capNote}</span>}
        </Row>
        <Row label="参加費の返金">{p.payout.feeRefund == null ? <span className="text-muted">未確認</span> : p.payout.feeRefund ? "あり" : "なし"}</Row>
      </dl>

      {p.sizes.length > 0 ? (
        <>
        <table className="ledger text-sm mt-6 max-w-xl">
          <thead><tr><th>口座サイズ</th><th className="r">参加費</th><th className="r">円換算</th></tr></thead>
          <tbody>
            {p.sizes.map((s) => (
              <tr key={s.balance}>
                <td className="num">{formatMoney(s.balance, s.currency)}</td>
                <td className="r num">{formatMoney(s.price, s.currency)}</td>
                <td className="r num">{formatJpy(toJpy(s.price, s.currency))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!p.pricesVerified && (
          <p className="text-xs text-muted mt-2">価格は二次情報をもとにした目安です。購入前に公式サイトで確認してください。</p>
        )}
        </>
      ) : (
        <p className="text-sm text-muted mt-6">参加費は確認中です。</p>
      )}

      {p.notes && <p className="text-sm mt-5 max-w-3xl">{p.notes}</p>}
      {p.sourceUrl && (
        <p className="text-xs text-muted mt-2">
          出典：<a href={p.sourceUrl} className="underline break-all" rel="noopener" target="_blank">{p.sourceUrl}</a>
        </p>
      )}
    </section>
  );
}

export default async function FirmPage({ params }: PageProps<"/firms/[slug]">) {
  const { slug } = await params;
  const firm = await getFirm(slug);
  if (!firm) notFound();
  const href = firm.affiliateUrl ?? firm.websiteUrl;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "比較表", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: firm.name, item: `${SITE_URL}/firms/${firm.slug}` },
    ],
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }}
      />
      <p className="text-sm"><Link href="/" className="text-muted hover:text-ink">比較表に戻る</Link></p>
      <h1 className="font-serif text-4xl mt-3">{firm.name}</h1>
      <p className={`text-sm mt-2 ${firm.verifyStatus === "official" ? "text-pass" : "text-muted"}`}>
        {VERIFY_LABEL[firm.verifyStatus]}
        {firm.lastVerifiedAt && `・${firm.lastVerifiedAt}確認`}
      </p>

      <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] text-sm mt-8 max-w-3xl">
        <Row label="日本居住者"><Avail v={firm.jp.residents} note={firm.jp.note} /></Row>
        <Row label="日本からの出金実績"><Avail v={firm.jp.payoutProof} /></Row>
        <Row label="日本発行カード"><Avail v={firm.jp.card} /></Row>
        <Row label="日本語サポート">{firm.jp.support == null ? <span className="text-muted">未確認</span> : firm.jp.support ? "あり" : "なし"}</Row>
        {firm.riskNote && <Row label="運営面の注意"><span className="text-breach">{firm.riskNote}</span></Row>}
      </dl>

      {href && (
        <p className="mt-6">
          <a
            href={href}
            target="_blank"
            rel={firm.affiliateUrl ? "sponsored noopener" : "noopener"}
            className="inline-block bg-indigo text-sheet px-5 py-2.5 rounded text-sm font-medium"
          >
            {firm.name}の公式サイトを開く
          </a>
          {firm.affiliateUrl && <span className="block text-xs text-muted mt-1">広告リンクです</span>}
        </p>
      )}

      {firm.programs.map((p) => <ProgramSection key={p.slug} p={p} />)}
    </article>
  );
}
