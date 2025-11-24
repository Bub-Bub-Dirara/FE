import { useState } from "react";
import { ArrowPathIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

type Props = {
  onGenerate: (title: string) => Promise<void> | void;
  onReset: () => void;
  disabled?: boolean;
  label?: string;
};

export default function ReportButton({
  onGenerate,
  onReset,
  disabled = false,
  label = "리포트 저장",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const finalDisabled = disabled || loading;

  const handleClickSave = async () => {
    if (finalDisabled) return;
    try {
      setLoading(true);
      await onGenerate("");
      setHasSaved(true);
    } catch (e) {
      console.error(e);
      window.alert("리포트 저장 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleClickRecords = () => {
    if (!hasSaved) {
      window.alert("먼저 리포트를 저장해 주세요.\n리포트 저장 후에 기록을 볼 수 있습니다.");
      return;
    }
    onReset();
  };

  return (
    <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-gray-200">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex flex-col items-center gap-2 py-6">

          <div className="flex gap-4 items-center">
            <button
              onClick={handleClickSave}
              disabled={finalDisabled}
              className={`
                inline-flex items-center justify-center gap-2
                px-8 py-3 text-base font-semibold
                bg-[#113F67] text-white
                rounded-full shadow-md
                transition-all
                ${finalDisabled ? "opacity-60 cursor-not-allowed" : "hover:bg-[#0f3456] cursor-pointer"}
              `}
            >
              <DocumentTextIcon className="h-5 w-5" />
              {label}
              {loading && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
            </button>

            <button
              type="button"
              onClick={handleClickRecords}
              className={`
                inline-flex items-center justify-center
                px-8 py-3 text-base font-medium
                bg-white text-[#113F67]
                rounded-full shadow-md
                transition-all
                ${hasSaved ? "hover:bg-[#EAEFF3] cursor-pointer" : "cursor-not-allowed"}
              `}
            >
              기록 보러가기
            </button>
          </div>

        </div>
      </div>
    </footer>
  );
}
