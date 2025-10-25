import { useEffect } from "react";
import { useProgress } from "../stores/useProgress";

const MappingPage = () => {
    const { setPos } = useProgress();
    useEffect(() => { setPos("pre", 2); }, [setPos]);
    return (
        <>
            <h1 className = "text-red-500 font-bold px-4">사전처리!! 3</h1>
        </>
    )
}

export default MappingPage;