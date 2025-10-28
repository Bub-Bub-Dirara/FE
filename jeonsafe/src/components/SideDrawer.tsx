import { useEffect, useRef, useState } from "react";

type Item = { id: string; title: string };

type Props = {
  open: boolean;
  onClose: () => void;
  width?: number;
  preItems?: Item[];
  postItems?: Item[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export default function SideDrawer({
  open,
  onClose,
  width = 320,
  preItems = [],
  postItems = [],
  onEdit,
  onDelete,
}: Props) {
  const [tab, setTab] = useState<"pre" | "post">("pre");
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC로 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // 바깥 클릭으로 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  const items = tab === "pre" ? preItems : postItems;

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* 배경 dim */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      {/* 슬라이드 패널 */}
      <div
        ref={panelRef}
        className="absolute top-0 left-0 h-full bg-white border-r border-gray-200 shadow-xl transition-transform duration-300 ease-in-out"
        style={{
          width,
          transform: open ? "translateX(0)" : `translateX(-${width}px)`,
        }}
      >
        {/* 헤더 */}
        <div className="h-14 flex items-center justify-between px-4 border-b">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("pre")}
              className={`px-3 py-1 rounded-md text-sm ${
                tab === "pre"
                  ? "bg-[#113F67] text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              사전대비 채팅 기록
            </button>
            <button
              onClick={() => setTab("post")}
              className={`px-3 py-1 rounded-md text-sm ${
                tab === "post"
                  ? "bg-[#113F67] text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              사후처리 채팅 기록
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-xl font-semibold text-gray-600 hover:text-black"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 리스트 */}
        <div className="p-3 space-y-3 overflow-y-auto h-[calc(100%-56px)]">
          {items.length > 0 ? (
            items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-2 border rounded-lg px-3 py-2 hover:border-[#113F67] transition-colors"
              >
                <div className="flex-1 truncate text-sm">{it.title}</div>
                <button
                  onClick={() => onEdit?.(it.id)}
                  className="text-gray-500 hover:text-gray-800"
                  aria-label="편집"
                >
                  ✎
                </button>
                <button
                  onClick={() => onDelete?.(it.id)}
                  className="text-gray-500 hover:text-red-600"
                  aria-label="삭제"
                >
                  🗑️
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 px-2 mt-2">
              기록이 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
