import { useEffect, useState } from "react";
import { useProgress } from "../stores/useProgress";
import LawAccordion from "../components/LawAccordion";
import {
  convertOnly,
  type RawLawItem,
  type LawWithArticles,
} from "../utils/transformLawData";
import { useUploadStore } from "../stores/useUploadStore";
import { http } from "../lib/http";

type CaseItem = {
  id: string;
  name: string;
  court: string;
  date: string;
  summary?: string;
};

export default function SimulatePage() {
  const { setPos } = useProgress();

  const uploaded = useUploadStore((s) => s.uploaded);
  const analysisById = useUploadStore((s) => s.analysisById);

  const [laws, setLaws] = useState<LawWithArticles[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseItem[] | null>(null);
  const [caseErr, setCaseErr] = useState<string | null>(null);

  useEffect(() => {
    setPos("post", 2);
  }, [setPos]);

  // 업로드된 각 파일의 분석 결과에서 법령 검색용 쿼리 추출
  const lawQuery = uploaded
    .map((file) => analysisById[String(file.id)]?.law_input?.trim())
    .filter((v): v is string => !!v && v.length > 0)
    .join("\n");

  // 업로드된 각 파일의 분석 결과에서 판례 검색용 쿼리 추출
  const caseQuery = uploaded
    .map((file) => analysisById[String(file.id)]?.case_input?.trim())
    .filter((v): v is string => !!v && v.length > 0)
    .join("\n");

  // 관련 법령 검색 (/ai/laws/search)
  useEffect(() => {
    if (!lawQuery) {
      setLaws([]);
      return;
    }

    (async () => {
      try {
        const { data } = await http.get<RawLawItem[]>("/ai/laws/search", {
          params: {
            q: lawQuery,
            k: 5,
            min_score: 0.05,
          },
        });
        const converted = convertOnly(data);
        setLaws(converted);
      } catch (e: unknown) {
        if (e instanceof Error) setErr(e.message);
        else setErr(String(e));
      }
    })();
  }, [lawQuery]);

  // 관련 판례 검색 (/ai/cases/search)
  useEffect(() => {
    if (!caseQuery) {
      setCases([]);
      return;
    }

    (async () => {
      try {
        const { data } = await http.get<CaseItem[]>("/ai/cases/search", {
          params: {
            q: caseQuery,
            k: 5,
            with_summary: true,
            with_body: false,
          },
        });
        setCases(data);
      } catch (e: unknown) {
        if (e instanceof Error) setCaseErr(e.message);
        else setCaseErr(String(e));
      }
    })();
  }, [caseQuery]);

  if (err) {
    return (
      <div className="px-4 py-8 text-sm text-red-600">
        관련 법령을 불러오는 중 오류가 발생했습니다: {err}
      </div>
    );
  }

  if (!laws) {
    return (
      <div className="px-4 py-8 text-sm text-gray-500">
        관련 법령을 불러오는 중입니다…
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-8">
      {/* AI 분석 요약 */}
      <section>
        <h2 className="mb-4 text-xl font-bold">AI 분석 요약</h2>

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
              const rating = analysis?.rating?.label as string | undefined;
              const reasons = (analysis?.rating?.reasons ?? []) as string[];

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
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-700">
                        법령 쿼리
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-gray-700">
                        {lawInput}
                      </p>
                    </div>
                  )}

                  {caseInput && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-700">
                        판례 쿼리
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-gray-700">
                        {caseInput}
                      </p>
                    </div>
                  )}

                  {reasons.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-700">
                        위험도 판단 이유
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-700">
                        {reasons.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 관련 판례 */}
      <section>
        <h2 className="mb-4 text-xl font-bold">관련 판례</h2>

        {caseErr && (
          <p className="text-sm text-red-600">
            관련 판례를 불러오는 중 오류가 발생했습니다: {caseErr}
          </p>
        )}

        {!caseErr && (!cases || cases.length === 0) && (
          <p className="text-sm text-gray-500">
            추천할 판례가 아직 없습니다.
          </p>
        )}

        {cases && cases.length > 0 && (
          <div className="space-y-3">
            {cases.map((c) => (
              <article
                key={c.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="text-sm font-semibold text-gray-800">
                  {c.name}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {c.court} · {c.date}
                </div>
                {c.summary && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-gray-700">
                    {c.summary}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 관련 법령 조항 */}
      <section>
        <h2 className="mb-4 text-xl font-bold">관련 법령 조항</h2>
        <LawAccordion laws={laws} />
      </section>
    </div>
  );
}
