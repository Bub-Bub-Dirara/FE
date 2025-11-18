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
} from "../lib/extractRisks";
import { makePdfHighlightsFromRiskySentences } from "../lib/pdfHighlights";
import PdfPageNavigator from "../components/viewers/PdfPageNavigator";
import DocViewerPanel from "../components/viewers/DocViewerPanel";

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

  useEffect(() => {
    (async () => {
      if (!uploaded || uploaded.length === 0) return;

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

  // 활성화된 pdf 따라 GPT API 호출
  useEffect(() => {
    if (!activeSrc || activeDoc?.type !== "pdf") {
      setRiskySentences([]);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const item = await extractRisksForUrl(activeSrc);
        if (!cancelled) {
          setRiskySentences(item?.risky_sentences ?? []);
          if (item && activeId != null) {
            setRiskItem(activeId, item);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error("extractRisksForUrl error", e);
          setRiskySentences([]);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [activeSrc, activeDoc?.type, activeId, setRiskItem]);

  // PdfViewer에 넘겨 줄 좌표 기반 하이라이트 정보
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