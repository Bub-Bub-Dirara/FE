import { useEffect } from "react";
import { useProgress } from "../stores/useProgress";

const UploadPage = () => {
    const { setPos } = useProgress();
    useEffect(() => { setPos("pre", 0); }, [setPos]);
    return (
        <>
            <h1 className = "text-red-500 font-bold px-4">사전처리!! 1</h1>
        </>
    )
}

export default UploadPage;