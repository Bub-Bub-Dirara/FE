type PageNavigatorProps = {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
  suffix?: string;
};

export default function PageNavigator({
  page,
  totalPages,
  onChange,
  suffix = "p",
}: PageNavigatorProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2 text-xs text-gray-700">
        <button
          onClick={() => canPrev && onChange(page - 1)}
          disabled={!canPrev}
          className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
            canPrev ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
          }`}
        >
          ‹
        </button>
        <span className="tabular-nums">
          {page} / {totalPages}
          {suffix}
        </span>
        <button
          onClick={() => canNext && onChange(page + 1)}
          disabled={!canNext}
          className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
            canNext ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
          }`}
        >
          ›
        </button>
      </div>
    </div>
  );
}
