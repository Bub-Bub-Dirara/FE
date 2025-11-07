import { useNavigate } from "react-router-dom";
import { useAuth } from "../stores/useAuth";
import { useUI } from "../stores/ui";

interface HomeBoxProps {
    section:string;
    introduce:string;
    to: string
}

const HomeBox = ({section,introduce,to}:HomeBoxProps) => {

    const navigate = useNavigate();
    const { isAuthed } = useAuth();
    const { openChat } = useUI();

    const handleClick = () => {
        if (!isAuthed) {
        openChat();
        return;
        }
        navigate(to);
    };

    return (
        <div className="w-[420px] h-[260px] box-border p-10
                    bg-[#E3ECF5] border border-[#113F67]/50 shadow-[3px_3px_0_0_#113F67]/20
                    flex flex-col justify-between">
            <div className="text-left">
                <h2 className="mt-2 text-[28px] font-bold text-black">{section}</h2>
                <p className="mt-5 text-[20px] text-gray-700">{introduce}</p>
            </div>
            <div className="flex justify-start md:justify-end">
                <button onClick={handleClick} className="mt-4 px-4 py-2 rounded bg-[#113F67] text-white hover:bg-[#0e3355]">
                    Get Started
                </button>
            </div>
        </div>
    )
}

export default HomeBox;