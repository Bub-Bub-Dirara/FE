// src/pages/MappingPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "../stores/useProgress";
import TwoPaneViewer from "../components/TwoPaneViewer";
import ReportButton from "../components/ReportButton";
import DocList from "../components/DocList";
import type { Doc } from "../types/doc";

/** 좌측: 위험조항 리스트용 */
type Risk = { id: string; title: string; preview: string };

const MOCK_RISKS: Risk[] = [
  { id: "r1", title: "실권리자명의 등기", preview: "임대인의 실권리자 확인 및 등기 미이행 시 책임..." },
  { id: "r2", title: "보증보험 미가입", preview: "보증보험 미가입 주택으로 보증금 반환 위험..." },
  { id: "r3", title: "특약 – 원상복구 전가", preview: "과도한 원상복구 비용을 임차인에 전가..." },
];

/** 우측 하단: mappingbox 디자인(행을 클릭하면 같은 위치에 펼침 패널) */
type LawItem = { id: string; title: string; body: string };
const MOCK_ITEMS: LawItem[] = [
  { id: "제17091호", title: "부동산 실권리자명의 등기에 대한 법률", body: `<p class='text-sm'>샘플 1 전문…</p>` },
  { id: "제17091호", title: "부동산 실권리자명의 등기에 대한 법률", body: `<p class='text-sm'>샘플 2 전문…</p>` },
  { id: "제17091호", title: "부동산 실권리자명의 등기에 대한 법률", body: `<p class='text-sm'>샘플 3 전문…</p>` },
  { id: "제17091호", title: "부동산 실권리자명의 등기에 대한 법률", body: `<p class='text-sm'>샘플 4 전문…</p>` },
];

/** 업로드 문서 (DocType: "pdf" | "image" | "other") */
const DOCS: Doc[] = [
  { id: 1, name: "전세계약서_샘플.pdf", type: "pdf", pages: 12 },
  { id: 2, name: "특약_부속합의.hwp", type: "other", pages: 3 },
];

/** (옵션) 문서-이미지 소스 매핑 */
const DOC_IMAGE_SRC: Record<number, string | undefined> = {
  // 1: "/images/sample_contract_p1.png",
  // 2: "/images/sample_annex_p1.png",
};

/** 이미지 없을 때 플레이스홀더 (가로 넓고 세로 얕게) */
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="220">
       <rect width="100%" height="100%" fill="#f3f4f6"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             font-family="sans-serif" font-size="16" fill="#9ca3af">
         미리보기 이미지가 없습니다
       </text>
     </svg>`
  );

/** mappingbox 스타일: 관련 법령 조항 리스트 */
function RelatedLawSection({ items }: { items: LawItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const FOUR_ROW_H = 48 * 4 + 12 * 3 + 16;
  const containerClass =
    items.length >= 4 ? `max-h-[${FOUR_ROW_H}px] overflow-y-auto` : `h-[${FOUR_ROW_H}px] overflow-hidden`;
  const fillerCount = Math.max(0, 4 - items.length);

  const openAt = (idx: number) => {
    const w = wrapperRef.current?.getBoundingClientRect();
    const r = rowRefs.current[idx]?.getBoundingClientRect();
    if (!w || !r) return;
    setPanelPos({ top: r.top - w.top + 1, left: r.left - w.left, width: r.width });
    setOpenIndex(idx);
  };

  const handleToggle = (idx: number) => {
    if (openIndex === idx) {
      setOpenIndex(null);
      setPanelPos(null);
    } else {
      openAt(idx);
    }
  };

  useEffect(() => {
    if (openIndex === null) return;
    const wrap = wrapperRef.current!;
    const row = rowRefs.current[openIndex]!;
    const recalc = () => {
      const w = wrap.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      setPanelPos({ top: r.top - w.top + 1, left: r.left - w.left, width: r.width });
    };
    recalc();
    const on = () => recalc();
    window.addEventListener("resize", on);
    wrap.addEventListener("scroll", on);
    return () => {
      window.removeEventListener("resize", on);
      wrap.removeEventListener("scroll", on);
    };
  }, [openIndex]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h3 className="text-base font-semibold mb-3">관련 법령 조항</h3>
      <div
        ref={wrapperRef}
        className="relative rounded-xl border-2 bg-white p-2 shadow-sm"
        style={{ borderColor: "rgba(17,63,103,1)" }}
      >
        <div className={`relative space-y-3 ${containerClass}`}>
          {items.map((it, idx) => (
            <div
              key={idx}
              ref={(el) => {
                rowRefs.current[idx] = el;
              }}
              className="rounded-xl bg-gray-50"
            >
              <button
                onClick={() => handleToggle(idx)}
                aria-expanded={openIndex === idx}
                className="w-full flex items-center gap-4 px-4 py-3 text-left rounded-xl hover:bg-gray-100"
              >
                <span className="shrink-0 text-base sm:text-lg font-extrabold text-gray-800 leading-none">
                  {it.id}
                </span>
                <span className="flex-1 truncate text-sm sm:text-base text-gray-700 leading-none">{it.title}</span>
                <svg
                  className={`h-5 w-5 transition-transform ${openIndex === idx ? "rotate-180" : "rotate-0"}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          ))}
          {Array.from({ length: fillerCount }).map((_, i) => (
            <div key={`filler-${i}`} className="h-12 rounded-lg bg-gray-50" />
          ))}
        </div>

        {openIndex !== null && panelPos && (
          <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            style={{ position: "absolute", top: panelPos.top, left: panelPos.left, width: panelPos.width }}
            className="z-20 rounded-xl bg-white shadow-2xl outline-none"
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b bg-gray-50"
              style={{ borderColor: "rgba(17,63,103,0.25)" }}
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-base sm:text-lg font-extrabold text-gray-800 leading-none">
                  {items[openIndex].id}
                </span>
                <span className="flex-1 truncate text-sm sm:text-base text-gray-700 leading-none">
                  {items[openIndex].title}
                </span>
              </div>
              <button
                onClick={() => {
                  setOpenIndex(null);
                  setPanelPos(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="닫기"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
            </div>
            <div className="px-4 py-4 max-h-[56vh] overflow-auto">
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: items[openIndex].body }}
              />
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button
                onClick={() => {
                  setOpenIndex(null);
                  setPanelPos(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-medium shadow hover:shadow-md active:scale-[0.99]"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MappingPage() {
  const { setPos } = useProgress();
  useEffect(() => {
    setPos("pre", 2);
  }, [setPos]);

  // 좌측: 위험조항(현재는 첫 항목 고정 사용)
  const [risks] = useState<Risk[]>(MOCK_RISKS);
  const active = risks[0];

  // 우측: 문서 선택 상태
  const [activeDocId, setActiveDocId] = useState<number>(DOCS[0].id);

  // 이미지 뷰어용 파생 값들
  const activeDoc = useMemo(() => DOCS.find((d) => d.id === activeDocId)!, [activeDocId]);
  const activeSrc = DOC_IMAGE_SRC[activeDoc.id] ?? PLACEHOLDER;

  /** 좌측 패널: 문서 리스트 */
  const left = <DocList docs={DOCS} activeId={activeDocId} onSelect={setActiveDocId} />;

  const rightHeader = { title: active?.title ?? "위험조항" };

  /** 우측 본문 */
  const LawArea = (
    <div className="space-y-6">
      {/* 와이드·숏 미리보기: 가로 넓고 세로 얕게 */}
      <section className="w-full max-w-3xl mx-auto">
        <h3 className="text-base font-semibold mb-2">업로드 문서</h3>
        <div className="rounded-xl border border-2 border-[#113F67] bg-white p-3">
          <div className="w-full h-40 sm:h-44 md:h-48 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={activeSrc}
              alt={activeDoc.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* mappingbox 스타일 – 클릭 시 같은 위치에 패널이 뜸 */}
      <RelatedLawSection items={MOCK_ITEMS} />
      <RelatedLawSection items={MOCK_ITEMS} />
    </div>
  );

  const onGenerateReport = async () => {
    await new Promise((r) => setTimeout(r, 600));
    alert("리포트가 생성되었습니다. (데모)");
  };

  return (
    <div className="min-h-dvh overflow-hidden bg-white">
      <main className="flex-1">
        <div className="w-full p-4 pb-24 overflow-hidden">
          <TwoPaneViewer left={left} rightHeader={rightHeader}>
            {LawArea}
          </TwoPaneViewer>
        </div>
      </main>

      <ReportButton onGenerate={onGenerateReport} />

      {/*
        <ReportButton
          onGenerate={async (title) => {
            // 저장 로직
            // await save({ title, ... })
          }}
          onReset={() => {
            // 초기화 로직
          }}
        />
      */}
    </div>
  );
}
