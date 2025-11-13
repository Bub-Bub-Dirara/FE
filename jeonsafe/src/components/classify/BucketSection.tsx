import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import SortableRow from "./SortableRow";
import type { BucketKey, Item } from "../../types/evidence";
import type { RatingLabel, AnalyzeItem } from "../../lib/analyzeEvidence";

type Props = {
  id: BucketKey;
  title: string;
  items: Item[];
  bucketOrder: BucketKey[];
  onMoveItem: (itemId: string, to: BucketKey) => void;

  getRating?: (itemId: string) => RatingLabel | undefined;
  getAnalysis?: (itemId: string) => AnalyzeItem | undefined;
};

export default function BucketSection({
  id,
  title,
  items,
  bucketOrder,
  onMoveItem,
  getRating,
  getAnalysis,
}: Props) {
  const { setNodeRef } = useDroppable({ id });
  const itemIds = useMemo(() => items.map((it) => it.id), [items]);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl px-6 scroll-mt-[var(--topbar-h)]">
      <h3 className="mb-3 text-base font-semibold text-gray-800">{title}</h3>

      <div
        ref={setNodeRef}
        className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-visible"
      >
        <ul className="py-3 space-y-3">
          <SortableContext items={itemIds} strategy={rectSortingStrategy}>
            {items.map((it) => (
              <SortableRow
                key={it.id}
                id={it.id}
                name={it.name}
                currentBucket={id}
                bucketOrder={bucketOrder}
                onMoveTo={(to) => onMoveItem(it.id, to)}
                rating={getRating?.(it.id)}
                analysis={getAnalysis?.(it.id)}
              />
            ))}
          </SortableContext>
        </ul>
      </div>
    </section>
  );
}
