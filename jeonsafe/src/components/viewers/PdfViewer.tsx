import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

type Highlight = {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  pageWidth: number;
  pageHeight: number;
  color: string;
  reason: string;
  index: number;
  sentence: string;
};

type Props = {
  src: string | File | Blob;
  page: number;
  width: number;
  onLoad: (numPages: number) => void;
  onError?: (err: unknown) => void;
  highlights?: Highlight[];
};

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

  // 현재 페이지에 해당하는 하이라이트만 추리기
  const pageHighlights = useMemo(
    () => (highlights ?? []).filter((h) => h.page === page),
    [highlights, page],
  );

  // PyMuPDF 좌표로 렌더링 좌표 스케일 계산
  const { scale, pagePixelHeight } = useMemo(() => {
    if (pageHighlights.length === 0) {
      return { scale: 1, pagePixelHeight: undefined as number | undefined };
    }
    const { pageWidth, pageHeight } = pageHighlights[0];
    const s = width / pageWidth;
    return { scale: s, pagePixelHeight: pageHeight * s };
  }, [pageHighlights, width]);
  
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const handler = (ev: MouseEvent) => {
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
      <div
        className="relative"
        style={{
          width,
          height: pagePixelHeight,
        }}
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
          />
        </Document>

        {/* 좌표 기반 하이라이트 박스 */}
        {pageHighlights.map((h) => (
          <div
            key={`${h.index}-${h.x}-${h.y}-${h.w}-${h.h}`}
            data-risk-idx={h.index}
            className="absolute rounded-sm"
            style={{
              left: h.x * scale,
              top: h.y * scale,
              width: h.w * scale,
              height: h.h * scale,
              backgroundColor: h.color,
              cursor: "pointer",
              mixBlendMode: "multiply",
              zIndex: 20,
            }}
          />
        ))}

        {/* reason 말풍선 */}
        {activeHighlight && activeHighlight.page === page && (
          <div
            className="absolute z-30 max-w-[420px] rounded-xl bg-gray-100/95 px-3 py-2 text-[12px] text-gray-800 shadow-lg border border-gray-200"
            style={{
              left: activeHighlight.x * scale,
              top: (activeHighlight.y + activeHighlight.h) * scale + 4,
            }}
          >
            <div className="mb-1 text-[11px] font-semibold text-gray-600">
              왜 위험한가요?
            </div>
            <div>{activeHighlight.reason}</div>
          </div>
        )}
      </div>
    </div>
  );
}