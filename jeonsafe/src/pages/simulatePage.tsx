/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react";
import { useProgress } from "../stores/useProgress";
import type { LawWithArticles } from "../types/law";
import { useUploadStore } from "../stores/useUploadStore";
import { http } from "../lib/http";
import TwoPaneViewer from "../components/TwoPaneViewer";
import DocList from "../components/DocList";
import type { Doc } from "../types/doc";
import { resolveViewUrl } from "../lib/files";
import { pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import ReportButton from "../components/ReportButton";
import { useRiskStore } from "../stores/useRiskStore";
import {
  RelatedCasesSection,
  RelatedLawsSection,
} from "../components/RelatedSections";
import AISummarySection from "../components/AISummarySection";
import {
  analyzeFilesWithGpt,
  type AnalyzeItem,
  type RatingLabel,
} from "../lib/analyzeEvidence";
import ScenarioLoadingScreen from "../components/loading/ScenarioLoadingScreen";
import type { FileRecord } from "../types/file";
import type { ChatThread } from "../types/chat";
import { useNavigate } from "react-router-dom";
import { toKorRiskLabel } from "../lib/riskLabel";
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// 한글 폰트 등록 (public/fonts/Pretendard-Regular.ttf 기준)
Font.register({
  family: "Pretendard",
  src: "/fonts/Pretendard-Regular.ttf",
  fontWeight: "normal",
});

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

    (law.articles as any[]).push(article);
  });

  return Object.values(grouped);
}

//  리포트에 담을 데이터 구조 (mappingPage와 동일 형식)
type SimulateReportData = {
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

// PDF 스타일 정의
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

// 실제 PDF 문서 컴포넌트 (simulate용)
function SimulateReportDocument({ data }: { data: SimulateReportData }) {
  const { aiSummary, laws, cases } = data;

  return (
    <Document>
      <Page size="A4" style={reportStyles.page}>
        {/* 상단 제목/파일명 */}
        <View style={reportStyles.section}>
          <Text style={reportStyles.title}>사후처리 AI 분석 리포트</Text>
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

export default function SimulatePage() {
  const { setPos } = useProgress();
  const navigate = useNavigate();
  const uploaded = useUploadStore((s) => s.uploaded);
  const analysisById = useUploadStore((s) => s.analysisById);
  const setAnalysisByIdStore = useUploadStore((s) => s.setAnalysisById);

  const [laws, setLaws] = useState<LawWithArticles[] | null>(null);
  const [lawErr, setLawErr] = useState<string | null>(null);

  const [cases, setCases] = useState<CaseItem[] | null>(null);
  const [caseErr, setCaseErr] = useState<string | null>(null);

  // 🔹 분석 로딩 상태 (mappingPage와 동일 컨셉)
  const [analysisReady, setAnalysisReady] = useState(false);

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

  // 현재 활성 문서의 분석 결과 / rating / 이유 / 색상 계산
  const activeAnalysis: AnalyzeItem | undefined =
    activeDoc?.id != null
      ? (analysisById[String(activeDoc.id)] as AnalyzeItem | undefined)
      : undefined;

  const activeRating = activeAnalysis?.rating?.label as RatingLabel | undefined;
  const activeRatingKor = toKorRiskLabel(activeRating);

  const activeReasons = (activeAnalysis?.rating?.reasons ?? []) as string[];

  const reasonCardClass =
    activeRatingKor === "상"
      ? "border-rose-200 bg-rose-50/80"
      : activeRatingKor === "중"
      ? "border-amber-200 bg-amber-50/80"
      : activeRatingKor === "하"
      ? "border-emerald-200 bg-emerald-50/80"
      : "border-gray-200 bg-white";

  // 🔹 presigned view URL 로딩 (모든 파일 한 번에)
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
          if (file.id != null) {
            map[file.id] = url;
          }
        } catch (e) {
          console.error(
            "Failed to resolve view URL in SimulatePage:",
            file.id,
            e,
          );
        }
      }
      setSrcMap(map);
    })();
  }, [uploaded]);

  const riskItems = useRiskStore((s) => s.items);

  const activeRisk = useMemo(
    () =>
      activeDoc && activeDoc.id != null
        ? riskItems?.[activeDoc.id] ?? null
        : null,
    [activeDoc, riskItems],
  );

  // === GPT 분석 캐싱 (mappingPage와 동일한 패턴) ===
  useEffect(() => {
    if (!uploaded || uploaded.length === 0) {
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
        const aiItems = await analyzeFilesWithGpt(uploaded as any);
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
        console.error("analyze error (SimulatePage)", e);
      } finally {
        if (!cancelled) setAnalysisReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uploaded, analysisById, setAnalysisByIdStore]);

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

  // 리포트에 넣을 데이터 하나로 묶기 (mappingPage와 동일 로직)
  const reportData = useMemo<SimulateReportData | null>(() => {
    if (!activeDoc) return null;

    const baseName = activeDoc.name ?? "계약서.pdf";

    const analysis: AnalyzeItem | undefined = activeAnalysis;

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
        riskLabel: toKorRiskLabel(
          (analysis as any)?.risk_level || (activeRisk as any)?.risk_level,
        ),
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
          "AI 분석 결과를 기반으로 사후처리 전략을 검토해 보세요.",
      },
      laws: laws ?? [],
      cases: cases ?? [],
    };
  }, [activeDoc, activeRisk, activeAnalysis, laws, cases]);

  const left = (
    <DocList docs={docs} activeId={activeDocId} onSelect={setActiveDocId} />
  );
  const rightHeader = { title: "AI 분석 결과" };

  const isLawLoading = laws === null && !lawErr && !!lawQuery;
  const hasNoLawQuery = !lawQuery;

  // 🔹 전체 로딩 상태 (문서 + presigned URL + 분석)
  const hasUploaded = !!uploaded && uploaded.length > 0;
  const hasDocs = docs.length > 0;
  const hasSrcMap = Object.keys(srcMap).length > 0;
  const docsReady = hasUploaded && hasDocs && hasSrcMap;
  const isLoading = !docsReady || !analysisReady;

  if (isLoading) {
    return <ScenarioLoadingScreen />;
  }

  // ReportButton이 호출하는 PDF 생성 + 서버 저장 + POST_CASE 스레드 생성
  const onGenerateReport = async (title?: string) => {
    if (!reportData) {
      alert(
        "리포트에 포함할 데이터가 없습니다. 문서와 분석 내용을 먼저 확인해주세요.",
      );
      return;
    }

    try {
      // 1) PDF Blob 생성
      const blob = await pdf(
        <SimulateReportDocument data={reportData} />,
      ).toBlob();

      const baseName =
        reportData.fileName.replace(/\.[^/.]+$/, "") || "report";
      const safeTitle =
        (title?.trim().length ? title.trim() : "") || baseName;
      const downloadName = `${safeTitle}_리포트.pdf`;

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

        const fileRes = await http.post<FileRecord>("/be/api/files", form, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const savedFile = fileRes.data;

        // 4) 현재 로그인 유저 id 조회
        const me = await http.get<{ id: number; email: string }>(
          "/be/auth/me",
        );
        const userId = me.data.id;

        // 5) /be/chat/threads 에 POST_CASE 스레드 생성
        await http.post<ChatThread>("/be/chat/threads", {
          user_id: userId,
          channel: "POST_CASE",
          title: downloadName,
          report_file_id: savedFile.id,
        });

        // (원하면 여기서 toast 띄우거나, SideDrawer 리프레시 트리거해도 됨)
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

              {activeReasons.length > 0 && (
                <section className="w-full max-w-3xl mx-auto space-y-2 mb-6">
                  <h2
                    className={`text-xl font-bold mb-1 ml-3 ${
                      activeRatingKor === "상"
                        ? "text-rose-600"
                        : activeRatingKor === "중"
                        ? "text-yellow-500"
                        : activeRatingKor === "하"
                        ? "text-emerald-600"
                        : "text-[#113F67]"
                    }`}
                  >
                    위험도: {activeRatingKor ?? activeRating ?? "-"}
                  </h2>

                  <div
                    className={`rounded-xl border p-4 shadow-sm ${reasonCardClass}`}
                  >
                    <ul className="mt-1 space-y-2 text-[13px] leading-relaxed text-gray-800 list-none pl-0">
                      {activeReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}



              <RelatedLawsSection
                laws={laws}
                lawErr={lawErr}
                hasNoLawQuery={hasNoLawQuery}
                isLawLoading={isLawLoading}
              />

              <RelatedCasesSection cases={cases} caseErr={caseErr} />
            </div>
          </TwoPaneViewer>
        </div>
      </main>

      <ReportButton
        onGenerate={onGenerateReport}
        label="리포트 저장"
        disabled={docs.length === 0}
        onReset={handleGoRecords}
      />
    </div>
  );
}
