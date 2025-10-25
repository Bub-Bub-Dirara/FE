import { useEffect } from "react";
import { useProgress } from "../stores/useProgress";
import { PlusIcon } from "@heroicons/react/24/outline";

const UploadPage = () => {
  const { setPos } = useProgress();
  useEffect(() => {
    setPos("pre", 0);
  }, [setPos]);

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-white">
      {/* 상단 안내 문구 */}
      <div className="mt-20 text-center">
        <h2 className="text-xl font-semibold text-gray-800">
          전세사기 피해를 예방하고 싶으신가요?
        </h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          전세 사기를 예방하기 위해
          <br />
          계약 체결 전 계약서 검토가 필요해요.
          <br />
          계약서를 업로드해주시면 위험 요소를 분석해드릴게요!
        </p>
      </div>

      {/* 업로드 박스 */}
      <div className="w-[600px] h-[180px] mt-12 border-2 border-gray-200 rounded-xl flex flex-col items-center justify-center bg-gray-50">
        <p className="text-gray-400 mb-3">사진, 파일을 업로드 하세요.</p>
        <button className="border border-gray-300 rounded-full p-2 hover:bg-gray-100 transition">
          <PlusIcon className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* 다음 단계 버튼 */}
      <div className="w-full flex justify-center mb-12">
        <button className="bg-[#113F67] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#0f3456] transition">
          다음 단계로 넘어갈까요? ➜
        </button>
      </div>
    </div>
  );
};

export default UploadPage;
