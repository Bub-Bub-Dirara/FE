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

import type { LawWithArticles } from "../types/law";
import { http } from "../lib/http";
import {
  RelatedCasesSection,
  RelatedLawsSection,
} from "../components/RelatedSections";
import AISummarySection from "../components/AISummarySection";
import type { RiskySentence } from "../lib/extractRisks";
import { useNavigate } from "react-router-dom";

// GPT 분석 호출 유틸
import {
  analyzeFilesWithGpt,
  type AnalyzeItem,
} from "../lib/analyzeEvidence";
import {
  toKorRiskLabel,
  type KorRiskLabel,
} from "../lib/riskLabel";

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
import type { ChatThread } from "../types/chat";

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

  riskySentences: {
    sentence: string;
    reason: string;
    levelKor?: KorRiskLabel;
  }[];
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

        {/* 업로드 문서 (텍스트 정보만) */}
                {/* 업로드 문서 (텍스트 정보만) */}
        <View style={reportStyles.section}>
          <Text style={reportStyles.sectionTitle}>업로드 문서</Text>
          <Text>{uploadedDoc.fileName}</Text>
          {uploadedDoc.description && <Text>{uploadedDoc.description}</Text>}
        </View>
        
        {data.riskySentences && data.riskySentences.length > 0 && (
          <View style={reportStyles.section}>
            <Text style={reportStyles.sectionTitle}>위험 문장 목록</Text>

            {data.riskySentences.map((item, idx) => (
              <View key={idx} style={{ marginBottom: 6 }}>
                {/* 문장 + 위험도 */}
                <Text>
                  {item.levelKor ? `[${item.levelKor}] ` : ""}
                  {item.sentence}
                </Text>

                {/* 이유 */}
                {item.reason && (
                  <Text> - {item.reason}</Text>
                )}
              </View>
            ))}
          </View>
        )}

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
  const navigate = useNavigate();

  useEffect(() => {
    // 사전대비 3단계 위치 표시
    setPos("pre", 2);
  }, [setPos]);

  const uploaded = useUploadStore((s) => s.uploaded);
  const analysisById = useUploadStore((s) => s.analysisById);
  const setAnalysisByIdStore = useUploadStore((s) => s.setAnalysisById);
  const [analysisReady, setAnalysisReady] = useState(false);

  const riskItems = useRiskStore((s) => s.items);

  // GPT 분석 결과 준비 (스토어에서 재사용)
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

  // 현재 문서에 대한 위험 분석 결과 (2단계에서 저장된 것)
  const activeRisk =
    activeDoc && activeDoc.id != null ? riskItems?.[activeDoc.id] ?? null : null;

  const riskySentenceItems = useMemo<
    { sentence: string; reason: string; levelKor?: KorRiskLabel }[]
  >(() => {
    const sentences = (activeRisk?.risky_sentences as RiskySentence[]) ?? [];
    const result: { sentence: string; reason: string; levelKor?: KorRiskLabel }[] =
      [];

    for (const s of sentences) {
      const sentence =
        (s as any).sentence ??
        (s as any).highlight_text ??
        (s as any).text ??
        (s as any).summary ??
        (s as any).description ??
        "";

      const reason =
        (s as any).reason ??
        (s as any).summary ??
        (s as any).description ??
        "";

      const levelRaw =
        (s as any).level ??
        (s as any).risk_level ??
        (s as any).risk_label ??
        undefined;

      const levelKor = toKorRiskLabel(levelRaw) as KorRiskLabel | undefined;

      if (!sentence && !reason) continue;

      result.push({ sentence, reason, levelKor });
    }

    return result;
  }, [activeRisk]);

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

  // 리포트에 넣을 데이터 하나로 묶기

    // 리포트에 넣을 데이터 하나로 묶기
  const reportData = useMemo<MappingReportData | null>(() => {
    if (!activeDoc) return null;

    const baseName = activeDoc.name ?? "계약서.pdf";

    const analysis: AnalyzeItem | undefined =
      activeDoc.id != null
        ? (analysisById?.[String(activeDoc.id)] as AnalyzeItem | undefined)
        : undefined;

    // 🔹 3단계 화면에서 쓰는 위험 문장 목록을 그대로 사용
    const riskItemsForReport = riskySentenceItems ?? [];

    // 🔹 요약 bullets는 "이유 → 없으면 문장" 으로 구성
    const bullets =
      riskItemsForReport
        .map((s) => s.reason || s.sentence || "")
        .filter((t) => typeof t === "string" && t.trim().length > 0) ?? [];

    // 🔹 1순위: 분석 결과의 rating.label (M/G/B)
    //    2순위: risk_level / risk_label
    const rawFromAnalysis =
      (analysis as any)?.rating?.label ??
      (analysis as any)?.risk_level ??
      (activeRisk as any)?.risk_level ??
      (activeRisk as any)?.risk_label ??
      undefined;

    let docRiskLabel = toKorRiskLabel(rawFromAnalysis) as
      | KorRiskLabel
      | undefined;

    // 🔹 그래도 없으면, 문장들 중 "가장 높은 위험도"를 위험도로 사용
    if (!docRiskLabel && riskItemsForReport.length > 0) {
      const order: Record<KorRiskLabel, number> = { 하: 1, 중: 2, 상: 3 };
      docRiskLabel = riskItemsForReport.reduce<KorRiskLabel | undefined>(
        (acc, cur) => {
          if (!cur.levelKor) return acc;
          if (!acc) return cur.levelKor;
          return order[cur.levelKor] > order[acc] ? cur.levelKor : acc;
        },
        undefined,
      );
    }

  return {
    fileName: baseName,
    aiSummary: {
      // 🔹 여기서 docRiskLabel 사용
      riskLabel: docRiskLabel,
      fileDisplayName:
        (analysis as any)?.file_display_name ?? activeDoc.name ?? baseName,
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

    riskySentences: riskItemsForReport,
  };
}, [activeDoc, activeRisk, analysisById, laws, cases, riskySentenceItems]);


  const isLawLoading = laws === null && !lawErr && lawInputs.length > 0;
  const hasNoLawQuery = lawInputs.length === 0;

  // ReportButton이 호출하는 PDF 생성
  const onGenerateReport = async () => {
    if (!reportData) {
      alert(
        "리포트에 포함할 데이터가 없습니다. 문서와 분석 내용을 먼저 확인해주세요.",
      );
      return;
    }

    try {
      // 1) PDF blob 생성
      const blob = await pdf(
        <MappingReportDocument data={reportData} />,
      ).toBlob();

      const safeName =
        reportData.fileName.replace(/\.[^/.]+$/, "") || "report";
      const downloadName = `${safeName}_리포트.pdf`;

      // 2) 브라우저로 즉시 다운로드
      {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      // 3) /be/api/files 로 업로드해서 파일 레코드 생성
      try {
        const form = new FormData();
        form.append("file", blob, downloadName);
        form.append("category", "report");

        const fileRes = await http.post<FileRecord>(
          "/be/api/files",
          form,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        const savedFile = fileRes.data;

        // 4) 로그인 유저 id 조회
        const me = await http.get<{ id: number; email: string }>(
          "/be/auth/me",
        );
        const userId = me.data.id;

        // 5) /be/chat/threads 로 스레드 생성
        await http.post<ChatThread>("/be/chat/threads", {
          user_id: userId,
          channel: "PREVENTION",
          title: downloadName,
          report_file_id: savedFile.id,
        });
      } catch (e) {
        console.error("리포트 업로드 / 스레드 생성 실패", e);
        alert(
          "리포트를 서버에 저장하는 과정에서 오류가 발생했습니다. (다운로드는 정상 완료됨)",
        );
      }
    } catch (e) {
      console.error("PDF 생성 중 오류", e);
      alert("PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleGoRecords = () => {
    sessionStorage.setItem("openDrawerOnHome", "1");
    navigate("/");
  };

  const hasUploaded = !!uploaded && uploaded.length > 0;
  const hasDocs = docs.length > 0;
  const docsReady = hasUploaded && hasDocs;

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

              {/* 위험 문장 + 이유 리스트 (2단계 결과 기반) */}
              {riskySentenceItems.length > 0 && (
                <section className="w-full max-w-3xl mx-auto space-y-2 mb-6">
                  <h2 className="text-xl font-bold mb-1 ml-3 text-[#113F67]">
                    위험 문장 목록
                  </h2>

                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <ul className="mt-1 space-y-4 text-[13px] leading-relaxed text-gray-800 list-none pl-0">
                      {riskySentenceItems.map((item, idx) => {
                        return (
                          <li key={idx}>
                          {item.sentence && (
                            <p
                              className="font-semibold text-gray-900 text-[15px] px-1 py-0.5 rounded"
                              style={{
                                backgroundColor:
                                  item.levelKor === "상"
                                    ? "rgba(255, 0, 0, 0.15)"
                                  : item.levelKor === "중"
                                    ? "rgba(255, 165, 0, 0.15)"
                                  : item.levelKor === "하"
                                    ? "rgba(0, 200, 0, 0.15)"
                                  : "transparent",
                              }}
                            >
                              {item.sentence}
                            </p>
                          )}

                          {item.reason && (
                            <p className="mt-1 px-1 text-[13px] text-gray-700">
                              {item.reason}
                            </p>
                          )}
                        </li>
                        );
                      })}
                    </ul>
                  </div>
                </section>
              )}


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

      <ReportButton
        onGenerate={onGenerateReport}
        onReset={handleGoRecords}
        label="리포트 저장"
      />
    </div>
  );
}
