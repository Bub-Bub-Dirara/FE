import { useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

type Highlight = {
  sentence: string;
  color: string;
  reason: string;
  index: number;
};

type Props = {
  src: string | File | Blob;
  page: number;
  width: number;
  onLoad: (numPages: number) => void;
  onError?: (err: unknown) => void;
  highlights?: Highlight[];
};

type TextItem = {
  str: string;
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const normalize = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, "")
    .replace(/[•·∙‧ㆍ.,;:!?()'’"「」[\]]/g, "");

export default function PdfViewer({
  src,
  page,
  width,
  onLoad,
  onError,
  highlights,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const customTextRenderer = (item: TextItem): string => {
    const str = item.str;
    const trimmed = str.trim();

    if (!trimmed || !highlights || highlights.length === 0) {
      return escapeHtml(str);
    }

    const chunkNorm = normalize(trimmed);
    if (!chunkNorm) {
      return escapeHtml(str);
    }

    const matched = highlights.find((h) => {
      const sentNorm = normalize(h.sentence);
      return sentNorm === chunkNorm;
    });

    if (!matched) {
      return escapeHtml(str);
    }

    const idx = matched.index;
    const bg = matched.color;

    return `<span data-risk-idx="${idx}" style="background-color:${bg};cursor:pointer;">${escapeHtml(
      str,
    )}</span>`;
  };

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const handler = (ev: Event) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;

      const el = target.closest<HTMLElement>("[data-risk-idx]");
      if (!el) return;

      const idxStr = el.dataset.riskIdx;
      if (!idxStr) return;

      const idx = Number(idxStr);
      if (!Number.isFinite(idx)) return;

      setActiveIdx((prev) => (prev === idx ? null : idx));
    };

    root.addEventListener("click", handler);
    return () => root.removeEventListener("click", handler);
  }, []);

  const activeHighlight =
    activeIdx != null && highlights
      ? highlights.find((h) => h.index === activeIdx) ?? null
      : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-auto flex items-start justify-center"
    >
      <Document
        file={src}
        onLoadSuccess={({ numPages }) => onLoad(numPages)}
        onLoadError={(e) =>
          onError ? onError(e) : console.error("PDF load error:", e)
        }
        loading={<div className="text-sm text-gray-500">PDF 불러오는 중…</div>}
        error={<div className="text-sm text-red-500">PDF 로드 실패</div>}
      >
        <Page
          pageNumber={page}
          width={width}
          renderTextLayer={true}
          renderAnnotationLayer={false}
          customTextRenderer={customTextRenderer}
        />
      </Document>

      {activeHighlight && (
        <div className="absolute left-6 right-6 bottom-6 z-30 rounded-xl bg-gray-100/95 px-4 py-3 text-[13px] text-gray-800 shadow-lg border border-gray-200">
          <div className="mb-1 text-xs font-semibold text-gray-600">
            왜 위험한가요?
          </div>
          <div>{activeHighlight.reason}</div>
        </div>
      )}
    </div>
  );
}
