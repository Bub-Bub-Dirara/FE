import type { ReactNode } from "react";
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

  /** Risk/Simulate/Mapping 공통 하이라이트 */
  highlights?: PdfHighlight[];

  /** 기본은 Simulate/Mapping용 카드 스타일 */
  variant?: Variant;

  /** Simulate/Mapping에서 쓰는 제목 ("업로드 문서") */
  title?: string;
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
  variant = "card", // ✅ 기본을 카드 모드로
  title = "업로드 문서",
}: Props) {
  // 공통: 실제 문서를 그리는 부분만 함수로
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
          <ImageViewer
            src={activeSrc}
            width={PAGE_WIDTH}
            alt={activeDoc.name}
          />
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

    return (
      <div className="text-sm text-gray-400">문서를 선택해 주세요.</div>
    );
  };

  // ─────────────────────────────
  // 1) RiskPage 스타일: 그냥 뷰어만 꽉
  // ─────────────────────────────
  if (variant === "risk") {
    return <>{renderContent()}</>;
  }

  // ─────────────────────────────
  // 2) Simulate / Mapping 카드 스타일
  // ─────────────────────────────
  return (
    <section className="w-full mb-6">
      <h2 className="text-xl font-bold mb-1 text-[#113F67] ml-3">
        {title}
      </h2>
      <div className="rounded-xl border border-2 border-[#113F67] bg-white p-3">
        <div className="w-full flex items-center justify-center mb-3">
          <div
            className="bg-gray-100 rounded-lg border border-gray-200 shadow-sm overflow-y-auto overflow-x-auto"
            style={{ maxWidth: 720, height: 300 }} // 크기 조절 포인트
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
            suffix="p"
            onChange={onChangePage}
          />
        )}
      </div>
    </section>
  );
}
