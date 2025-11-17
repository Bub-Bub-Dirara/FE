/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useProgress } from "../stores/useProgress";
import TwoPaneViewer from "../components/TwoPaneViewer";
import ReportButton from "../components/ReportButton";
import DocList from "../components/DocList";
import type { Doc } from "../types/doc";
import type { FileRecord } from "../types/file";

// 업로드 파일 & GPT 위험결과 스토어
import { useUploadStore } from "../stores/useUploadStore";
import { useRiskStore } from "../stores/useRiskStore";
import type { ExtractRisksItem, RiskLabel } from "../lib/extractRisks";

// PDF 뷰어 + presigned URL
import PdfViewer from "../components/viewers/PdfViewer";
import { getDownloadUrl, resolveViewUrl } from "../lib/files";
import { pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// 법령/판례 검색용 타입 & API
import type { LawWithArticles } from "../types/law";
import { http } from "../lib/http";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// RiskPage와 동일한 width
const VIEW_W = 700;
const PAGE_WIDTH = VIEW_W - 16 * 2;

// 위험도별 하이라이트 색
const RISK_HIGHLIGHT_COLOR: Record<RiskLabel, string> = {
  G: "rgba(34,197,94,0.25)",
  M: "rgba(245,158,11,0.25)",
  B: "rgba(248,113,113,0.25)",
};

/** 좌측: 위험조항 리스트용 (일단 기존 mock 그대로 유지) */
type Risk = { id: string; title: string; preview: string };

const MOCK_RISKS: Risk[] = [
  {
    id: "r1",
    title: "실권리자명의 등기",
    preview: "임대인의 실권리자 확인 및 등기 미이행 시 책임...",
  },
  {
    id: "r2",
    title: "보증보험 미가입",
    preview: "보증보험 미가입 주택으로 보증금 반환 위험...",
  },
  {
    id: "r3",
    title: "특약 – 원상복구 전가",
    preview: "과도한 원상복구 비용을 임차인에 전가...",
  },
];

/** 이미지 없을 때 플레이스홀더 (가로 넓고 세로 얕게) */
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="220">
       <rect width="100%" height="100%" fill="#f3f4f6"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             font-family="sans-serif" font-size="16" fill="#9ca3af">
         미리보기 이미지가 없습니다
       </text>
     </svg>`,
  );

// ====== 법령/판례 검색 응답 타입 ======
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

export default function MappingPage() {
  const { setPos } = useProgress();
  useEffect(() => {
    setPos("pre", 2);
  }, [setPos]);

  // 업로드 파일 & GPT 위험결과 가져오기
  const uploaded = useUploadStore((s) => s.uploaded);
  const analysisById = useUploadStore((s) => s.analysisById);
  const riskItems = useRiskStore((s) => s.items);

  // 좌측: 위험조항(현재는 첫 항목 고정 사용)
  const [risks] = useState<Risk[]>(MOCK_RISKS);
  const active = risks[0];

  // 업로드 파일 → Doc 형태로 변환
  const docs: Doc[] = useMemo(
    () =>
      (uploaded as FileRecord[]).map((r) => {
        const isPdf = r.content_type === "application/pdf";
        const isImg = r.content_type?.startsWith("image/");
        return {
          id: r.id,
          name: r.original_filename,
          type: isPdf ? "pdf" : isImg ? "image" : "other",
        } as Doc;
      }),
    [uploaded],
  );

  // 우측: 문서 선택 상태
  const [activeDocId, setActiveDocId] = useState<number | null>(null);

  // 문서별 뷰 URL 캐시
  const [srcMap, setSrcMap] = useState<Record<number, string>>({});

  // PDF 페이지 상태
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);

  // docs가 준비되면 첫 번째 문서를 자동 선택
  useEffect(() => {
    if (docs.length > 0 && activeDocId == null) {
      setActiveDocId(docs[0].id);
    }
  }, [docs, activeDocId]);

  // 업로드된 파일들에 대해 presigned view URL 생성
  useEffect(() => {
    (async () => {
      if (!uploaded || uploaded.length === 0) return;

      const map: Record<number, string> = {};
      for (const r of uploaded as FileRecord[]) {
        try {
          const raw = (await resolveViewUrl(r)) as unknown;
          let url: string;
          if (typeof raw === "string") {
            url = raw;
          } else if (
            raw &&
            typeof raw === "object" &&
            "url" in (raw as Record<string, unknown>) &&
            typeof (raw as { url: unknown }).url === "string"
          ) {
            url = (raw as { url: string }).url;
          } else {
            console.error("invalid view-url response:", raw);
            continue;
          }
          map[r.id] = url;
        } catch (e) {
          console.error("Failed to resolve view URL:", r.id, e);
        }
      }
      setSrcMap(map);
    })();
  }, [uploaded]);

  // 현재 선택된 문서
  const activeDoc = useMemo(
    () =>
      activeDocId == null
        ? null
        : docs.find((d) => d.id === activeDocId) ?? null,
    [docs, activeDocId],
  );

  // 현재 문서에 대한 뷰 URL
  const activeSrc = useMemo(
    () => (activeDoc ? srcMap[activeDoc.id] ?? null : null),
    [activeDoc, srcMap],
  );

  // 현재 문서에 대한 GPT 위험 결과
  const activeRisk: ExtractRisksItem | undefined = useMemo(
    () => (activeDoc ? riskItems[activeDoc.id] : undefined),
    [riskItems, activeDoc],
  );

  // law_input / case_input 배열 뽑기 (risky_sentences 전체에서)
  const lawInputs = useMemo(
    () =>
      activeRisk?.risky_sentences
        ?.map((s) => s.law_input?.trim())
        .filter((t): t is string => Boolean(t)) ?? [],
    [activeRisk],
  );
  const caseInputs = useMemo(
    () =>
      activeRisk?.risky_sentences
        ?.map((s) => s.case_input?.trim())
        .filter((t): t is string => Boolean(t)) ?? [],
    [activeRisk],
  );

  // PDF 하이라이트 정보
  const pdfHighlights = useMemo(
    () =>
      activeRisk
        ? activeRisk.risky_sentences.flatMap((r, idx) =>
            (r.positions ?? []).map((p) => ({
              page: p.page,
              x: p.x,
              y: p.y,
              w: p.w,
              h: p.h,
              pageWidth: p.page_width,
              pageHeight: p.page_height,
              color: RISK_HIGHLIGHT_COLOR[r.risk_label],
              reason: r.reason,
              index: idx,
              sentence: r.sentence,
            })),
          )
        : [],
    [activeRisk],
  );

  // 문서 변경 시 페이지 다시 1페이지로
  useEffect(() => {
    setPageNumber(1);
  }, [activeDocId]);

  // presigned URL 만료 시 다시 받기
  const handlePdfLoadError = async (err: unknown) => {
    console.warn("PDF Load Error (mapping):", err);
    if (!activeDoc) return;
    try {
      const fresh = await getDownloadUrl(activeDoc.id);
      setSrcMap((m) => ({ ...m, [activeDoc.id]: fresh }));
    } catch (e) {
      console.error("Failed to refresh presigned URL (mapping)", e);
    }
  };

  // ===== 관련 법령 / 판례 검색 상태 =====
  const [laws, setLaws] = useState<LawWithArticles[] | null>(null);
  const [lawErr, setLawErr] = useState<string | null>(null);

  const [cases, setCases] = useState<CaseItem[] | null>(null);
  const [caseErr, setCaseErr] = useState<string | null>(null);

  // === 관련 법령 검색 (/ai/laws/search) – law_input 개수만큼 호출해서 모두 합치기 ===
  useEffect(() => {
    if (!lawInputs || lawInputs.length === 0) {
      setLaws([]);
      setLawErr(null);
      return;
    }

    (async () => {
      try {
        // law_input 하나당 1번씩 호출
        const responses = await Promise.all(
          lawInputs.map((q) =>
            http
              .get<LawsSearchResponse>("/ai/laws/search", {
                params: {
                  q,
                  k: 5,
                  min_score: 0.05,
                },
              })
              .then((res) => res.data),
          ),
        );

        // 모든 items를 하나의 배열로 합치기
        const mergedItems: LawApiItem[] = [];
        responses.forEach((res) => {
          if (Array.isArray(res.items)) {
            mergedItems.push(...res.items);
          }
        });

        const synthetic: LawsSearchResponse = {
          query: lawInputs.join(" | "),
          count: mergedItems.length,
          items: mergedItems,
        };

        const converted = toLawWithArticles(synthetic);
        setLaws(converted);
        setLawErr(null);
      } catch (e: unknown) {
        console.error("/ai/laws/search error (MappingPage):", e);
        if (e instanceof Error) setLawErr(e.message);
        else setLawErr(String(e));
        setLaws([]);
      }
    })();
  }, [lawInputs]);

  // === 관련 판례 검색 (/ai/cases/search) – case_input 개수만큼 호출해서 모두 합치기 ===
  useEffect(() => {
    if (!caseInputs || caseInputs.length === 0) {
      setCases([]);
      setCaseErr(null);
      return;
    }

    (async () => {
      try {
        const responses = await Promise.all(
          caseInputs.map((q) =>
            http
              .get<CasesSearchResponse>("/ai/cases/search", {
                params: {
                  q,
                  k: 5,
                  with_summary: true,
                  with_body: false,
                },
              })
              .then((res) => res.data),
          ),
        );

        const mergedCases: CaseItem[] = [];
        responses.forEach((res, inputIdx) => {
          res.items.forEach((item, rankIdx) => {
            mergedCases.push({
              id: `${item.doc_id}-${inputIdx}-${rankIdx}`,
              name: item["사건명"],
              court: item["법원명"],
              date: item["선고일자"],
              summary: item["본문요약"],
            });
          });
        });

        setCases(mergedCases);
        setCaseErr(null);
      } catch (e: unknown) {
        console.error("/ai/cases/search error (MappingPage):", e);
        if (e instanceof Error) setCaseErr(e.message);
        else setCaseErr(String(e));
        setCases([]);
      }
    })();
  }, [caseInputs]);

  const isLawLoading = laws === null && !lawErr && lawInputs.length > 0;
  const hasNoLawQuery = lawInputs.length === 0;

  /** 좌측 패널: 문서 리스트 */
  const left =
    docs.length > 0 ? (
      <DocList
        docs={docs}
        activeId={activeDocId ?? -1}
        onSelect={(id) => setActiveDocId(id)}
      />
    ) : (
      <div className="text-sm text-gray-400 px-2 py-4">
        업로드된 문서가 없습니다.
      </div>
    );

  const rightHeader = { title: active?.title ?? "위험조항 매핑" };

  /** 우측 본문 */
  const LawArea = (
    <div className="space-y-6">
      {/* PDF / 이미지 미리보기 */}
      <section className="w-full max-w-3xl mx-auto">
        <h3 className="text-base font-semibold mb-2">업로드 문서</h3>
        <div className="rounded-xl border border-2 border-[#113F67] bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-800">
              {activeDoc ? activeDoc.name : "문서를 선택해 주세요"}
            </span>

            {activeDoc?.type === "pdf" && (
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <button
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
                    pageNumber > 1
                      ? "hover:bg-gray-100"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  ‹
                </button>
                <span className="tabular-nums">
                  {pageNumber} / {numPages}p
                </span>
                <button
                  onClick={() =>
                    setPageNumber((p) => Math.min(numPages, p + 1))
                  }
                  disabled={pageNumber >= numPages}
                  className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
                    pageNumber < numPages
                      ? "hover:bg-gray-100"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  ›
                </button>
              </div>
            )}
          </div>

          <div className="w-full rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {activeDoc && activeSrc ? (
              activeDoc.type === "pdf" ? (
                <PdfViewer
                  src={activeSrc}
                  page={pageNumber}
                  width={PAGE_WIDTH}
                  onLoad={(n) => setNumPages(n)}
                  onError={handlePdfLoadError}
                  highlights={pdfHighlights}
                />
              ) : activeDoc.type === "image" ? (
                <img
                  src={activeSrc}
                  alt={activeDoc.name}
                  className="w-full h-64 object-contain bg-gray-100"
                  loading="lazy"
                />
              ) : (
                <div className="py-10 text-sm text-gray-500">
                  미리보기를 지원하지 않는 형식입니다.
                </div>
              )
            ) : (
              <img
                src={PLACEHOLDER}
                alt={activeDoc?.name ?? "미리보기"}
                className="w-full h-40 sm:h-44 md:h-48 object-cover"
                loading="lazy"
              />
            )}
          </div>
        </div>
      </section>

      {/* law_input / case_input 확인용 블록 */}
      <section className="w-full max-w-3xl mx-auto">
        <h3 className="text-base font-semibold mb-2">GPT 입력값 (확인용)</h3>
        <div className="rounded-xl border bg-white p-3 space-y-3">
          {activeDoc ? (
            activeRisk ? (
              <>
                <div className="text-xs text-gray-500 mb-1">
                  파일 ID: {activeDoc.id} / {activeDoc.name}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* law_input 리스트 */}
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">
                      law_input
                    </div>
                    {lawInputs.length > 0 ? (
                      <div className="space-y-2">
                        {lawInputs.map((text, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg bg-gray-50 border px-3 py-2 text-xs text-gray-800 whitespace-pre-wrap"
                          >
                            <span className="font-semibold mr-1">
                              #{idx + 1}
                            </span>
                            {text}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-gray-50 border px-3 py-2 text-xs text-gray-500">
                        값이 없습니다.
                      </div>
                    )}
                  </div>

                  {/* case_input 리스트 */}
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">
                      case_input
                    </div>
                    {caseInputs.length > 0 ? (
                      <div className="space-y-2">
                        {caseInputs.map((text, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg bg-gray-50 border px-3 py-2 text-xs text-gray-800 whitespace-pre-wrap"
                          >
                            <span className="font-semibold mr-1">
                              #{idx + 1}
                            </span>
                            {text}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-gray-50 border px-3 py-2 text-xs text-gray-500">
                        값이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500">
                이 문서에 대한 GPT 분석 결과가 아직 없습니다.
              </div>
            )
          ) : (
            <div className="text-xs text-gray-500">
              상단 문서 리스트에서 문서를 먼저 선택해 주세요.
            </div>
          )}
        </div>
      </section>

      {/* AI 분석 요약 – SimulatePage와 동일한 레이아웃 */}
      <section className="w-full max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-bold mb-1 text-[#113F67]">
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
      <section className="w-full max-w-3xl mx-auto space-y-3">
        <h2 className="text-xl font-bold">관련 판례</h2>

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

        {cases && cases.length > 0 && <CaseAccordion cases={cases} />}
      </section>

      {/* 관련 법령 조항 */}
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
          <p className="text-sm text-gray-500">
            관련 법령을 불러오는 중입니다…
          </p>
        )}

        {!isLawLoading &&
          !lawErr &&
          laws &&
          laws.length === 0 &&
          !hasNoLawQuery && (
            <p className="text-sm text-gray-500">
              추천할 법령이 없습니다.
            </p>
          )}

        {!isLawLoading && !lawErr && laws && laws.length > 0 && (
          <LawAccordionSimple laws={laws} />
        )}
      </section>
    </div>
  );

  const onGenerateReport = async () => {
    await new Promise((r) => setTimeout(r, 600));
    alert("리포트가 생성되었습니다. (데모)");
  };

  return (
    <div className="min-h-dvh overflow-hidden bg-white">
      <main className="flex-1">
        <div className="w-full p-4 pb-24 overflow-hidden">
          <TwoPaneViewer left={left} rightHeader={rightHeader}>
            {LawArea}
          </TwoPaneViewer>
        </div>
      </main>

      <ReportButton onGenerate={onGenerateReport} />
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
          <div className="text-sm font-semibold text-gray-900">
            {item.name}
          </div>
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
            <p className="whitespace-pre-wrap text-xs text-gray-700">
              {item.summary}
            </p>
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
            {articles.length > 0
              ? `${articles.length}개 조항`
              : "조문 정보 없음"}
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
                  <div className="text-xs font-semibold text-gray-900">
                    {title}
                  </div>
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