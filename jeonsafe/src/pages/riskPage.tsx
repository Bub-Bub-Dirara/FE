import { useEffect } from "react";
import { useProgress } from "../stores/useProgress";

const RiskPage = () => {
    
    const { setPos } = useProgress();
    useEffect(() => { setPos("pre", 1); }, [setPos]);
    return (
        <>
            <h1 className = "text-red-500 font-bold px-4">사전처리!! 2</h1>
        </>
    )
}

export default RiskPage;