import { useEffect } from "react";
import { useProgress } from "../stores/useProgress";

const ClassifyPage = () => {
    const { setPos } = useProgress();
    useEffect(() => { setPos("post", 1); }, [setPos]);
    return (
        <>
            <h1 className = "text-red-500 font-bold px-4">사후처리!! 2</h1>
        </>
    )
}

export default ClassifyPage;