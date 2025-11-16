import { useEffect, useState } from "react";
import { useProgress } from "../stores/useProgress";
import LawAccordion from "../components/LawAccordion";
import type { LawWithArticles } from "../types/law";
import { useUploadStore } from "../stores/useUploadStore";
import { http } from "../lib/http";

type LawApiItem = {
  rank: number;
  score: number;
  law_name: string;
  article_no: string;
  snippet: string;
};

type LawsSearchResponse = {
  query: string;
  count: number;
  items: LawApiItem[];
};

type RawCaseApiItem = {
  doc_id: number;
  사건명: string;
  법원명: string;
  선고일자: string;
  본문요약?: string;
};

type CasesSearchResponse = {
  query: string;
  count: number;
  items: RawCaseApiItem[];
};

type CaseItem = {
  id: string;
  name: string;
  court: string;
  date: string;
  summary?: string;
};

// /ai/laws/search 응답을 LawWithArticles[] 로 변환
function toLawWithArticles(data: LawsSearchResponse): LawWithArticles[] {
  const grouped: Record<string, LawWithArticles> = {};

  data.items.forEach((item, idx) => {
    const lawName = item.law_name;

    if (!grouped[lawName]) {
      grouped[lawName] = {
        // 실제 타입 구조와 맞추기 위해 any 캐스팅
        lawId: lawName,
        lawName,
        articles: [],
      } as unknown as LawWithArticles;
    }

    const law = grouped[lawName];

    const cleanNumber = item.article_no
      .replace(/^제/, "")
      .replace(/조$/, "")
      .trim();

    const article = {
      key: `${lawName}-${item.article_no}-${idx}`,
      number: cleanNumber || item.article_no,
      title: item.article_no, // "제11조" 같은 형태
      text: item.snippet,
    } as any;

    (law.articles as any[]).push(article);
  });

  return Object.values(grouped);
}

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

  // === 검색용 쿼리 추출 ===
  const lawQuery = uploaded
    .map((file) => analysisById[String(file.id)]?.law_input?.trim())
    .filter((v): v is string => !!v && v.length > 0)
    .join("\n");

  const caseQuery = uploaded
    .map((file) => analysisById[String(file.id)]?.case_input?.trim())
    .filter((v): v is string => !!v && v.length > 0)
    .join("\n");

  // === 관련 법령 검색 (/ai/laws/search) ===
  useEffect(() => {
    if (!lawQuery) {
      setLaws([]);
      return;
    }

    (async () => {
      try {
        const { data } = await http.get<LawsSearchResponse>("/ai/laws/search", {
          params: {
            q: lawQuery,
            k: 5,
            min_score: 0.05,
          },
        });

        const converted = toLawWithArticles(data);
        setLaws(converted);
        setErr(null);
      } catch (e: unknown) {
        console.error("/ai/laws/search error:", e);
        if (e instanceof Error) setErr(e.message);
        else setErr(String(e));
        setLaws([]);
      }
    })();
  }, [lawQuery]);

  // === 관련 판례 검색 (/ai/cases/search) ===
  useEffect(() => {
    if (!caseQuery) {
      setCases([]);
      return;
    }

    (async () => {
      try {
        const { data } = await http.get<CasesSearchResponse>(
          "/ai/cases/search",
          {
            params: {
              q: caseQuery,
              k: 5,
              with_summary: true,
              with_body: false,
            },
          },
        );

        const caseItems: CaseItem[] = data.items.map((item) => ({
          id: String(item.doc_id),
          name: item["사건명"],
          court: item["법원명"],
          date: item["선고일자"],
          summary: item["본문요약"],
        }));

        setCases(caseItems);
        setCaseErr(null);
      } catch (e: unknown) {
        console.error("/ai/cases/search error:", e);
        if (e instanceof Error) setCaseErr(e.message);
        else setCaseErr(String(e));
        setCases([]);
      }
    })();
  }, [caseQuery]);

  // === 로딩/에러 처리 ===
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

  // === 화면 렌더링 ===
  return (
    <div className="px-4 py-6 space-y-8">
      {/* AI 분석 요약 */}
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
