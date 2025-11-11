import { useEffect, useMemo, useState } from "react";
import { useProgress } from "../stores/useProgress";
import TwoPaneViewer from "../components/TwoPaneViewer";
import DocList from "../components/DocList";
import NextStepButton from "../components/NextStepButton";
import PdfViewer from "../components/viewers/PdfViewer";
import ImageViewer from "../components/viewers/ImageViewer";
import type { Doc } from "../types/doc";
import type { FileRecord } from "../types/file";
import { useUploadStore } from "../stores/useUploadStore";
import { getDownloadUrl, resolveViewUrl } from "../lib/files";
import { pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const VIEW_W = 700;
const PAGE_WIDTH = VIEW_W - 16 * 2;

export default function RiskPage() {
  const { setPos } = useProgress();
  useEffect(() => setPos("pre", 1), [setPos]);

  // UploadPage에서 넘어온 업로드 파일들
  const uploaded = useUploadStore((s) => s.uploaded);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [srcMap, setSrcMap] = useState<Record<number, string>>({});
  const [activeId, setActiveId] = useState<number | null>(null);

  const activeDoc = useMemo(
    () => docs.find((d) => d.id === activeId) ?? null,
    [docs, activeId]
  );
  const activeSrc = activeId == null ? null : srcMap[activeId] ?? null;

  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);

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

      // presigned URL 요청
      const map: Record<number, string> = {};
      for (const r of uploaded) {
        try {
          // 항상 presigned GET URL 사용 (403 방지)
          map[r.id] = await resolveViewUrl(r);
        } catch (e) {
          console.error("❌ Failed to resolve URL:", r.id, e);
        }
      }
      setSrcMap(map);

      if (list.length > 0) {
        setActiveId(list[0].id);
        setPageNumber(1);
      }
    })();
  }, [uploaded]);

  // ─────────────────────────────────────────────
  // PDF 로드 에러 시 presigned URL 갱신 (만료 복구)
  // ─────────────────────────────────────────────
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
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
            pageNumber > 1 ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
          }`}
        >
          ‹
        </button>
        <span className="text-xs text-gray-700 tabular-nums">
          {pageNumber} / {numPages}페이지
        </span>
        <button
          onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          disabled={pageNumber >= numPages}
          className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
            pageNumber < numPages ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
          }`}
        >
          ›
        </button>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <main className="flex-1">
        <div className="w-full p-4 pt-4 pb-24 overflow-hidden">
          <TwoPaneViewer left={left} rightHeader={rightHeader} rightFooter={rightFooter}>
            {activeDoc && activeSrc ? (
              activeDoc.type === "pdf" ? (
                <PdfViewer
                src={activeSrc}
                page={pageNumber}
                width={PAGE_WIDTH}
                onLoad={(n) => setNumPages(n)}
                onError={handlePdfLoadError}
              />
              ) : activeDoc.type === "image" ? (
                <ImageViewer src={activeSrc} width={PAGE_WIDTH} alt={activeDoc.name} />
              ) : (
                <div className="text-sm text-gray-500">
                  미리보기를 지원하지 않는 형식입니다.
                </div>
              )
            ) : (
              <div className="text-sm text-gray-400">문서를 선택해 주세요.</div>
            )}
          </TwoPaneViewer>
        </div>
      </main>

      <NextStepButton to="/pre/mapping" />
    </div>
  );
}
