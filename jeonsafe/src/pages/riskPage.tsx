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
import PdfPageNavigator from "../components/viewers/PdfPageNavigator";
import DocViewerPanel from "../components/viewers/DocViewerPanel";
import AnalysisLoadingScreen from "../components/loading/AnalysisLoadingScreen";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function RiskPage() {
  const { setPos } = useProgress();
  const setRiskItem = useRiskStore((s) => s.setItem);
  useEffect(() => setPos("pre", 1), [setPos]);

  // UploadPage에서 넘어온 업로드 파일들
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
  const [analysisDone, setAnalysisDone] = useState(false); // 🔹 분석 작업 완료 여부

  // 1) uploaded → docs / srcMap 세팅
  useEffect(() => {
    (async () => {
      if (!uploaded || uploaded.length === 0) return;

      // 업로드 바뀔 때마다 분석 상태 초기화
      setAnalysisDone(false);

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

          map[r.id] = url;
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
    console.warn(" PDF Load Error:", err);
    if (!activeId) return;
    try {
      const fresh = await getDownloadUrl(activeId);
      setSrcMap((m) => ({ ...m, [activeId]: fresh }));
    } catch (e) {
      console.error(" Failed to refresh presigned URL", e);
    }
  };

  // 2) 모든 문서에 대해 GPT 한 번씩 호출 → store에 캐싱
  useEffect(() => {
    if (!uploaded || uploaded.length === 0) return;
    if (docs.length === 0) return;
    if (Object.keys(srcMap).length === 0) return;

    let cancelled = false;

    const run = async () => {
      const { getItem } = useRiskStore.getState();

      try {
        const targetDocs = docs; // 필요하면 docs.filter(d => d.type === "pdf") 로 좁힐 수 있음

        for (const d of targetDocs) {
          if (cancelled) break;

          const url = srcMap[d.id];
          if (!url) continue; // URL 없는 문서는 그냥 분석 안 함

          const existing = getItem(d.id);
          if (existing) continue; // 이미 캐싱된 문서는 건너뜀

          try {
            const item = await extractRisksForUrl(url);

            const finalItem: ExtractRisksItem = item ?? {
              fileurl: url,
              risky_sentences: [],
            };

            if (!cancelled) {
              setRiskItem(d.id, finalItem);
            }
          } catch (e) {
            console.error("extractRisksForUrl error for doc", d.id, e);
            if (!cancelled) {
              const fallback: ExtractRisksItem = {
                fileurl: url,
                risky_sentences: [],
              };
              setRiskItem(d.id, fallback);
            }
          }
        }
      } finally {
        if (!cancelled) {
          setAnalysisDone(true); // 🔹 루프가 어떻게 끝났든 "분석 단계는 끝남"
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [uploaded, docs, srcMap, setRiskItem]);

  // 3) 활성 문서 기준으로 캐시에서 risky_sentences 꺼내기
  useEffect(() => {
    if (activeId == null) {
      setRiskySentences([]);
      return;
    }

    const { getItem } = useRiskStore.getState();
    const cached = getItem(activeId);
    setRiskySentences(cached?.risky_sentences ?? []);
  }, [activeId,analysisDone]);

  // 4) 하이라이트 계산 (hook)
  const pdfHighlights = useMemo(
    () => makePdfHighlightsFromRiskySentences(riskySentences),
    [riskySentences],
  );

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

  const rightHeader = {
    title: activeDoc ? activeDoc.name : "문서 내용",
  };

  const rightFooter =
    activeDoc?.type === "pdf" ? (
      <PdfPageNavigator
        page={pageNumber}
        totalPages={numPages}
        suffix="페이지"
        onChange={(next) => setPageNumber(next)}
      />
    ) : null;

  // 5) 로딩 상태 계산: 업로드 + docs + srcMap + 분석 단계 완료 여부
  const hasUploaded = !!uploaded && uploaded.length > 0;
  const hasDocs = docs.length > 0;
  const hasSrcMap = Object.keys(srcMap).length > 0;
  const docsReady = hasUploaded && hasDocs && hasSrcMap;

  const isLoading = !docsReady || !analysisDone;

  if (isLoading) {
    return <AnalysisLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1">
        <div className="w-full p-4 pt-4 pb-24 overflow-hidden">
          <TwoPaneViewer
            left={left}
            rightHeader={rightHeader}
            rightFooter={rightFooter}
          >
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
          </TwoPaneViewer>
        </div>
      </main>

      <NextStepButton to="/pre/mapping" />
    </div>
  );
}