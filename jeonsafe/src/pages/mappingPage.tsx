/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useProgress } from "../stores/useProgress";
import TwoPaneViewer from "../components/TwoPaneViewer";
import ReportButton from "../components/ReportButton";
import DocList from "../components/DocList";
import type { Doc } from "../types/doc";
import type { FileRecord } from "../types/file";

import { useUploadStore } from "../stores/useUploadStore";
import { useRiskStore } from "../stores/useRiskStore";

import { getDownloadUrl, resolveViewUrl } from "../lib/files";

import type { LawWithArticles } from "../types/law";
import { http } from "../lib/http";
import { makePdfHighlightsFromExtractItem } from "../lib/pdfHighlights";
import DocViewerPanel from "../components/viewers/DocViewerPanel";
import {
  RelatedCasesSection,
  RelatedLawsSection,
} from "../components/RelatedSections";
import AISummarySection from "../components/AISummarySection";
import type { RiskySentence } from "../lib/extractRisks";

// GPT 분석 호출 유틸 (GET /be/api/files/{id}/download-url → POST /ai/gpt/analyze)
import {
  analyzeFilesWithGpt,
  type AnalyzeItem,
} from "../lib/analyzeEvidence";

// PDF 생성을 위한 라이브러리 (@react-pdf/renderer)
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

import ScenarioLoadingScreen from "../components/loading/ScenarioLoadingScreen";

// 한글 폰트 등록 (public/fonts/Pretendard-Regular.ttf 기준)
Font.register({
  family: "Pretendard",
  src: "/fonts/Pretendard-Regular.ttf",
  fontWeight: "normal",
});

type LawApiItem = {
  law_name: string;
  article_no: string;
  snippet: string;
  article_id: number;
  score: number;
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

// /ai/laws/search 응답 → LawWithArticles[]
function toLawWithArticles(data: LawsSearchResponse): LawWithArticles[] {
  const grouped: Record<string, LawWithArticles> = {};

  data.items.forEach((item, idx) => {
    const lawName = item.law_name || "법령명 없음";

    if (!grouped[lawName]) {
      grouped[lawName] = {
        lawId: lawName,
        lawName,
        articles: [],
      } as any;
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

    law.articles.push(article);
  });

  return Object.values(grouped);
}

type MappingReportData = {
  fileName: string;
  aiSummary: {
    riskLabel?: string;
    fileDisplayName?: string;
    lawAnalysis?: string;
    caseAnalysis?: string;
    bullets: string[];
  };
  uploadedDoc: {
    fileName: string;
    description?: string;
  };
  laws: LawWithArticles[];
  cases: CaseItem[];
};

// PDF 스타일 정의 (기본 폰트 Pretendard)
const reportStyles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 11,
    lineHeight: 1.4,
    fontFamily: "Pretendard",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    fontWeight: "bold",
    marginRight: 4,
  },
  bulletList: {
    marginTop: 4,
    marginLeft: 10,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bulletDot: {
    width: 8,
  },
  bulletText: {
    flex: 1,
  },
  lawGroup: {
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
  },
  lawGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  lawGroupTitle: {
    fontWeight: "bold",
  },
  article: {
    marginLeft: 8,
    marginTop: 2,
  },
  articleTitle: {
    fontWeight: "bold",
  },
  caseItem: {
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
  },
  caseTitle: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  caseMeta: {
    fontSize: 10,
    marginBottom: 2,
  },
});

// 실제 PDF 문서 컴포넌트
function MappingReportDocument({ data }: { data: MappingReportData }) {
  const { aiSummary, uploadedDoc, laws, cases } = data;

  return (
    <Document>
      <Page size="A4" style={reportStyles.page}>
        {/* 상단 제목/파일명 */}
        <View style={reportStyles.section}>
          <Text style={reportStyles.title}>법령·판례 조합 매핑 리포트</Text>
          <Text>파일명: {data.fileName}</Text>
        </View>

        {/* AI 분석 요약 */}
        <View style={reportStyles.section}>
          <Text style={reportStyles.sectionTitle}>AI 분석 요약</Text>

          {aiSummary.fileDisplayName && (
            <Text>· {aiSummary.fileDisplayName}</Text>
          )}

          <View style={reportStyles.labelRow}>
            <Text style={reportStyles.label}>위험도:</Text>
            <Text>{aiSummary.riskLabel ?? "-"}</Text>
          </View>

          {aiSummary.lawAnalysis && (
            <View style={{ marginBottom: 2 }}>
              <Text style={reportStyles.label}>법령 관점 분석:</Text>
              <Text>{aiSummary.lawAnalysis}</Text>
            </View>
          )}

          {aiSummary.caseAnalysis && (
            <View>
              <Text style={reportStyles.label}>판례 관점 분석:</Text>
              <Text>{aiSummary.caseAnalysis}</Text>
            </View>
          )}

          {aiSummary.bullets.length > 0 && (
            <View style={reportStyles.bulletList}>
              {aiSummary.bullets.map((b, idx) => (
                <View key={idx} style={reportStyles.bulletItem}>
                  <Text style={reportStyles.bulletDot}>•</Text>
                  <Text style={reportStyles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 업로드 문서 */}
        <View style={reportStyles.section}>
          <Text style={reportStyles.sectionTitle}>업로드 문서</Text>
          <Text>{uploadedDoc.fileName}</Text>
          {uploadedDoc.description && <Text>{uploadedDoc.description}</Text>}
        </View>

        {/* 관련 법령 조항 */}
        <View style={reportStyles.section}>
          <Text style={reportStyles.sectionTitle}>관련 법령 조항</Text>
          {(!laws || laws.length === 0) && (
            <Text>연동된 법령이 없습니다.</Text>
          )}
          {laws?.map((law) => (
            <View key={law.lawId} style={reportStyles.lawGroup}>
              <View style={reportStyles.lawGroupHeader}>
                <Text style={reportStyles.lawGroupTitle}>{law.lawName}</Text>
                {law.articles?.length ? (
                  <Text>{law.articles.length}개 조항</Text>
                ) : null}
              </View>
              {law.articles?.map((a: any) => (
                <View
                  key={a.key ?? `${a.title}-${a.number}`}
                  style={reportStyles.article}
                >
                  <Text style={reportStyles.articleTitle}>{a.title}</Text>
                  {a.text && <Text>{a.text}</Text>}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* 관련 판례 */}
        <View style={reportStyles.section}>
          <Text style={reportStyles.sectionTitle}>관련 판례</Text>
          {(!cases || cases.length === 0) && (
            <Text>연동된 판례가 없습니다.</Text>
          )}
          {cases?.map((c) => (
            <View key={c.id} style={reportStyles.caseItem}>
              <Text style={reportStyles.caseTitle}>{c.name}</Text>
              {(c.court || c.date) && (
                <Text style={reportStyles.caseMeta}>
                  {c.court ?? ""} {c.date ? `· ${c.date}` : ""}
                </Text>
              )}
              {c.summary && <Text>{c.summary}</Text>}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default function MappingPage() {
  const { setPos } = useProgress();
  useEffect(() => {
    // 사전대비 3단계 위치 표시
    setPos("pre", 2);
  }, [setPos]);

  const uploaded = useUploadStore((s) => s.uploaded);
  const analysisById = useUploadStore((s) => s.analysisById);
  const setAnalysisByIdStore = useUploadStore((s) => s.setAnalysisById);
  const [analysisReady, setAnalysisReady] = useState(false);

  const riskItems = useRiskStore((s) => s.items);

  useEffect(() => {
    if (!uploaded || uploaded.length === 0) {
      setAnalysisByIdStore({});
      setAnalysisReady(false);
      return;
    }

    const fileIds = uploaded.map((f) => String(f.id));
    const hasAllFromStore = fileIds.every((id) => !!analysisById[id]);

    if (hasAllFromStore) {
      setAnalysisReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const aiItems = await analyzeFilesWithGpt(uploaded as FileRecord[]);
        if (cancelled) return;

        // 기존 분석 결과와 병합
        const nextAnalysis: Record<string, AnalyzeItem> = {
          ...analysisById,
        };
        uploaded.forEach((file, idx) => {
          const id = String(file.id);
          const ai = aiItems[idx];
          if (ai) nextAnalysis[id] = ai;
        });

        setAnalysisByIdStore(nextAnalysis);
      } catch (e) {
        console.error("analyze error (MappingPage)", e);
      } finally {
        if (!cancelled) {
          setAnalysisReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uploaded, analysisById, setAnalysisByIdStore]);
  // -------------------------------------------------------------------

  // 좌측 DocList용 문서 목록
  const docs: Doc[] = useMemo(
    () =>
      uploaded.length > 0
        ? (uploaded as FileRecord[]).map((file, idx) => {
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

  // 선택된 문서 id
  const [activeDocId, setActiveDocId] = useState<number>(() => docs[0]?.id ?? 0);

  // 파일 id → presigned view URL
  const [srcMap, setSrcMap] = useState<Record<number, string>>({});

  // PDF 페이지 상태
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);

  // 좌측 패널 (업로드 문서 리스트)
  const left =
    docs.length > 0 ? (
      <DocList docs={docs} activeId={activeDocId} onSelect={setActiveDocId} />
    ) : (
      <div className="text-sm text-gray-400 px-2 py-4">
        업로드된 문서가 없습니다.
      </div>
    );

  const rightHeader = { title: "위험조항 매핑" };

  const activeDoc: Doc | null =
    docs.find((d) => d.id === activeDocId) ?? docs[0] ?? null;

  // presigned view URL 미리 받아두기
  useEffect(() => {
    (async () => {
      if (!uploaded || uploaded.length === 0) return;

      const map: Record<number, string> = {};
      for (const file of uploaded as FileRecord[]) {
        try {
          const url = await resolveViewUrl(file);
          if (file.id != null) {
            map[file.id] = url;
          }
        } catch (e) {
          console.error("Failed to resolve view URL in MappingPage:", e);
        }
      }
      setSrcMap(map);
    })();
  }, [uploaded]);

  const activeSrc = useMemo(() => {
    if (!activeDoc || activeDoc.id == null) return null;
    return srcMap[activeDoc.id] ?? null;
  }, [activeDoc, srcMap]);

  // 현재 문서에 대한 위험 분석 결과
  const activeRisk =
    activeDoc && activeDoc.id != null ? riskItems?.[activeDoc.id] ?? null : null;

  // law_input / case_input 배열 추출 (risky_sentences 기준)
  const lawInputs = useMemo(
    () =>
      (activeRisk?.risky_sentences as RiskySentence[] | undefined)
        ?.map((s) => s.law_input?.trim())
        .filter((t): t is string => Boolean(t)) ?? [],
    [activeRisk],
  );

  const caseInputs = useMemo(
    () =>
      (activeRisk?.risky_sentences as RiskySentence[] | undefined)
        ?.map((s) => s.case_input?.trim())
        .filter((t): t is string => Boolean(t)) ?? [],
    [activeRisk],
  );

  // PDF 하이라이트 정보
  const pdfHighlights = useMemo(
    () => makePdfHighlightsFromExtractItem(activeRisk),
    [activeRisk],
  );

  const [docPanelOpen, setDocPanelOpen] = useState(true);

  const handlePdfLoadError = async (err: unknown) => {
    console.warn("PDF Load Error (mapping):", err);
    if (!activeDoc || activeDoc.id == null) return;
    try {
      const fresh = await getDownloadUrl(activeDoc.id);
      setSrcMap((m) => ({ ...m, [activeDoc.id as number]: fresh }));
    } catch (e) {
      console.error("Failed to refresh presigned URL (mapping)", e);
    }
  };

  // 관련 법령 / 판례 상태
  const [laws, setLaws] = useState<LawWithArticles[] | null>(null);
  const [lawErr, setLawErr] = useState<string | null>(null);

  const [cases, setCases] = useState<CaseItem[] | null>(null);
  const [caseErr, setCaseErr] = useState<string | null>(null);

  // 관련 법령 검색: law_input 개수만큼 호출해서 합치기
  useEffect(() => {
    if (!lawInputs || lawInputs.length === 0) {
      setLaws([]);
      setLawErr(null);
      return;
    }

    (async () => {
      try {
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
              .then((res: { data: LawsSearchResponse }) => res.data),
          ),
        );

        const mergedItems: LawApiItem[] = [];
        responses.forEach((res) => {
          if (Array.isArray(res.items)) mergedItems.push(...res.items);
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
        setLawErr(e instanceof Error ? e.message : String(e));
        setLaws([]);
      }
    })();
  }, [lawInputs]);

  // 관련 판례 검색: case_input 개수만큼 호출해서 합치기
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
              .then((res: { data: CasesSearchResponse }) => res.data),
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
        setCaseErr(e instanceof Error ? e.message : String(e));
        setCases([]);
      }
    })();
  }, [caseInputs]);

  //  리포트에 넣을 데이터 하나로 묶기
  const reportData = useMemo<MappingReportData | null>(() => {
    if (!activeDoc) return null;

    const baseName = activeDoc.name ?? "계약서.pdf";

    const analysis: AnalyzeItem | undefined =
      activeDoc.id != null
        ? (analysisById?.[String(activeDoc.id)] as AnalyzeItem | undefined)
        : undefined;

    const riskySentences: any[] =
      ((activeRisk as any)?.risky_sentences as any[]) ?? [];

    const bullets =
      riskySentences
        .map(
          (s) =>
            s.summary ??
            s.description ??
            s.reason ??
            s.text ??
            s.highlight_text ??
            "",
        )
        .filter(
          (t: string) => typeof t === "string" && t.trim().length > 0,
        ) ?? [];

    return {
      fileName: baseName,
      aiSummary: {
        riskLabel:
          (analysis as any)?.risk_level || (activeRisk as any)?.risk_level,
        fileDisplayName:
          (analysis as any)?.file_display_name ??
          activeDoc.name ??
          baseName,
        lawAnalysis:
          (analysis as any)?.law_view ??
          (analysis as any)?.law_analysis ??
          (activeRisk as any)?.law_view,
        caseAnalysis:
          (analysis as any)?.case_view ??
          (analysis as any)?.case_analysis ??
          (activeRisk as any)?.case_view,
        bullets,
      },
      uploadedDoc: {
        fileName: baseName,
        description:
          "업로드한 계약서를 확인하고 위험 조항과 매핑해 보세요.",
      },
      laws: laws ?? [],
      cases: cases ?? [],
    };
  }, [activeDoc, activeRisk, analysisById, laws, cases]);

  const isLawLoading = laws === null && !lawErr && lawInputs.length > 0;
  const hasNoLawQuery = lawInputs.length === 0;

  //  ReportButton이 호출하는 PDF 생성
  const onGenerateReport = async () => {
    if (!reportData) {
      alert(
        "리포트에 포함할 데이터가 없습니다. 문서와 분석 내용을 먼저 확인해주세요.",
      );
      return;
    }

    try {
      const blob = await pdf(
        <MappingReportDocument data={reportData} />,
      ).toBlob();

      const safeName =
        reportData.fileName.replace(/\.[^/.]+$/, "") || "report";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}_리포트.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF 생성 중 오류", e);
      alert("PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  // 🔹 로딩 상태 계산: 문서/URL 준비 + 전체 analyzeEvidence 완료까지
  const hasUploaded = !!uploaded && uploaded.length > 0;
  const hasDocs = docs.length > 0;
  const hasSrcMap = Object.keys(srcMap).length > 0;
  const docsReady = hasUploaded && hasDocs && hasSrcMap;

  const isLoading = !docsReady || !analysisReady;

  if (isLoading) {
    return <ScenarioLoadingScreen />;
  }

  return (
    <div className="min-h-dvh overflow-hidden bg-white">
      <main className="flex-1">
        <div className="w-full p-4 pb-24 overflow-hidden">
          <TwoPaneViewer left={left} rightHeader={rightHeader}>
            <div className="space-y-6">
              {/* AI 분석 요약 */}
              <AISummarySection
                activeDoc={activeDoc}
                analysisById={analysisById}
              />

              {/* 업로드 문서 미리보기 */}
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
                      {activeDoc?.name ?? "문서를 선택하세요"}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      업로드한 계약서를 확인하고 위험 조항과 매핑해 보세요.
                    </p>
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

              {/* 관련 법령 조항 */}
              <RelatedLawsSection
                laws={laws}
                lawErr={lawErr}
                hasNoLawQuery={hasNoLawQuery}
                isLawLoading={isLawLoading}
              />

              {/* 관련 판례 조항 */}
              <RelatedCasesSection cases={cases} caseErr={caseErr} />
            </div>
          </TwoPaneViewer>
        </div>
      </main>

      <ReportButton onGenerate={onGenerateReport} />
    </div>
  );
}
