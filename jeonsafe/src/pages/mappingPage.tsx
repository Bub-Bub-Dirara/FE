// src/pages/MappingPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
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

/** 우측 하단: mappingbox 디자인(행을 클릭하면 같은 위치에 펼침 패널) */
type LawItem = { id: string; title: string; body: string };
const MOCK_ITEMS: LawItem[] = [
  {
    id: "제17091호",
    title: "부동산 실권리자명의 등기에 대한 법률",
    body: `<p class='text-sm'>샘플 1 전문…</p>`,
  },
  {
    id: "제17091호",
    title: "부동산 실권리자명의 등기에 대한 법률",
    body: `<p class='text-sm'>샘플 2 전문…</p>`,
  },
  {
    id: "제17091호",
    title: "부동산 실권리자명의 등기에 대한 법률",
    body: `<p class='text-sm'>샘플 3 전문…</p>`,
  },
  {
    id: "제17091호",
    title: "부동산 실권리자명의 등기에 대한 법률",
    body: `<p class='text-sm'>샘플 4 전문…</p>`,
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

/** mappingbox 스타일: 관련 법령 조항 리스트 */
function RelatedLawSection({ items }: { items: LawItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const FOUR_ROW_H = 48 * 4 + 12 * 3 + 16;
  const containerClass =
    items.length >= 4
      ? `max-h-[${FOUR_ROW_H}px] overflow-y-auto`
      : `h-[${FOUR_ROW_H}px] overflow-hidden`;
  const fillerCount = Math.max(0, 4 - items.length);

  const openAt = (idx: number) => {
    const w = wrapperRef.current?.getBoundingClientRect();
    const r = rowRefs.current[idx]?.getBoundingClientRect();
    if (!w || !r) return;
    setPanelPos({
      top: r.top - w.top + 1,
      left: r.left - w.left,
      width: r.width,
    });
    setOpenIndex(idx);
  };

  const handleToggle = (idx: number) => {
    if (openIndex === idx) {
      setOpenIndex(null);
      setPanelPos(null);
    } else {
      openAt(idx);
    }
  };

  useEffect(() => {
    if (openIndex === null) return;
    const wrap = wrapperRef.current!;
    const row = rowRefs.current[openIndex]!;
    const recalc = () => {
      const w = wrap.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      setPanelPos({
        top: r.top - w.top + 1,
        left: r.left - w.left,
        width: r.width,
      });
    };
    recalc();
    const on = () => recalc();
    window.addEventListener("resize", on);
    wrap.addEventListener("scroll", on);
    return () => {
      window.removeEventListener("resize", on);
      wrap.removeEventListener("scroll", on);
    };
  }, [openIndex]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h3 className="text-base font-semibold mb-3">관련 법령 조항</h3>
      <div
        ref={wrapperRef}
        className="relative rounded-xl border-2 bg-white p-2 shadow-sm"
        style={{ borderColor: "rgba(17,63,103,1)" }}
      >
        <div className={`relative space-y-3 ${containerClass}`}>
          {items.map((it, idx) => (
            <div
              key={idx}
              ref={(el) => {
                rowRefs.current[idx] = el;
              }}
              className="rounded-xl bg-gray-50"
            >
              <button
                onClick={() => handleToggle(idx)}
                aria-expanded={openIndex === idx}
                className="w-full flex items-center gap-4 px-4 py-3 text-left rounded-xl hover:bg-gray-100"
              >
                <span className="shrink-0 text-base sm:text-lg font-extrabold text-gray-800 leading-none">
                  {it.id}
                </span>
                <span className="flex-1 truncate text-sm sm:text-base text-gray-700 leading-none">
                  {it.title}
                </span>
                <svg
                  className={`h-5 w-5 transition-transform ${
                    openIndex === idx ? "rotate-180" : "rotate-0"
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          ))}
          {Array.from({ length: fillerCount }).map((_, i) => (
            <div key={`filler-${i}`} className="h-12 rounded-lg bg-gray-50" />
          ))}
        </div>

        {openIndex !== null && panelPos && (
          <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            style={{
              position: "absolute",
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
            }}
            className="z-20 rounded-xl bg-white shadow-2xl outline-none"
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b bg-gray-50"
              style={{ borderColor: "rgba(17,63,103,0.25)" }}
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-base sm:text-lg font-extrabold text-gray-800 leading-none">
                  {items[openIndex].id}
                </span>
                <span className="flex-1 truncate text-sm sm:text-base text-gray-700 leading-none">
                  {items[openIndex].title}
                </span>
              </div>
              <button
                onClick={() => {
                  setOpenIndex(null);
                  setPanelPos(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="닫기"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
            </div>
            <div className="px-4 py-4 max-h-[56vh] overflow-auto">
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: items[openIndex].body }}
              />
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button
                onClick={() => {
                  setOpenIndex(null);
                  setPanelPos(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-medium shadow hover:shadow-md active:scale-[0.99]"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MappingPage() {
  const { setPos } = useProgress();
  useEffect(() => {
    setPos("pre", 2);
  }, [setPos]);

  // 업로드 파일 & GPT 위험결과 가져오기
  const uploaded = useUploadStore((s) => s.uploaded);
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

  // law_input / case_input !배열! 뽑기 (risky_sentences 전체에서)
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
                  onClick={() =>
                    setPageNumber((p) => Math.max(1, p - 1))
                  }
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
                    setPageNumber((p) =>
                      Math.min(numPages, p + 1),
                    )
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
              <div className="py-10 text-sm text-gray-400">
                미리보기를 불러오는 중이거나 선택된 문서가 없습니다.
              </div>
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

      {/* mappingbox 스타일 – 현재는 MOCK_ITEMS 그대로 두고 UI만 확인 */}
      <RelatedLawSection items={MOCK_ITEMS} />
      <RelatedLawSection items={MOCK_ITEMS} />
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