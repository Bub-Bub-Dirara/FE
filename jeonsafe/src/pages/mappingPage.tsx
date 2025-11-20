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

// PDF 뷰어 + presigned URL
import { getDownloadUrl, resolveViewUrl } from "../lib/files";
import { pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// 법령/판례 검색용 타입 & API
import type { LawWithArticles } from "../types/law";
import { http } from "../lib/http";
import { makePdfHighlightsFromExtractItem } from "../lib/pdfHighlights";
import DocViewerPanel from "../components/viewers/DocViewerPanel";
import {
  RelatedCasesSection,
  RelatedLawsSection,
} from "../components/RelatedSections";
import AISummarySection from "../components/AISummarySection";

import ScenarioLoadingScreen from "../components/loading/ScenarioLoadingScreen";
import { analyzeFilesWithGpt, type AnalyzeItem } from "../lib/analyzeEvidence";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

/** 좌측: 위험조항 리스트용 (일단 기존 mock 그대로 유지) */
type Risk = { id: string; title: string; preview: string };

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
    const lawName = item.law_name || "법령명 없음";

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
  const setAnalysisById = useUploadStore((s) => s.setAnalysisById);
  const [analysisReady, setAnalysisReady] = useState(false);
  const riskItems = useRiskStore((s) => s.items);

  // 업로드된 모든 파일에 대해 GPT 증거 분석(analyzeEvidence) 한 번씩 실행하여 캐싱
  useEffect(() => {
    if (!uploaded || uploaded.length === 0) {
      setAnalysisById({});
      setAnalysisReady(false);
      return;
    }

    const fileIds = uploaded.map((f) => String(f.id));
    const hasAll = fileIds.every((id) => !!analysisById[id]);

    // 이미 모든 파일 분석 결과가 있으면 추가 호출 없이 바로 ready
    if (hasAll) {
      setAnalysisReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const aiItems = await analyzeFilesWithGpt(uploaded as FileRecord[]);
        if (cancelled) return;

        const next: Record<string, AnalyzeItem> = { ...analysisById };

        uploaded.forEach((file, idx) => {
          const id = String(file.id);
          const ai = aiItems[idx];
          if (ai) {
            next[id] = ai;
          }
        });

        setAnalysisById(next);
      } catch (e) {
        console.error("analyzeFilesWithGpt error (MappingPage):", e);
      } finally {
        if (!cancelled) {
          setAnalysisReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uploaded, analysisById, setAnalysisById]);

  // 좌측: 위험조항(현재는 첫 항목 고정 사용)
  const [risks] = useState<Risk[]>([]);
  const active = risks[0];

  // 업로드 파일 → Doc 형태로 변환
  const docs: Doc[] = useMemo(
    () =>
      uploaded && uploaded.length > 0
        ? (uploaded as FileRecord[]).map((r, idx) => {
            const isPdf = r.content_type === "application/pdf";
            const isImg = r.content_type?.startsWith("image/");
            return {
              id: r.id ?? idx + 1,
              name: r.original_filename ?? `파일 ${idx + 1}`,
              type: isPdf ? "pdf" : isImg ? "image" : "other",
            } as Doc;
          })
        : [],
    [uploaded],
  );

  // 현재 선택된 문서 id
  const [activeDocId, setActiveDocId] = useState<number | null>(null);

  // 파일 id → presigned view URL
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
            console.error("invalid download-url response:", raw);
            continue;
          }

          if (r.id != null) map[r.id] = url;
        } catch (e) {
          console.error("Failed to resolve URL (MappingPage):", e);
        }
      }
      setSrcMap(map);
    })();
  }, [uploaded]);

  // 현재 문서
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

  // 현재 문서에 대한 GPT 위험 결과 (RiskPage에서 캐싱해둔 것)
  const activeRisk = activeDoc ? (riskItems as any)[activeDoc.id] : undefined;

  // law_input / case_input 배열 뽑기 (risky_sentences 전체에서)
  const lawInputs = useMemo(
    () =>
      activeRisk?.risky_sentences
        ?.map((s: any) => s.law_input?.trim())
        .filter((t: string | undefined): t is string => Boolean(t)) ?? [],
    [activeRisk],
  );
  const caseInputs = useMemo(
    () =>
      activeRisk?.risky_sentences
        ?.map((s: any) => s.case_input?.trim())
        .filter((t: string | undefined): t is string => Boolean(t)) ?? [],
    [activeRisk],
  );

  // PDF 하이라이트 정보
  const pdfHighlights = useMemo(
    () => makePdfHighlightsFromExtractItem(activeRisk),
    [activeRisk],
  );

  const [docPanelOpen, setDocPanelOpen] = useState(true);

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
        lawInputs.map((q: string) =>
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

      const mergedItems: LawApiItem[] = [];
      responses.forEach((res: LawsSearchResponse) => {
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
        caseInputs.map((q: string) =>
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
      responses.forEach((res: CasesSearchResponse, inputIdx: number) => {
        res.items.forEach((item: RawCaseApiItem, rankIdx: number) => {
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

  // 🔹 로딩 상태: 업로드/문서/URL 준비 + 전체 analyzeEvidence 완료까지
  const hasUploaded = !!uploaded && uploaded.length > 0;
  const hasDocs = docs.length > 0;
  const hasSrcMap = Object.keys(srcMap).length > 0;
  const docsReady = hasUploaded && hasDocs && hasSrcMap;

  const isLoading = !docsReady || !analysisReady;

  if (isLoading) {
    return <ScenarioLoadingScreen />;
  }

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

  // 리포트 생성은 일단 데모용 (원래 로직 유지)
  const onGenerateReport = async () => {
    await new Promise((r) => setTimeout(r, 600));
    alert("리포트가 생성되었습니다. (데모)");
  };

  return (
    <div className="min-h-dvh overflow-hidden bg-white">
      <main className="flex-1">
        <div className="w-full p-4 pb-24 overflow-hidden">
          <TwoPaneViewer left={left} rightHeader={rightHeader}>
            {/* 상단 AI 요약 (analysisById는 위에서 미리 캐싱해 둔 내용 사용) */}
            <AISummarySection activeDoc={activeDoc} analysisById={analysisById} />

            {/* 업로드 문서 뷰어 */}
            <h2 className="text-xl font-bold mb-1 text-[#113F67] ml-3">
              업로드 문서
            </h2>
            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white mb-6">
              <button
                type="button"
                onClick={() => setDocPanelOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {activeDoc?.name}
                  </div>
                </div>
                <span className="ml-4 text-[11px] text-gray-400">
                  {docPanelOpen ? "접기" : "자세히"}
                </span>
              </button>

              {docPanelOpen && (
                <div className="border-t border-gray-200">
                  <DocViewerPanel
                    activeDoc={activeDoc}
                    activeSrc={activeSrc}
                    pageNumber={pageNumber}
                    numPages={numPages}
                    onChangePage={setPageNumber}
                    onPdfLoad={setNumPages}
                    onPdfError={handlePdfLoadError}
                    highlights={pdfHighlights}
                  />
                </div>
              )}
            </div>

            {/* 관련 법령 */}
            <RelatedLawsSection
              laws={laws}
              lawErr={lawErr}
              hasNoLawQuery={hasNoLawQuery}
              isLawLoading={isLawLoading}
            />

            {/* 관련 판례 */}
            <RelatedCasesSection cases={cases} caseErr={caseErr} />
          </TwoPaneViewer>
        </div>
      </main>

      <ReportButton onGenerate={onGenerateReport} />
    </div>
  );
}
