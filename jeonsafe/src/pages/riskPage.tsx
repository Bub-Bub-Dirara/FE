import React, { useMemo, useState, useEffect } from "react";
import { useProgress } from "../stores/useProgress";
import UploadList from "../components/lawbox";
import type { Doc } from "../components/lawbox";
import NextStepButton from "../components/NextStepButton";

const HARDCODED_DOCS: Doc[] = [
  { id: 1, name: "계약서 PDF", type: "pdf", pages: 3 },
  { id: 2, name: "신분증 이미지", type: "image", pages: 1 },
  { id: 3, name: "등기부등본 PDF", type: "pdf", pages: 2 },
  { id: 4, name: "현장사진1", type: "image", pages: 1 },
  { id: 5, name: "현장사진2", type: "image", pages: 1 },
  { id: 6, name: "신분증 이미지", type: "image", pages: 1 },
  { id: 7, name: "등기부등본 PDF", type: "pdf", pages: 2 },
  { id: 8, name: "현장사진1", type: "image", pages: 1 },
  { id: 9, name: "현장사진2", type: "image", pages: 1 },
  { id: 10, name: "신분증 이미지", type: "image", pages: 1 },
  { id: 11, name: "등기부등본 PDF", type: "pdf", pages: 2 },
  { id: 12, name: "현장사진1", type: "image", pages: 1 },
  { id: 13, name: "현장사진2", type: "image", pages: 3 },
];

function PlaceholderPage({ index }: { index: number }) {
  return (
    <div className="relative w-[360px] h-[420px] rounded-xl border border-[rgba(17,63,103,1)] bg-white overflow-hidden shadow-sm">
      <div className="h-8 bg-gray-100 flex items-center justify-between px-3">
        <span className="text-xs text-gray-500">PDF • Page {index}</span>
      </div>

      <div className="p-4 space-y-2 text-[10px] leading-4 text-gray-600 select-none">
        {Array.from({ length: 26 }).map((_, i) => (
          <div key={i} className="space-x-1">
            {Array.from({ length: 28 }).map((__, j) => (
              <span key={j} className="inline-block bg-gray-200/60 h-2 rounded w-2" />
            ))}
          </div>
        ))}
      </div>

      <div className="absolute left-4 right-4 top-40 h-10 bg-yellow-200/70 rounded-sm" />
      <div className="absolute left-4 right-4 top-[210px] bg-gray-100 border text-gray-700 text-xs rounded p-3 leading-5">
        해당 내용은 제17091호 부동산 실권리자명의 등기에 대한 법률에 의해 사용자에게 불리한 내용이 아닙니다.
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-gray-600">{index}</div>
    </div>
  );
}

const RiskPage: React.FC = () => {
  const { setPos } = useProgress();
  useEffect(() => setPos("pre", 1), [setPos]);

  const [docs] = useState<Doc[]>(HARDCODED_DOCS);
  const [activeId, setActiveId] = useState<number>(docs[0].id);
  const activeDoc = useMemo(() => docs.find((d) => d.id === activeId) || docs[0], [docs, activeId]);
  const [page, setPage] = useState<number>(1);

  useEffect(() => setPage(1), [activeId]);

  const maxPage = activeDoc?.pages ?? 1;
  const canPrev = page > 1;
  const canNext = page < maxPage;

  return (
    <div className="w-full h-[calc(100vh-6rem)] bg-neutral-50 p-4 pt-4 overflow-hidden">
      <div className="mx-auto max-w-5xl grid grid-cols-[240px_minmax(0,1fr)] gap-0 content-start h-full">
        <UploadList docs={docs} activeId={activeId} onSelect={setActiveId} />

        <div className="rounded-r-lg rounded-l-none border border-gray-300 bg-white flex flex-col border-l h-full overflow-hidden">
          <div className="px-3 py-2 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">계약서 PDF</h2>
          </div>
          
          
          <div className="p-2 flex-1 flex items-center justify-center overflow-auto">
            <PlaceholderPage index={page} />
          </div>

          <div className="py-4 flex items-center justify-center gap-2 bg-white">
            <button
              className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
                canPrev ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
              }`}
              onClick={() => canPrev && setPage(Math.max(1, page - 1))}
              disabled={!canPrev}
              aria-label="이전 페이지"
            >
              ‹
            </button>
            <span className="text-xs text-gray-700 tabular-nums">{page}페이지</span>
            <button
              className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
                canNext ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
              }`}
              onClick={() => canNext && setPage(Math.min(maxPage, page + 1))}
              disabled={!canNext}
              aria-label="다음 페이지"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default RiskPage;
