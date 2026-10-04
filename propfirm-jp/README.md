# プロップ割

日本から使えるFX/CFDプロップファームのルール比較と合格率シミュレーター。
工程表と変更記録は [docs/ROADMAP.md](docs/ROADMAP.md)。

## 動かす

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # シミュレーションと時刻換算のテスト
```

環境変数が未設定なら `data/firms.json` を読んで動きます。

## Supabase（構築済み）

- プロジェクト: Propwari（東京リージョン, ref `fasszhmadbkijmeqdptv`）
- `supabase/schema.sql` 適用済み、7社11プランを投入済み
- `.env.example` に接続先が入っている。ローカルでは `.env.local` にコピーすればDBから読む

データを更新するとき（どちらか）
- `npm run -s db:seed-sql > seed.sql` で生成したSQLを、SupabaseのSQLエディタで実行（キー不要）
- `SUPABASE_SERVICE_ROLE_KEY` を設定して `npm run db:seed`

ルールをSupabase Studioで直接書き換えると、`rule_changes` に変更前後が自動で記録される。

## 公開（Vercel）

1. このフォルダをGitHubのリポジトリにpush
2. Vercelで「Add New → Project」からリポジトリを取り込む（設定はデフォルトのまま）
3. Environment Variables に `.env.example` の上3つ（SITE_URL、SUPABASE_URL、PUBLISHABLE_KEY）を登録
4. Settings → Domains で `propwari.com` を追加し、表示されたDNSレコードをドメインの管理画面に設定

## 構成

| パス | 役割 |
| --- | --- |
| `data/firms.json` | 初期データ（単一の情報源） |
| `lib/data.ts` | JSON／Supabaseから同じ形でデータを読む |
| `lib/sim.ts` | 合格率のモンテカルロ計算 |
| `lib/compare.ts` | 口座サイズの選択、実質価格、並べ替え用の指標 |
| `lib/time.ts` | 日次リセット時刻の日本時間換算 |
| `app/` | 比較表、ファーム詳細、シミュレーター、広告表記 |
| `supabase/schema.sql` | DBスキーマ |
| `scripts/seed.ts` | JSON → DB |

## データを追加・修正するとき

- 公式ページで確認したら `verifyStatus` を `"official"`、`lastVerifiedAt` を確認日にする
- 情報源で食い違う値は `notes` に「要確認」と書き、工程表の未解決リストに足す
- 日次リセットがNYクローズのファームは `"resetTime": "17:00", "resetTz": "America/New_York"`
