import { useEffect, useRef, type ReactNode } from "react";
import PdfViewer from "./PdfViewer";
import ImageViewer from "./ImageViewer";
import PageNavigator from "./PdfPageNavigator";
import type { Doc } from "../../types/doc";
import type { PdfHighlight } from "../../lib/pdfHighlights";

export type Variant = "risk" | "card";

const VIEW_W = 700;
const PAGE_WIDTH = VIEW_W - 16 * 2;

type Props = {
  activeDoc: Doc | null;
  activeSrc: string | null;

  pageNumber: number;
  numPages: number;
  onChangePage: (next: number) => void;

  onPdfLoad?: (n: number) => void;
  onPdfError: (err: unknown) => void;

  highlights?: PdfHighlight[];
  variant?: Variant;

  /** risk 모드에서 PDF 박스 스크롤 위치를 제어하기 위한 값 */
  scrollTop?: number;
  /** 스크롤이 바뀔 때 부모에게 알려줌 */
  onScrollChange?: (v: number) => void;
  focusRiskIndex?: number | null;
};

export default function DocViewerPanel({
  activeDoc,
  activeSrc,
  pageNumber,
  numPages,
  onChangePage,
  onPdfLoad,
  onPdfError,
  highlights,
  variant = "card",
  scrollTop,
  onScrollChange,
  focusRiskIndex, 
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const renderContent = (): ReactNode => {
    if (activeDoc && activeSrc) {
      if (activeDoc.type === "pdf") {
        return (
          <PdfViewer
            src={activeSrc}
            page={pageNumber}
            width={PAGE_WIDTH}
            onLoad={(n) => onPdfLoad?.(n)}
            onError={onPdfError}
            {...(highlights ? { highlights } : {})}
          />
        );
      }
      if (activeDoc.type === "image") {
        return (
          <ImageViewer src={activeSrc} width={PAGE_WIDTH} alt={activeDoc.name} />
        );
      }
      return (
        <div className="py-10 text-sm text-gray-500">
          미리보기를 지원하지 않는 형식입니다.
        </div>
      );
    }

    if (variant === "card") {
      return (
        <img
          alt={activeDoc?.name ?? "미리보기"}
          className="max-w-full max-h-[260px] object-contain"
          loading="lazy"
        />
      );
    }

    return <div className="text-sm text-gray-400">문서를 선택해 주세요.</div>;
  };

  // 부모에서 넘겨준 scrollTop으로 스크롤 위치 복원
  useEffect(() => {
    if (variant !== "risk") return;
    if (!containerRef.current) return;
    if (scrollTop == null) return;

    containerRef.current.scrollTop = scrollTop;
  }, [variant, scrollTop, pageNumber, activeDoc?.id]);

  useEffect(() => {
  if (variant !== "risk") return;
  if (!containerRef.current) return;
  if (focusRiskIndex == null) return;
  if (!highlights || highlights.length === 0) return;

  // 현재 페이지의 하이라이트 중에서 선택 index에 해당하는 것 찾기
  const pageHighlights = highlights.filter((h) => h.page === pageNumber);
  if (pageHighlights.length === 0) {
    containerRef.current.scrollTop = 0;
    return;
  }

  const target = pageHighlights.find((h) => h.index === focusRiskIndex);
  if (!target) {
    containerRef.current.scrollTop = 0;
    return;
  }

  // PdfViewer에서도 동일한 width로 렌더링하므로, 여기서도 같은 비율 사용
  const scale = PAGE_WIDTH / target.pageWidth;
  const yPx = target.y * scale;
  const hPx = target.h * scale;

  const container = containerRef.current;
  const containerHeight = container.clientHeight || 300;

  // 선택된 문장 박스의 중앙이 박스 중앙쯤에 오도록 스크롤 위치 계산
  const targetCenter = yPx + hPx / 2;
  const nextTop = Math.max(targetCenter - containerHeight / 2, 0);

  container.scrollTo({
    top: nextTop,
    behavior: "smooth",
  });
}, [variant, focusRiskIndex, pageNumber, highlights]);

  // risk 모드: PDF만
  if (variant === "risk") {
    return (
      <section className="w-full">
        <div
          ref={containerRef}
          className="rounded-lg border border-gray-200 bg-gray-50 shadow-sm overflow-auto flex items-start justify-center"
          style={{ maxWidth: 740, height: 300 }}
          onScroll={(e) => {
            if (!onScrollChange) return;
            const target = e.currentTarget as HTMLDivElement;
            onScrollChange(target.scrollTop); // 현재 스크롤 위치 부모에 저장
          }}
        >
          <div className="p-3 w-full flex items-center justify-center">
            {renderContent()}
          </div>
        </div>

        {activeDoc?.type === "pdf" && (
          <div className="mt-3 flex justify-center">
            <PageNavigator
              page={pageNumber}
              totalPages={numPages}
              suffix="페이지"
              onChange={onChangePage}
            />
          </div>
        )}
      </section>
    );
  }

  // Simulate/Mapping 기본 카드 스타일
  return (
    <section className="w-full">
      <div className="rounded-xl border border-2 border-white bg-white p-3">
        <div className="w-full flex items-center justify-center mb-3">
          <div
            className="bg-gray-100 rounded-lg border border-gray-200 shadow-sm overflow-y-auto overflow-x-auto"
            style={{ maxWidth: 720, height: 300 }}
          >
            <div className="p-3 flex items-center justify-center">
              {renderContent()}
            </div>
          </div>
        </div>

        {activeDoc?.type === "pdf" && (
          <PageNavigator
            page={pageNumber}
            totalPages={numPages}
            suffix="페이지"
            onChange={onChangePage}
          />
        )}
      </div>
    </section>
  );
}
