/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react";
import { useProgress } from "../stores/useProgress";
import type { LawWithArticles } from "../types/law";
import { useUploadStore } from "../stores/useUploadStore";
import { http } from "../lib/http";
import TwoPaneViewer from "../components/TwoPaneViewer";
import DocList from "../components/DocList";
import type { Doc } from "../types/doc";
import { resolveViewUrl, getDownloadUrl } from "../lib/files";
import { pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import ReportButton from "../components/ReportButton";
import { makePdfHighlightsFromExtractItem } from "../lib/pdfHighlights";
import { useRiskStore } from "../stores/useRiskStore";
import DocViewerPanel from "../components/viewers/DocViewerPanel";
import { RelatedCasesSection, RelatedLawsSection } from "../components/RelatedSections";
import AISummarySection from "../components/AISummarySection";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

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

export default function SimulatePage() {
  const { setPos } = useProgress();

  const uploaded = useUploadStore((s) => s.uploaded);
  const analysisById = useUploadStore((s) => s.analysisById);

  const [laws, setLaws] = useState<LawWithArticles[] | null>(null);
  const [lawErr, setLawErr] = useState<string | null>(null);

  const [cases, setCases] = useState<CaseItem[] | null>(null);
  const [caseErr, setCaseErr] = useState<string | null>(null);

  const onGenerateReport = async () => {
    await new Promise((r) => setTimeout(r, 600));
    alert("리포트가 생성되었습니다. (데모)");
  };

  // 좌측 DocList 데이터 (업로드된 파일 목록) + 타입 구분
  const docs: Doc[] = useMemo(
    () =>
      uploaded.length > 0
        ? uploaded.map((file, idx) => {
            const isPdf = file.content_type === "application/pdf";
            const isImg = file.content_type?.startsWith("image/");
            return {
              id: file.id ?? idx + 1,
              name: file.original_filename ?? `파일 ${idx + 1}`,
              type: isPdf ? "pdf" : isImg ? "image" : "other",
            } as Doc;
          })
        : [],
    [uploaded],
  );

  const [activeDocId, setActiveDocId] = useState<number>(() => docs[0]?.id ?? 0);

  // 🔹 파일 id -> presigned view URL
  const [srcMap, setSrcMap] = useState<Record<number, string>>({});

  // 🔹 PDF 페이지 상태
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);

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

  const activeDoc = docs.find((d) => d.id === activeDocId) ?? docs[0] ?? null;

  // 🔹 presigned view URL 로딩
  useEffect(() => {
    (async () => {
      if (!uploaded || uploaded.length === 0) return;

      const map: Record<number, string> = {};
      for (const file of uploaded) {
        try {
          const raw = (await resolveViewUrl(file)) as unknown;
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
          map[file.id] = url;
        } catch (e) {
          console.error("Failed to resolve view URL in SimulatePage:", file.id, e);
        }
      }
      setSrcMap(map);
    })();
  }, [uploaded]);

  // 🔹 현재 문서의 src
  const activeSrc =
    activeDoc && activeDoc.id != null ? srcMap[activeDoc.id] ?? null : null;

  const activeRisk = useRiskStore((s) =>
    activeDoc && activeDoc.id != null ? s.items?.[activeDoc.id] ?? null : null,
  );

  const pdfHighlights = useMemo(
    () => makePdfHighlightsFromExtractItem(activeRisk),
    [activeRisk],
  );

  const [docPanelOpen, setDocPanelOpen] = useState(true);
  // 🔹 PDF 로드 에러 시 presigned URL 재발급
  const handlePdfLoadError = async (err: unknown) => {
    console.warn("PDF Load Error (SimulatePage):", err);
    if (!activeDoc) return;
    try {
      const fresh = await getDownloadUrl(activeDoc.id);
      setSrcMap((m) => ({ ...m, [activeDoc.id]: fresh }));
    } catch (e) {
      console.error("Failed to refresh presigned URL in SimulatePage", e);
    }
  };

  // 문서가 바뀌면 페이지 1로
  useEffect(() => {
    setPageNumber(1);
  }, [activeDocId]);

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

  const left = (
    <DocList
      docs={docs}
      activeId={activeDocId}
      onSelect={setActiveDocId}
    />
  );
  const rightHeader = { title: "AI 분석 결과" };

  const isLawLoading = laws === null && !lawErr && !!lawQuery;
  const hasNoLawQuery = !lawQuery;

  return (
    <div className="min-h-dvh overflow-hidden bg-white">
      <main className="flex-1">
        <div className="w-full p-4 pb-24 overflow-hidden">
          <TwoPaneViewer left={left} rightHeader={rightHeader}>
            <div className="space-y-6">
              {/* AI 분석 요약 */}
              <AISummarySection activeDoc={activeDoc} analysisById={analysisById} />
              {/* 업로드 문서 미리보기 영역 (PDF/이미지 지원) */}
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
              <RelatedLawsSection
                laws={laws}
                lawErr={lawErr}
                hasNoLawQuery={hasNoLawQuery}
                isLawLoading={isLawLoading}
              />

              <RelatedCasesSection
                cases={cases}
                caseErr={caseErr}
              />
            </div>
          </TwoPaneViewer>
        </div>
      </main>
      <ReportButton onGenerate={onGenerateReport} />
    </div>
  );
}