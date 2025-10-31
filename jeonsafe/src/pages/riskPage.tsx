// pages/RiskPage.tsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import { useProgress } from "../stores/useProgress";
import TwoPaneViewer, { VIEW_W } from "../components/TwoPaneViewer";
import DocList from "../components/DocList";
import type { Doc } from "../types/doc";
import PdfViewer from "../components/viewers/PdfViewer";
import ImageViewer from "../components/viewers/ImageViewer";
import NextStepButton from "../components/NextStepButton";

import { pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const PAGE_WIDTH = VIEW_W - 16 * 2; // padding 보정

export default function RiskPage() {
  const { setPos } = useProgress();
  useEffect(() => setPos("pre", 1), [setPos]);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [srcMap, setSrcMap] = useState<Record<number, string>>({});
  const [activeId, setActiveId] = useState<number | null>(null);

  const activeDoc = useMemo(() => docs.find((d) => d.id === activeId), [docs, activeId]);
  const activeSrc = activeId == null ? null : srcMap[activeId] || null;

  // 파일 선택
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openFilePicker = () => fileInputRef.current?.click();
  const idRef = useRef(1);

  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);

  const addFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const incoming = e.target.files ? Array.from(e.target.files) : [];
    if (incoming.length === 0) return;

    setDocs((prev) => {
      const next = [...prev];
      const map = { ...srcMap };
      let lastId: number | null = null;
      for (const f of incoming) {
        const id = idRef.current++;
        const url = URL.createObjectURL(f);
        const isPdf = f.type === "application/pdf";
        const isImg = f.type.startsWith("image/");
        next.push({ id, name: f.name, type: isPdf ? "pdf" : isImg ? "image" : "other" });
        map[id] = url;
        lastId = id;
      }
      setSrcMap(map);
      if (lastId) { setActiveId(lastId); setPageNumber(1); }
      return next;
    });
    e.currentTarget.value = "";
  };

  const left = (
    <DocList
      docs={docs}
      activeId={activeId ?? -1}
      onSelect={(id) => { setActiveId(id); setPageNumber(1); }}
    />
  );

  const rightHeader = {
    title: activeDoc ? activeDoc.name : "문서 내용",
    action: (
      <>
        <button onClick={openFilePicker}
                className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-100">
          내 파일로 테스트
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" multiple className="hidden"
               onChange={addFiles}/>
      </>
    ),
  };

  const rightFooter = activeDoc?.type === "pdf" ? (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
                pageNumber > 1 ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
              }`}>‹</button>
      <span className="text-xs text-gray-700 tabular-nums">{pageNumber} / {numPages}페이지</span>
      <button onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
                pageNumber < numPages ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
              }`}>›</button>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <main className="flex-1">
        <div className="w-full p-4 pt-4 pb-24 overflow-hidden">
          <TwoPaneViewer left={left} rightHeader={rightHeader} rightFooter={rightFooter}>
            {/* ⬇️ 가운데 콘텐츠만 갈아끼우면 다른 페이지에서도 그대로 재사용 */}
            {activeDoc && activeSrc ? (
              activeDoc.type === "pdf" ? (
                <PdfViewer
                  src={activeSrc}
                  page={pageNumber}
                  onLoad={(n) => setNumPages(n)}
                  width={PAGE_WIDTH}
                />
              ) : activeDoc.type === "image" ? (
                <ImageViewer src={activeSrc} width={PAGE_WIDTH} alt={activeDoc.name} />
              ) : (
                <div className="text-sm text-gray-500">미리보기를 지원하지 않는 형식입니다.</div>
              )
            ) : (
              <div className="text-sm text-gray-400">문서를 추가해 주세요.</div>
            )}
          </TwoPaneViewer>
        </div>
      </main>

      <NextStepButton to="/pre/mapping" />
    </div>
  );
}
