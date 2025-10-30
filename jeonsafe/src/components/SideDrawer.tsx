import { useEffect, useMemo, useRef, useState } from "react";

type Item = { id: string; title: string };

type Props = {
  open: boolean;
  onClose: () => void;
  width?: number;
  offsetLeftPx?: number;
  preItems?: Item[];
  postItems?: Item[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export default function SideDrawer({
  open,
  onClose,
  width = 360,
  offsetLeftPx = 60,
  preItems = [],
  postItems = [],
  onEdit,
  onDelete,
}: Props) {
  const [tab, setTab] = useState<"pre" | "post">("pre");

  const [localPre, setLocalPre] = useState<Item[]>(preItems);
  const [localPost, setLocalPost] = useState<Item[]>(postItems);

  useEffect(() => setLocalPre(preItems), [preItems]);
  useEffect(() => setLocalPost(postItems), [postItems]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setDraft(currentTitle);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const apply = (arr: Item[]) => arr.map(it => it.id === editingId ? { ...it, title: draft.trim() || it.title } : it);
    if (tab === "pre") setLocalPre(apply);
    else setLocalPost(apply);

    onEdit?.(editingId);
    setEditingId(null);
    setDraft("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
  };

  const removeItem = (id: string) => {
    if (tab === "pre") setLocalPre(prev => prev.filter(it => it.id !== id));
    else setLocalPost(prev => prev.filter(it => it.id !== id));
    onDelete?.(id);
    if (editingId === id) cancelEdit();
  };

  const items = useMemo(() => (tab === "pre" ? localPre : localPost), [tab, localPre, localPost]);
  return (
    <div
      className={`fixed inset-y-0 z-[60] transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      style={{ left: offsetLeftPx, right: 0 }}
    >
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div
        className="absolute top-2 left-2 bottom-2 bg-white shadow-xl border border-gray-200 rounded-2xl transition-transform duration-300 ease-in-out overflow-hidden"
        style={{
          width,
          transform: open ? "translateX(0)" : `translateX(-${width + 16}px)`,
        }}
      >
        <div className="pt-4 pb-2 bg-white">
          <div className="flex justify-center items-center gap-8 text-sm">
            <button
              type="button"
              onClick={() => { setTab("pre"); cancelEdit(); }}
              className={`pb-2 font-medium whitespace-nowrap ${tab === "pre" ? "text-[#113F67] border-b-2 border-[#113F67]" : "text-gray-500"}`}
            >
              사전대비 채팅기록
            </button>
            <button
              type="button"
              onClick={() => { setTab("post"); cancelEdit(); }}
              className={`pb-2 font-medium whitespace-nowrap ${tab === "post" ? "text-[#113F67] border-b-2 border-[#113F67]" : "text-gray-500"}`}
            >
              사후처리 채팅기록
            </button>
          </div>
        </div>

        <div className="p-3 space-y-3 overflow-y-auto h-[calc(100%-56px)]">
          {items.length > 0 ? (
            items.map((it) => {
              const isEditing = editingId === it.id;
              return (
                <div
                  key={it.id}
                    className="group flex items-center gap-2 border rounded-lg px-3 h-12 hover:border-[#113F67] transition-colors"
                >
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        onBlur={cancelEdit}
                        placeholder="제목을 입력하세요"
                        className="w-full h-8 bg-transparent p-0 m-0 border-0 outline-none text-sm leading-5"
                        spellCheck={false}
                      />
                    ) : (
                      <div className="truncate text-sm">{it.title}</div>
                    )}
                  </div>

                  {!isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(it.id, it.title)}
                        className="text-gray-400 hover:text-gray-700"
                        aria-label="편집"
                        title="편집"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="text-gray-300 hover:text-red-600"
                        aria-label="삭제"
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-400 px-2 mt-2">기록이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
