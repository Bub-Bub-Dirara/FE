import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import type { BucketKey } from "../../types/evidence";
import type { RatingLabel, AnalyzeItem } from "../../lib/analyzeEvidence";

type Props = {
  id: string;
  name: string;
  currentBucket: BucketKey;
  bucketOrder: BucketKey[];
  onMoveTo: (to: BucketKey) => void;

  rating?: RatingLabel;
  analysis?: AnalyzeItem;
};

export default function SortableRow({
  id,
  name,
  rating,
  analysis,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [open, setOpen] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const bgClass =
    rating === "G"
      ? "bg-emerald-100"
      : rating === "M"
      ? "bg-amber-100"
      : rating === "B"
      ? "bg-rose-100"
      : "bg-gray-100";

  return (
    <li ref={setNodeRef} style={style} className="px-2">
      <div
        className={`w-full rounded-xl shadow-sm border border-gray-200 overflow-hidden ${bgClass}`}
      >
        {/* 상단 바 */}
        <div
          className="flex w-full items-center justify-between px-5 py-3 select-none"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="truncate text-[15px] text-gray-800 underline-offset-2 hover:underline">
            {name}
          </span>

          {/* 드래그 핸들 */}
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()} // 클릭 토글 방지
            className="ml-3 rounded-md p-1 hover:bg-gray-200 active:bg-gray-300"
            title="드래그해서 위치를 옮길 수 있어요"
          >
            <ChevronUpDownIcon className="h-4 w-4 text-gray-600" />
          </div>
        </div>

        {/* 내용 (GPT 이유) */}
        {open && analysis && (
          <div className="border-t border-gray-200 bg-white/90 px-6 py-3 text-sm text-gray-800">
            <ul className="list-disc pl-5 space-y-1">
              {analysis.rating.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
}
