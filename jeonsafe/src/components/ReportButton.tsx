import { useState } from "react";
import { ArrowPathIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

type Props = {
  onGenerate: (title: string) => Promise<void> | void;
  initialTitle?: string;
  requireTitle?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  onReset?: () => void;
};

export default function ReportButton({
  onGenerate,
  onReset,
  initialTitle = "",
  requireTitle = true,
  disabled = false,
  label = "기록 저장",
  placeholder = "기록의 제목을 적어주세요.",
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [loading, setLoading] = useState(false);

  const finalDisabled = disabled || loading || (requireTitle && title.trim().length === 0);

  const handleClick = async () => {
    if (finalDisabled) return;
    try {
      setLoading(true);
      await onGenerate(title.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-gray-200">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex flex-col items-center gap-2 py-6">
          {/* 입력 + 버튼 */}
          <div className="flex w-full max-w-2xl items-center justify-center gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-full bg-gray-100 px-6 py-3 text-gray-800 placeholder:text-gray-400 outline-none ring-1 ring-transparent focus:ring-[#113F67]/30"
            />
            <button
              onClick={handleClick}
              disabled={finalDisabled}
              className={`group inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 font-semibold text-base transition-all
                ${
                  finalDisabled
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed opacity-60 pointer-events-none"
                    : "bg-[#113F67] text-white hover:bg-[#0f3456] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#113F67]"
                }`}
              style={{ minWidth: "140px" }}
            >
              <DocumentTextIcon className="h-5 w-5" />
              <span className="whitespace-nowrap">{label}</span>
              {loading && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
            </button>
          </div>

          {/* 처음부터 다시 하기 */}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-sm text-[#113F67] underline underline-offset-4 hover:opacity-80"
            >
              처음부터 다시 하기
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
