/** 公開URL。ドメイン取得後に環境変数で設定する */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://propwari.com").replace(/\/$/, "");
export const SITE_NAME = "プロップ割";
