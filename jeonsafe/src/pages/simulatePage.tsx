import { useEffect, useState } from "react";
import { useProgress } from "../stores/useProgress";
import LawAccordion from "../components/LawAccordion";
import { convertOnly, type RawLawItem, type LawWithArticles } from "../utils/transformLawData";
import { useUploadStore } from "../stores/useUploadStore";




export default function SimulatePage() {
  const { setPos } = useProgress();
  const [laws, setLaws] = useState<LawWithArticles[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const uploaded = useUploadStore((s) => s.uploaded);
  const analysisById = useUploadStore((s) => s.analysisById);
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
    <div className="px-4 py-6 space-y-8">
      <section>
        <h1 className="text-xl font-bold mb-3 text-[#113F67]">
          AI 분석 요약
        </h1>

        {uploaded.length === 0 ? (
          <p className="text-sm text-gray-500">
            이전 단계에서 업로드한 파일이 없습니다. 업로드 후 다시 시도해 주세요.
          </p>
        ) : (
          <div className="space-y-4">
            {uploaded.map((file) => {
              const id = String(file.id);
              const analysis = analysisById[id];

              const lawInput = analysis?.law_input;
              const caseInput = analysis?.case_input;
              const rating = analysis?.rating?.label;
              const reasons = analysis?.rating?.reasons ?? [];

              return (
                <div
                  key={id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-gray-800">
                      {file.original_filename}
                    </div>
                    {rating && (
                      <span className="inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5 text-[11px] text-gray-700">
                        위험도: {rating}
                      </span>
                    )}
                  </div>

                  {lawInput && (
                    <div className="mt-2 text-xs text-gray-700">
                      <span className="font-semibold text-[#113F67]">
                        법령 관점 분석:&nbsp;
                      </span>
                      {lawInput}
                    </div>
                  )}

                  {caseInput && (
                    <div className="mt-1 text-xs text-gray-700">
                      <span className="font-semibold text-[#113F67]">
                        판례 관점 분석:&nbsp;
                      </span>
                      {caseInput}
                    </div>
                  )}

                  {reasons.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-[11px] text-gray-600">
                      {reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}

                  {!analysis && (
                    <p className="mt-2 text-[11px] text-gray-400">
                      이 파일에 대한 AI 분석 결과가 아직 없습니다.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">관련 법령 조항</h2>
        <LawAccordion laws={laws} />
      </section>
    </div>
  );
}
