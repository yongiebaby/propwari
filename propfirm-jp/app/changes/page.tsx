import type { Metadata } from "next";
import Link from "next/link";
import log from "@/data/changelog.json";
import { getFirms } from "@/lib/data";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "ルール変更と訂正の記録",
  alternates: { canonical: "/changes" },
  description: "プロップファーム各社のルール変更と、当サイトの掲載情報の訂正・確認の記録です。",
};

const KIND_LABEL: Record<string, string> = {
  rule_change: "ルール変更",
  correction: "当サイトの訂正",
  verified: "公式で確認",
};

type Entry = { date: string; firm: string; kind: string; title: string; body: string };

export default async function Changes() {
  const firms = await getFirms();
  const name = (slug: string) => firms.find((f) => f.slug === slug)?.name ?? slug;
  const entries = [...(log.entries as Entry[])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <article className="max-w-3xl">
      <h1 className="font-serif text-3xl md:text-4xl">ルール変更と訂正の記録</h1>
      <p className="mt-4 text-muted">
        各社のルール変更に加えて、当サイトが掲載内容を誤っていた場合の訂正も残しています。
      </p>
      <ol className="mt-10 border-t-2 border-ink">
        {entries.map((e, i) => (
          <li key={i} className="py-5 border-b border-rule">
            <p className="text-sm text-muted num">
              <time dateTime={e.date}>{e.date.replaceAll("-", "/")}</time>
              <span className={`ml-3 ${e.kind === "correction" ? "text-breach" : e.kind === "verified" ? "text-pass" : ""}`}>
                {KIND_LABEL[e.kind] ?? e.kind}
              </span>
              <Link href={`/firms/${e.firm}`} className="ml-3 hover:text-ink underline underline-offset-2">{name(e.firm)}</Link>
            </p>
            <h2 className="mt-1 font-medium text-lg">{e.title}</h2>
            <p className="mt-1">{e.body}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}
