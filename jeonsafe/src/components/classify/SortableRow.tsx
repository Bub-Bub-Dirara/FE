import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import type { BucketKey } from "../../types/evidence";
import { BUCKET_META } from "../../types/evidence";

type Props = {
  id: string;
  name: string;
  currentBucket: BucketKey;
  bucketOrder: BucketKey[];
  onMoveTo: (to: BucketKey) => void;
};

export default function SortableRow({
  id, name, currentBucket, bucketOrder, onMoveTo,
}: Props) {
  const {
    attributes, listeners,
    setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id });

  const [menuOpen, setMenuOpen] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const targets = bucketOrder.filter((b) => b !== currentBucket);

  return (
    <li ref={setNodeRef} style={style} className="px-2 relative">
      <div className="flex items-center justify-between rounded-xl bg-gray-100 px-5 py-3 shadow-sm">
        <span className="truncate text-[15px] text-gray-800 select-none">{name}</span>

        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          className="ml-3 rounded-md p-1.5 hover:bg-gray-200 active:bg-gray-300 touch-none"
          title="드래그로 이동하거나 클릭해서 섹션 이동"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          <ChevronUpDownIcon className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {menuOpen && (
        <div
          className="absolute right-2 top-12 z-50 w-44 rounded-xl border border-gray-200 bg-white shadow-lg"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="py-1">
            {targets.map((b) => (
              <li key={b}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => { onMoveTo(b); setMenuOpen(false); }}
                >
                  {BUCKET_META[b].title}로 이동
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}