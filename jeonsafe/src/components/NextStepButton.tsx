import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

type NextStepButtonProps = {
  to: string;          // 이동할 경로
  disabled?: boolean;  // 비활성화 여부
  label?: string;
};

export default function NextStepButton({
  to,
  disabled = false,
  label = "다음 단계로 넘어갈까요?",
}: NextStepButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (disabled) return;
    navigate(to);
  };

  return (
    <footer className="fixed  bottom-0 w-full bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-gray-200">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex justify-center py-6">
          <button
            onClick={handleClick}
            disabled={disabled}
            className={`group inline-flex items-center gap-2 rounded-full px-8 py-3 font-semibold transition
              ${
                disabled
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed opacity-60 pointer-events-none"
                  : "bg-[#113F67] text-white hover:bg-[#0f3456] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#113F67]"
              }`}
          >
            {label}
            <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}