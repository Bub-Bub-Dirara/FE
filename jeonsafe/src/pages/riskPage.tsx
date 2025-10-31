import React, { useMemo, useState, useEffect, useRef } from "react";
import { useProgress } from "../stores/useProgress";
import UploadList from "../components/lawbox";
import type { Doc } from "../components/lawbox";
import NextStepButton from "../components/NextStepButton";

import { Document, Page, pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type DocSrcMap = Record<number, string>;

// ---- 고정 크기 상수 ----
const PANEL_H = 435;   // 좌/우 칼럼 높이(레이아웃 고정)
const VIEW_W = 700;    // 우측 미리보기 박스 너비
const VIEW_H = 340;    // 우측 미리보기 박스 높이
const INNER_PAD = 16;  // p-4
const PAGE_WIDTH = VIEW_W - INNER_PAD * 2;

const RiskPage: React.FC = () => {
  const { setPos } = useProgress();
  useEffect(() => setPos("pre", 1), [setPos]);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [srcMap, setSrcMap] = useState<DocSrcMap>({});
  const [activeId, setActiveId] = useState<number | null>(null);

  const activeDoc = useMemo(
    () => (activeId == null ? undefined : docs.find((d) => d.id === activeId)),
    [docs, activeId]
  );
  const activeSrc = useMemo(
    () => (activeId == null ? null : srcMap[activeId] ?? null),
    [srcMap, activeId]
  );
  const activeType = activeDoc?.type;

  // 파일 선택
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openFilePicker = () => fileInputRef.current?.click();
  const idRef = useRef(1);

  // PDF 페이지
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);

  // 미리보기 박스 스크롤
  const previewRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (previewRef.current) previewRef.current.scrollTop = 0;
  }, [pageNumber, activeId]);

  // blob URL 정리
  useEffect(() => {
    return () => {
      Object.values(srcMap).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [srcMap]);

  // 파일 추가
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = e.target.files ? Array.from(e.target.files) : [];
    if (incoming.length === 0) return;

    setDocs((prev) => {
      const next = [...prev];
      const nextMap: DocSrcMap = { ...srcMap };
      let lastId: number | null = null;

      for (const f of incoming) {
        const id = idRef.current++;
        const url = URL.createObjectURL(f);
        const isPdf = f.type === "application/pdf";
        const isImg = f.type.startsWith("image/");
        const type: Doc["type"] = isPdf ? "pdf" : isImg ? "image" : "other";

        next.push({ id, name: f.name, type, pages: isPdf ? 0 : 1 });
        nextMap[id] = url;
        lastId = id;
      }

      setSrcMap(nextMap);
      if (lastId != null) {
        setActiveId(lastId);
        setPageNumber(1);
      }
      return next;
    });

    e.currentTarget.value = "";
  };

  const handlePdfLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setDocs((prev) => prev.map((d) => (d.id === activeId ? { ...d, pages: numPages } : d)));
  };

  const canPrev = pageNumber > 1;
  const canNext = pageNumber < numPages;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <main className="flex-1">
        <div className="w-full p-4 pt-4 pb-24 overflow-hidden">
          <div
            className="mx-auto max-w-5xl grid grid-cols-[240px_minmax(0,1fr)] gap-0 items-stretch"
            style={{ height: PANEL_H }}
          >
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <UploadList
                docs={docs}
                activeId={activeId ?? -1}
                onSelect={(id) => {
                  setActiveId(id);
                  setPageNumber(1);
                }}
              />
            </div>

            <div className="h-full rounded-r-lg rounded-l-none border border-gray-300 border-l-0 bg-white flex flex-col overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 flex items-center justify-between shrink-0">
                <h2 className="text-sm font-semibold text-gray-800 truncate">
                  {activeDoc ? activeDoc.name : "문서 내용"}
                </h2>
                <div className="shrink-0">
                  <button
                    onClick={openFilePicker}
                    className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
                  >
                    내 파일로 테스트
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <div
                  ref={previewRef}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-y-auto overflow-x-hidden"
                  style={{ width: VIEW_W, height: VIEW_H }}
                >
                  <div className="p-4">
                    {activeDoc && activeSrc ? (
                      activeType === "pdf" ? (
                        <Document
                        file={activeSrc}
                        onLoadSuccess={handlePdfLoadSuccess}
                        onLoadError={(err) => console.error("PDF 로드 오류:", err)}
                      >
                        <Page
                          pageNumber={pageNumber}
                          width={PAGE_WIDTH}
                          renderTextLayer={true}
                          renderAnnotationLayer={false}
                          className="selectable-pdf"
                        />
                      </Document>
                      ) : activeType === "image" ? (
                        <img
                          src={activeSrc}
                          alt={activeDoc.name}
                          style={{ width: PAGE_WIDTH, height: "auto" }}
                          className="max-w-none border border-gray-300 rounded-lg bg-white"
                        />
                      ) : null
                    ) : null}
                  </div>
                </div>
              </div>

              {activeDoc && activeType === "pdf" && (
                <div className="py-2 flex items-center justify-center gap-2 bg-white shrink-0">
                  <button
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    disabled={!canPrev}
                    className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
                      canPrev ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
                    }`}
                    aria-label="이전 페이지"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-gray-700 tabular-nums">
                    {pageNumber} / {numPages}페이지
                  </span>
                  <button
                    onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                    disabled={!canNext}
                    className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
                      canNext ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
                    }`}
                    aria-label="다음 페이지"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <NextStepButton to="/pre/mapping" />
    </div>
  );
};

export default RiskPage;
