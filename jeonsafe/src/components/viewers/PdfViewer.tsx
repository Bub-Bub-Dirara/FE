import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

type Props = {
  src: string | File | Blob;
  page: number;
  width: number;
  onLoad: (numPages: number) => void;
  onError?: (err: unknown) => void;
};

export default function PdfViewer({ src, page, width, onLoad, onError }: Props) {
  return (
    <div className="w-full h-full overflow-auto flex items-start justify-center">
      <Document
        file={src}
        onLoadSuccess={({ numPages }) => onLoad(numPages)}
        onLoadError={(e) => (onError ? onError(e) : console.error("PDF load error:", e))}
        loading={<div className="text-sm text-gray-500">PDF 불러오는 중…</div>}
        error={<div className="text-sm text-red-500">PDF 로드 실패</div>}
      >
        <Page
          pageNumber={page}
          width={width}
          renderTextLayer={true}
          renderAnnotationLayer={false}
          className="selectable-pdf"
        />
      </Document>
    </div>
  );
}