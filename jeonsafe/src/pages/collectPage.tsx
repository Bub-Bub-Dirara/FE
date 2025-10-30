import { useEffect, useRef, useState } from "react";
import { useProgress } from "../stores/useProgress";

import InfoCard from "../components/fileload/InfoCard";
import SelectedList from "../components/fileload/SelectedList";
import BottomPrompt from "../components/fileload/BottomPrompt";
import NextStepButton from "../components/NextStepButton";

export default function CollectPage() {
  const { setPos } = useProgress();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    setPos("pre", 0);
  }, [setPos]);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = e.target.files ? Array.from(e.target.files) : [];
    if (incoming.length === 0) return;
    setFiles((prev) => [...prev, ...incoming]);
    e.currentTarget.value = "";
  };

  const handleRemove = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const infoTitle = "전세사기 피해를 당하셨나요?";
  const infoLines = [
    "전세 사기 피해에 대한 손해 배상을 받기 위해서는",
    "피해를 증빙할 적절한 자료들이 필요해요.",
    "계약서, 문자 내역, 입금 내역 등 다양한 파일을 업로드 하시면",
    "증명 자료 적절성 판단 및 추가 자료 요청을 드릴게요!",
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-8 flex flex-col items-center gap-4">
          {files.length === 0 ? (
            <InfoCard title={infoTitle} lines={infoLines} />
          ) : (
            <SelectedList files={files} onRemove={handleRemove} height={300} />
          )}

          <BottomPrompt onPick={handlePickFile} />

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.heic,.doc,.docx"
            multiple
            onChange={handleChange}
          />
        </div>
      </main>

      <NextStepButton to="/pre/risk" disabled={files.length === 0} />
    </div>
  );
}