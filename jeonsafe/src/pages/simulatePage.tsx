import { useEffect } from "react";
import { useProgress } from "../stores/useProgress";

const SimulatePage = () => {
    const { setPos } = useProgress();
    useEffect(() => { setPos("post", 2); }, [setPos]);
    return (
        <>
            <h1 className = "text-red-500 font-bold px-4">사후처리!! 3</h1>
        </>
    )
}

export default SimulatePage;