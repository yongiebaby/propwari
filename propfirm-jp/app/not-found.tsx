import Link from "next/link";
export default function NotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-3xl">ページが見つかりません</h1>
      <p className="mt-4">URLが変わったか、掲載を終了したファームの可能性があります。<Link href="/" className="underline">比較表</Link>から探してください。</p>
    </div>
  );
}
