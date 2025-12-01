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
        "flex items-center justify-center text-lg rounded-r-full w-140 h-10 mt-8 transition-all";

    const strongShadow = {
        boxShadow:
            "4px 0px 0px 0px rgba(112, 158, 197, 0.64), 0px 0px 0px 0px rgba(0,0,0,0.35)",
    };

    const weakShadow = {
        boxShadow:
            "1px 0px 0px 0px rgba(0,0,0,0.12), 1px 0px 0px 0px rgba(0,0,0,0.12)",
    };

    const shadowStyle = selected ? strongShadow : weakShadow;

    const tone = selected
        ? "bg-[#113F67] text-white"
        : used
        ? "bg-[#EAEFF3] text-[#34699A]"
        : "bg-[#EAEFF3] text-white";

    const state = disabled
        ? "cursor-not-allowed pointer-events-none"
        : "cursor-pointer";

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${tone} ${state} ${className ?? ""}`}
            style={shadowStyle}
        >
            {text}
        </button>
    );
};


export default StepBox;
