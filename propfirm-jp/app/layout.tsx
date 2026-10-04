import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { FX_TO_JPY, FX_UPDATED_AT } from "@/lib/fx";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: { type: "website", locale: "ja_JP", siteName: SITE_NAME },
  twitter: { card: "summary" },
  title: { default: `${SITE_NAME}｜日本から使えるプロップファームのルール比較`, template: `%s｜${SITE_NAME}` },
  description:
    "FX/CFDプロップファームの日次ドローダウンの基準、最大損失の種類、利益目標、参加費を同じ物差しで比較。自分の勝率とリスクで各社の合格率も試算できます。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* App Routerのルートレイアウトなので全ページで読み込まれる */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@600&display=swap"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-rule">
          <nav className="mx-auto max-w-6xl px-5 py-4 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <Link href="/" className="font-serif text-xl tracking-wide">{SITE_NAME}</Link>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted whitespace-nowrap">
              <Link href="/" className="hover:text-ink">比較表</Link>
              <Link href="/simulator" className="hover:text-ink">シミュレーター</Link>
              <Link href="/changes" className="hover:text-ink">変更記録</Link>
              <Link href="/disclosure" className="hover:text-ink">広告表記</Link>
            </div>
          </nav>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-10">{children}</main>
        <footer className="border-t border-rule text-xs text-muted">
          <div className="mx-auto max-w-6xl px-5 py-6 space-y-1">
            <p>
              掲載情報は各社のルール変更で古くなることがあります。購入前に必ず公式サイトで最新の規約を確認してください。
              投資助言ではありません。
            </p>
            <p className="num">
              円換算は概算レート（1ドル={FX_TO_JPY.USD}円、1ユーロ={FX_TO_JPY.EUR}円、{FX_UPDATED_AT}時点）で計算しています。
            </p>
            <p>本サイトはアフィリエイトプログラムを利用しています。<Link href="/disclosure" className="underline">広告表記</Link></p>
          </div>
        </footer>
      </body>
    </html>
  );
}
