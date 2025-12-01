/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useProgress } from "../stores/useProgress";
import TwoPaneViewer from "../components/TwoPaneViewer";
import DocList from "../components/DocList";
import NextStepButton from "../components/NextStepButton";
import type { Doc } from "../types/doc";
import type { FileRecord } from "../types/file";
import { useUploadStore } from "../stores/useUploadStore";
import { getDownloadUrl, resolveViewUrl } from "../lib/files";
import { pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useRiskStore } from "../stores/useRiskStore";

import {
  extractRisksForUrl,
  type RiskySentence,
  type ExtractRisksItem,
} from "../lib/extractRisks";

import { makePdfHighlightsFromRiskySentences } from "../lib/pdfHighlights";
import DocViewerPanel from "../components/viewers/DocViewerPanel";
import AnalysisLoadingScreen from "../components/loading/AnalysisLoadingScreen";
import { toKorRiskLabel, type KorRiskLabel } from "../lib/riskLabel";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function RiskPage() {
  const { setPos } = useProgress();
  const setRiskItem = useRiskStore((s) => s.setItem);
  useEffect(() => setPos("pre", 1), [setPos]);

  const uploaded = useUploadStore((s) => s.uploaded);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [srcMap, setSrcMap] = useState<Record<number, string>>({});
  const [activeId, setActiveId] = useState<number | null>(null);

  const activeDoc = useMemo(
    () => docs.find((d) => d.id === activeId) ?? null,
    [docs, activeId],
  );
  const activeSrc = useMemo(
    () => (activeId == null ? null : srcMap[activeId] ?? null),
    [activeId, srcMap],
  );

  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [riskySentences, setRiskySentences] = useState<RiskySentence[]>([]);
  const [analysisDone, setAnalysisDone] = useState(false);

  // 선택한 위험문장
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);

  // 1) uploaded → docs / srcMap
  useEffect(() => {
    (async () => {
      if (!uploaded || uploaded.length === 0) return;

      setAnalysisDone(false);
      setSelectedRiskId(null);

      const toDoc = (r: FileRecord): Doc => {
        const isPdf = r.content_type === "application/pdf";
        const isImg = r.content_type?.startsWith("image/");
        return {
          id: r.id,
          name: r.original_filename,
          type: isPdf ? "pdf" : isImg ? "image" : "other",
        };
      };

      const list = uploaded.map(toDoc);
      setDocs(list);

      const map: Record<number, string> = {};
      for (const r of uploaded) {
        try {
          const raw = (await resolveViewUrl(r)) as any;
          map[r.id] = typeof raw === "string" ? raw : raw.url;
        } catch (e) {
          console.error("Failed to resolve URL:", r.id, e);
        }
      }
      setSrcMap(map);

      if (list.length > 0) {
        setActiveId(list[0].id);
        setPageNumber(1);
      }
    })();
  }, [uploaded]);

  const handlePdfLoadError = async (err: unknown) => {
    console.warn("PDF Load Error:", err);
    if (!activeId) return;
    try {
      const fresh = await getDownloadUrl(activeId);
      setSrcMap((m) => ({ ...m, [activeId]: fresh }));
    } catch (e) {
      console.error("Failed refresh URL", e);
    }
  };

  // 2) GPT 분석 캐싱
  useEffect(() => {
    if (!uploaded || uploaded.length === 0) return;
    if (docs.length === 0) return;
    if (Object.keys(srcMap).length === 0) return;

    let cancelled = false;

    const run = async () => {
      const { getItem } = useRiskStore.getState();

      try {
        for (const d of docs) {
          if (cancelled) break;

          const url = srcMap[d.id];
          if (!url) continue;

          const existing = getItem(d.id);
          if (existing) continue;

          try {
            const item = await extractRisksForUrl(url);
            const finalItem: ExtractRisksItem = item ?? {
              fileurl: url,
              risky_sentences: [],
            };
            if (!cancelled) setRiskItem(d.id, finalItem);
          } catch (e) {
            console.error("extractRisksForUrl error", e);
            if (!cancelled) {
              setRiskItem(d.id, { fileurl: url, risky_sentences: [] });
            }
          }
        }
      } finally {
        if (!cancelled) {
          setAnalysisDone(true);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [uploaded, docs, srcMap, setRiskItem]);

  // 3) risky_sentences 세팅
  useEffect(() => {
    if (activeId == null) {
      setRiskySentences([]);
      return;
    }

    const { getItem } = useRiskStore.getState();
    const cached = getItem(activeId);

    setSelectedRiskId(null);
    setRiskySentences(cached?.risky_sentences ?? []);
  }, [activeId, analysisDone]);

  // 4) PDF 하이라이트
  const pdfHighlights = useMemo(
    () => makePdfHighlightsFromRiskySentences(riskySentences),
    [riskySentences],
  );

  // 5) 위험문장 리스트
  const riskList = useMemo(() => {
    return (riskySentences ?? []).map((s, idx) => {
      const sentence =
        (s as any).sentence ??
        (s as any).highlight_text ??
        (s as any).text ??
        (s as any).summary ??
        (s as any).description ??
        "";

      const levelRaw =
        (s as any).level ??
        (s as any).risk_level ??
        (s as any).risk_label ??
        undefined;

      const levelKor = toKorRiskLabel(levelRaw) as KorRiskLabel | undefined;

      const firstPos = (s as any).positions?.[0];
      const page = firstPos?.page ?? 1;

      return {
        id: `risk-${idx}`,
        sentence,
        levelKor,
        page,
      };
    });
  }, [riskySentences]);

  // 선택 모드 / 전체 모드
  const visibleRisks = useMemo(() => {
    if (!selectedRiskId) return riskList;
    return riskList.filter((r) => r.id === selectedRiskId);
  }, [riskList, selectedRiskId]);

  // 준비 체크
  const ready =
    uploaded.length > 0 &&
    docs.length > 0 &&
    Object.keys(srcMap).length > 0 &&
    analysisDone;

  if (!ready) return <AnalysisLoadingScreen />;

  // 좌측 문서 리스트
  const left = (
    <DocList
      docs={docs}
      activeId={activeId ?? -1}
      onSelect={(id) => {
        setActiveId(id);
        setPageNumber(1);
      }}
    />
  );

  const rightHeader = { title: "위험 조항 분석" };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1">
        <div className="w-full p-4 pb-24 overflow-hidden">
          <TwoPaneViewer left={left} rightHeader={rightHeader}>
            <div className="space-y-2">

              {/* 위험 문장 목록 or 선택된 문장 */}
              {riskList.length > 0 && (
                <section className="w-full max-w-3xl mx-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#113F67]">
                      위험 문장 목록
                    </h2>

                    {selectedRiskId && (
                      <button
                        onClick={() => setSelectedRiskId(null)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
                      >
                        전체보기
                      </button>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {visibleRisks.map((item) => {
                      const toneClass =
                        item.levelKor === "상"
                          ? "bg-rose-100 text-rose-700"
                          : item.levelKor === "중"
                          ? "bg-amber-100 text-amber-700"
                          : item.levelKor === "하"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-700";

                      return (
                        <li
                          key={item.id}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedRiskId(item.id);
                            setPageNumber(item.page);
                          }}
                        >
                          <p
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${toneClass}`}
                          >
                            {item.sentence}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* 선택된 문장 아래 PDF */}
              <DocViewerPanel
                variant="risk"
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
          </TwoPaneViewer>
        </div>
      </main>

      <NextStepButton to="/pre/mapping" />
    </div>
  );
}
