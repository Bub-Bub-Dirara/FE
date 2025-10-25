interface StepBoxProps {
    text: string;
    selected: boolean;
    used: boolean;
    disabled?: boolean;
    onClick: () => void;
    className?: string;
}

const StepBox = ({ text, selected, used, disabled, onClick, className }: StepBoxProps) => {
    
    const base =
    "flex items-center justify-center text-lg rounded-r-full w-140 h-10 drop-shadow-md mt-8 transition-colors";

    const tone = selected
        ? "bg-[#113F67] text-white"
        : used
        ? "bg-[#EAEFF3] text-[#34699A]"
        : "bg-[#EAEFF3] text-white"

    const state = disabled
        ? "cursor-not-allowed opacity-60 pointer-events-none"
        : "cursor-pointer";

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${tone} ${state} ${className ?? ""}`}
            >
        {text}
        </button>
    );
}

export default StepBox;