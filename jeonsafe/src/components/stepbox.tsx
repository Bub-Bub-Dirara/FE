interface StepBoxProps {
    text: string;
    selected: boolean;
    used: boolean;
    onClick: () => void;
    className?: string;
}

const StepBox = ({ text, selected, used, onClick, className }: StepBoxProps) => {
    
    return (
        <>
            <button onClick={onClick} className={`flex items-center justify-center text-lg rounded-r-full w-140 h-10 drop-shadow-md mt-8
                ${selected ? "bg-[#113F67] text-white" : used===true? "bg-[#EAEFF3] text-[#34699A]" : "bg-[#EAEFF3] text-white"} ${className}`}>
                {text}
            </button>
        </>
    )
}

export default StepBox;