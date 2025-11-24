import { useState } from "react";
import { ArrowPathIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

type Props = {
  onGenerate: (title: string) => Promise<void> | void;
  initialTitle?: string;
  requireTitle?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  onReset?: () => void; // ← 이걸 "기록 보러가기" 용도로 사용
};

export default function ReportButton({
  onGenerate,
  onReset,
  disabled = false,
  label = "리포트 저장",
}: Props) {
  const [loading, setLoading] = useState(false);

  const finalDisabled = disabled || loading;

  const handleClick = async () => {
    if (finalDisabled) return;
    try {
      setLoading(true);
      await onGenerate("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-gray-200">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex flex-col items-center gap-2 py-6">
          {/* 메인 버튼 + 기록 보러가기 버튼 */}
          <div className="flex w-full max-w-2xl items-center justify-center gap-3">
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

            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center justify-center rounded-full border border-[#113F67] px-5 py-2 text-sm font-medium text-[#113F67] hover:bg-[#113F67]/5 transition-all"
              >
                기록 보러가기
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
