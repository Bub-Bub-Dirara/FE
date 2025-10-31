import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

type Props = {
  src: string | File | Blob;
  page: number;
  onLoad: (numPages: number) => void;
  width: number;
};
export default function PdfViewer({ src, page, onLoad, width }: Props) {
  return (
    <Document file={src} onLoadSuccess={({ numPages }) => onLoad(numPages)}
              onLoadError={(e) => console.error("PDF load error:", e)}>
      <Page
        pageNumber={page}
        width={width}
        renderTextLayer={true}
        renderAnnotationLayer={false}
        className="selectable-pdf"
      />
    </Document>
  );
}
