import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  url: string;            // 원문 링크(법령/조문)
};

export default function LawModal({ open, onClose, url }: Props) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErr(null);
    setHtml("");

    // 프록시 통해 원문 HTML 가져오기
    fetch(`/proxy/html?url=${encodeURIComponent(url)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.text();
      })
      .then((txt) => setHtml(txt))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [open, url]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[min(1100px,92vw)] h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">법령 원문</div>
          <button className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200" onClick={onClose}>닫기</button>
        </div>

        <div className="h-[calc(80vh-48px)] overflow-auto">
          {loading && <div className="p-6 text-gray-500">불러오는 중…</div>}
          {err && <div className="p-6 text-red-600">원문 로드 실패: {err}</div>}
          {!loading && !err && (
            <iframe title="law" className="w-full h-full" srcDoc={html}></iframe>
          )}
        </div>
      </div>
    </div>
  );
}
