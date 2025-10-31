import { useEffect, useState } from "react";
import { useProgress } from "../stores/useProgress";
import LawAccordion from "../components/LawAccordion";
import { convertOnly, type RawLawItem, type LawWithArticles } from "../utils/transformLawData";

export default function SimulatePage() {
  const { setPos } = useProgress();
  const [laws, setLaws] = useState<LawWithArticles[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setPos("post", 2); }, [setPos]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/couseLs_filtered.json", { cache: "no-store" });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const raw: RawLawItem[] = await r.json();
        const converted = convertOnly(raw);
        setLaws(converted);
      } catch (e: unknown) {
        if (e instanceof Error) setErr(e.message);
        else setErr(String(e));
      }
    })();
  }, []);

  if (err) return <div className="px-4 py-8 text-red-600">로드 오류: {err}</div>;
  if (!laws) return <div className="px-4 py-8 text-gray-500">불러오는 중…</div>;

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-4">관련 법령 조항</h1>
      <LawAccordion laws={laws} />
    </div>
  );
}
