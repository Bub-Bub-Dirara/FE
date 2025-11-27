import * as React from "react";

export type LawItem = {
  id: string;
  title: string;
  body: string;
};

const mockItems: LawItem[] = [
  {
    id: "제17091호",
    title: "부동산 실권리자명의 등기에 대한 법률",
    body: `<p class='text-sm'>샘플 1</p>`
  },
  {
    id: "제17091호",
    title: "부동산 실권리자명의 등기에 대한 법률",
    body: `<p class='text-sm'>샘플 2</p>`
  },
  { id: "제17091호", title: "부동산 실권리자명의 등기에 대한 법률", body: `<p class='text-sm'>샘플 3</p>` },
  { id: "제17091호", title: "부동산 실권리자명의 등기에 대한 법률", body: `<p class='text-sm'>샘플 4</p>` },
];

function RelatedLawSection({ items = mockItems }: { items?: LawItem[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const [panelPos, setPanelPos] = React.useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const rowRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  const FOUR_ROW_HEIGHT = 48 * 4 + 12 * 3 + 16;
  //const BORDER = 2;
  const containerClass = items.length >= 4 ? `max-h-[${FOUR_ROW_HEIGHT}px] overflow-y-auto` : `h-[${FOUR_ROW_HEIGHT}px] overflow-hidden`;
  const fillerCount = Math.max(0, 4 - items.length);

  const openAtRow = (idx: number) => {
    const wrapper = wrapperRef.current;
    const row = rowRefs.current[idx];
    if (!wrapper || !row) return;
    const w = wrapper.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    setPanelPos({ top: r.top - w.top + 1, left: r.left - w.left, width: r.width, height: r.height });
    setOpenIndex(idx);
  };

  const handleToggle = (idx: number) => {
    if (openIndex === idx) {
      setOpenIndex(null);
      setPanelPos(null);
    } else {
      openAtRow(idx);
    }
  };

  React.useEffect(() => {
    if (openIndex !== null) overlayRef.current?.focus();
  }, [openIndex]);

  React.useEffect(() => {
    if (openIndex === null) return;
    const wrapper = wrapperRef.current;
    const row = rowRefs.current[openIndex];
    if (!wrapper || !row) return;
    const recalc = () => {
      const w = wrapper.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      setPanelPos({ top: r.top - w.top + 1, left: r.left - w.left, width: r.width, height: r.height });
    };
    recalc();
    window.addEventListener("resize", recalc);
    wrapper.addEventListener("scroll", recalc);
    return () => {
      window.removeEventListener("resize", recalc);
      wrapper.removeEventListener("scroll", recalc);
    };
  }, [openIndex]);

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <h2 className="text-lg font-semibold mb-3">관련 법령 조항</h2>
      <div ref={wrapperRef} className="relative rounded-xl border-2 bg-white p-2 shadow-sm" style={{ borderColor: "rgba(17, 63, 103, 1)" }}>
        <div className={`relative space-y-3 ${containerClass}`}>
          {items.map((it, idx) => (
            <div key={idx} ref={(el) => { rowRefs.current[idx] = el; }} className="rounded-xl bg-gray-50">
              <button onClick={() => handleToggle(idx)} aria-expanded={openIndex === idx} className="w-full flex items-center gap-4 px-4 py-3 text-left rounded-xl hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <span className="shrink-0 text-base sm:text-lg font-extrabold text-gray-800 leading-none">{it.id}</span>
                <span className="flex-1 truncate text-sm sm:text-base text-gray-700 leading-none">{it.title}</span>
                <ChevronDown className={"h-5 w-5 transition-transform " + (openIndex === idx ? "rotate-180" : "rotate-0")} />
              </button>
            </div>
          ))}
          {Array.from({ length: fillerCount }).map((_, i) => (
            <div key={`filler-${i}`} className="h-12 rounded-lg bg-gray-50" />
          ))}
        </div>

        {openIndex !== null && panelPos && (
          <div ref={overlayRef} role="dialog" aria-modal="true" tabIndex={-1} style={{ position: "absolute", top: panelPos.top, left: panelPos.left, width: panelPos.width }} className="z-20 rounded-xl bg-white shadow-2xl outline-none">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50" style={{ borderColor: "rgba(17, 63, 103, 0.25)" }}>
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-base sm:text-lg font-extrabold text-gray-800 leading-none">{items[openIndex].id}</span>
                <span className="flex-1 truncate text-sm sm:text-base text-gray-700 leading-none">{items[openIndex].title}</span>
              </div>
              <button onClick={() => { setOpenIndex(null); setPanelPos(null); }} className="p-2 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="닫기">
                <ChevronUp className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 py-4 max-h-[56vh] overflow-auto">
              <div className="prose prose-sm max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: items[openIndex].body }} />
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button onClick={() => { setOpenIndex(null); setPanelPos(null); }} className="px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-medium shadow hover:shadow-md active:scale-[0.99]">닫기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function ChevronUp({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export default function AppPreview() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-10">
      <RelatedLawSection />
    </div>
  );
}
