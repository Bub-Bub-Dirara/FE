import { useEffect, useState } from "react";
import { useProgress } from "../stores/useProgress";
import type { LawWithArticles } from "../types/law";
import { useUploadStore } from "../stores/useUploadStore";
import { http } from "../lib/http";

// mappingPage UI에서 사용하는 컴포넌트들
import TwoPaneViewer from "../components/TwoPaneViewer";
import DocList from "../components/DocList";
import type { Doc } from "../types/doc";

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
      title: item.article_no,
      text: item.snippet,
    } as any;

    (law.articles as any[]).push(article);
  });

  return Object.values(grouped);
}

// mappingPage에서 쓰던 플레이스홀더 이미지
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="220">
       <rect width="100%" height="100%" fill="#f3f4f6"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             font-family="sans-serif" font-size="16" fill="#9ca3af">
         미리보기 이미지가 없습니다
       </text>
     </svg>`
  );

export default function SimulatePage() {
  const { setPos } = useProgress();

  const uploaded = useUploadStore((s) => s.uploaded);
  const analysisById = useUploadStore((s) => s.analysisById);

  const [laws, setLaws] = useState<LawWithArticles[] | null>(null);
  const [lawErr, setLawErr] = useState<string | null>(null);

  const [cases, setCases] = useState<CaseItem[] | null>(null);
  const [caseErr, setCaseErr] = useState<string | null>(null);

  // 좌측 DocList 데이터 (업로드된 파일 목록)
  const docs: Doc[] =
    uploaded.length > 0
      ? uploaded.map((file, idx) => ({
          id: file.id ?? idx + 1,
          name: file.original_filename ?? `파일 ${idx + 1}`,
          type: "other",
        }))
      : [];

  const [activeDocId, setActiveDocId] = useState<number>(() => docs[0]?.id ?? 0);

  // 단계 위치
  useEffect(() => {
    setPos("post", 2);
  }, [setPos]);

  // 업로드 목록이 바뀌면 activeDocId 보정
  useEffect(() => {
    if (docs.length === 0) {
      setActiveDocId(0);
      return;
    }
    const exists = docs.some((d) => d.id === activeDocId);
    if (!exists) {
      setActiveDocId(docs[0].id);
    }
  }, [docs, activeDocId]);

  const activeDoc = docs.find((d) => d.id === activeDocId) ?? docs[0];

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
      setLawErr(null);
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
        setLawErr(null);
      } catch (e: unknown) {
        console.error("/ai/laws/search error:", e);
        if (e instanceof Error) setLawErr(e.message);
        else setLawErr(String(e));
        setLaws([]);
      }
    })();
  }, [lawQuery]);

  // === 관련 판례 검색 (/ai/cases/search) ===
  useEffect(() => {
    if (!caseQuery) {
      setCases([]);
      setCaseErr(null);
      return;
    }

    (async () => {
      try {
        const { data } = await http.get<CasesSearchResponse>("/ai/cases/search", {
          params: {
            q: caseQuery,
            k: 5,
            with_summary: true,
            with_body: false,
          },
        });

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

  const left = <DocList docs={docs} activeId={activeDocId} onSelect={setActiveDocId} />;
  const rightHeader = { title: "AI 분석 결과" };

  const isLawLoading = laws === null && !lawErr && !!lawQuery;
  const hasNoLawQuery = !lawQuery;

  return (
    <div className="min-h-dvh overflow-hidden bg-white">
      <main className="flex-1">
        <div className="w-full p-4 pb-24 overflow-hidden">
          <TwoPaneViewer left={left} rightHeader={rightHeader}>
            <div className="space-y-6">
              {/* 업로드 문서 미리보기 영역 (mappingPage 스타일) */}
              <section className="w-full max-w-3xl mx-auto">
                <h3 className="text-base font-semibold mb-2">업로드 문서</h3>
                <div className="rounded-xl border border-2 border-[#113F67] bg-white p-3">
                  <div className="flex items-center gap-4">
                    <div className="w-full h-40 sm:h-44 md:h-48 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={PLACEHOLDER}
                        alt={activeDoc?.name ?? "미리보기"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  {activeDoc && (
                    <div className="mt-3 text-xs text-gray-700">
                      <span className="font-semibold text-[#113F67]">선택된 문서:&nbsp;</span>
                      {activeDoc.name}
                    </div>
                  )}
                  {docs.length === 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      이전 단계에서 업로드된 문서가 없습니다. 파일을 업로드하면 이 영역에 문서가 표시돼요.
                    </p>
                  )}
                </div>
              </section>

              {/* AI 분석 요약 */}
              <section className="w-full max-w-3xl mx-auto space-y-4">
                <h1 className="text-xl font-bold mb-1 text-[#113F67]">AI 분석 요약</h1>

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

              {/* 관련 판례 – 예쁜 아코디언 카드 UI */}
              <section className="w-full max-w-3xl mx-auto space-y-3">
                <h2 className="text-xl font-bold">관련 판례</h2>

                {caseErr && (
                  <p className="text-sm text-red-600">
                    관련 판례를 불러오는 중 오류가 발생했습니다: {caseErr}
                  </p>
                )}

                {!caseErr && (!cases || cases.length === 0) && (
                  <p className="text-sm text-gray-500">추천할 판례가 아직 없습니다.</p>
                )}

                {cases && cases.length > 0 && <CaseAccordion cases={cases} />}
              </section>

              {/* 관련 법령 조항 – 판례와 같은 카드형 아코디언 UI */}
              <section className="w-full max-w-3xl mx-auto">
                <h2 className="mb-3 text-xl font-bold">관련 법령 조항</h2>

                {lawErr && (
                  <p className="text-sm text-red-600">
                    관련 법령을 불러오는 중 오류가 발생했습니다: {lawErr}
                  </p>
                )}

                {hasNoLawQuery && !lawErr && (
                  <p className="text-sm text-gray-500">
                    분석 결과에서 추출된 법령 검색어가 없습니다.
                  </p>
                )}

                {isLawLoading && (
                  <p className="text-sm text-gray-500">관련 법령을 불러오는 중입니다…</p>
                )}

                {!isLawLoading && !lawErr && laws && laws.length === 0 && !hasNoLawQuery && (
                  <p className="text-sm text-gray-500">추천할 법령이 없습니다.</p>
                )}

                {!isLawLoading && !lawErr && laws && laws.length > 0 && (
                  <LawAccordionSimple laws={laws} />
                )}
              </section>
            </div>
          </TwoPaneViewer>
        </div>
      </main>
    </div>
  );
}

/** 관련 판례: 카드형 아코디언 */
function CaseAccordion({ cases }: { cases: CaseItem[] }) {
  return (
    <div className="space-y-4">
      {cases.map((c) => (
        <CaseBlock key={c.id} item={c} />
      ))}
    </div>
  );
}

function CaseBlock({ item }: { item: CaseItem }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-gray-900">{item.name}</div>
          <div className="mt-1 text-xs text-gray-500">
            {item.court} · {item.date}
          </div>
        </div>
        <span className="ml-4 text-[11px] text-gray-400">
          {open ? "접기" : "자세히"}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          {item.summary ? (
            <p className="whitespace-pre-wrap text-xs text-gray-700">{item.summary}</p>
          ) : (
            <p className="text-xs text-gray-400">요약 정보가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** 관련 법령 조항: 판례와 동일한 스타일의 카드형 아코디언 */
function LawAccordionSimple({ laws }: { laws: LawWithArticles[] }) {
  return (
    <div className="space-y-4">
      {laws.map((law) => (
        <LawBlock key={law.lawId ?? law.lawName} law={law} />
      ))}
    </div>
  );
}

function LawBlock({ law }: { law: LawWithArticles }) {
  const [open, setOpen] = useState(true);

  const articles = ((law.articles ?? []) as any[]) || [];

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {law.lawName || law.lawId}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {articles.length > 0 ? `${articles.length}개 조항` : "조문 정보 없음"}
          </div>
        </div>
        <span className="ml-4 text-[11px] text-gray-400">
          {open ? "접기" : "자세히"}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
          {articles.length === 0 && (
            <p className="text-xs text-gray-400">표시할 조문이 없습니다.</p>
          )}

          {articles.map((a) => {
            const key = a.key ?? a.number ?? a.title;
            const title = a.title || a.number;
            const text = a.text ?? a.content ?? "";

            return (
              <div
                key={key}
                className="rounded-xl bg-white px-3 py-2 shadow-sm border border-gray-100"
              >
                {title && (
                  <div className="text-xs font-semibold text-gray-900">{title}</div>
                )}
                {text && (
                  <p className="mt-1 text-[11px] text-gray-700 whitespace-pre-wrap">
                    {text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
