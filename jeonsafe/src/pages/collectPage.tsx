import { useEffect } from "react";
import { useProgress } from "../stores/useProgress";

const CollectPage = () => {
    const { setPos } = useProgress();
    useEffect(() => { setPos("post", 0); }, [setPos]);
    return (
        <>
            <h1 className = "text-red-500 font-bold px-4">사후처리!! 1</h1>
        </>
    )
}

export default CollectPage;