type Props = {
  page: number;
  totalPages: number;
  suffix?: string;
  onChange: (nextPage: number) => void;
  textClassName?: string;
};

export default function PdfPageNavigator({
  page,
  totalPages,
  suffix = "페이지",
  onChange,
  textClassName,
}: Props) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const handlePrev = () => {
    if (!canPrev) return;
    onChange(page - 1);
  };

  const handleNext = () => {
    if (!canNext) return;
    onChange(page + 1);
  };

  const spanCls =
    textClassName ?? "text-xs text-gray-700 tabular-nums";

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={handlePrev}
        disabled={!canPrev}
        className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
          canPrev ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
        }`}
      >
        ‹
      </button>
      <span className={spanCls}>
        {page} / {totalPages}
        {suffix}
      </span>
      <button
        onClick={handleNext}
        disabled={!canNext}
        className={`w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 shadow-sm ${
          canNext ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed"
        }`}
      >
        ›
      </button>
    </div>
  );
}