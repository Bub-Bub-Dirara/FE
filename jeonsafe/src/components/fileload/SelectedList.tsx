import { TrashIcon } from "@heroicons/react/24/outline";

type SelectedListProps = {
  files: File[];
  onRemove: (idx: number) => void;
  height?: number;
};

export default function SelectedList({
  files,
  onRemove,
  height = 300,
}: SelectedListProps) {
  return (
    <section
      className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      style={{ height }}
    >
      <div className="h-full flex flex-col p-3">
        <ul className="flex-1 overflow-y-auto space-y-3 pr-1">
          {files.map((f, idx) => (
            <li
              key={`${f.name}-${f.size}-${idx}`}
              className="
                flex items-center justify-between
                rounded-md bg-gray-100
                px-4 py-3
                shadow-sm
                border border-gray-200
              "
              title={`${f.name} (${Math.round(f.size / 1024)} KB)`}
            >
              <span className="truncate text-sm text-gray-700">{f.name}</span>

              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="
                  ml-3 inline-flex items-center justify-center
                  rounded-md p-1.5
                  hover:bg-gray-200 active:bg-gray-300
                "
                aria-label="파일 제거"
                title="제거"
              >
                <TrashIcon className="h-4 w-4 text-gray-600" />
              </button>
            </li>
          ))}
        </ul>

        <div className="h-1 shrink-0" />
      </div>
    </section>
  );
}
