import { useEffect, useRef, useState } from "react";
import { useProgress } from "../stores/useProgress";

import InfoCard from "../components/upload/InfoCard";
import SelectedList from "../components/upload/SelectedList";
import BottomPrompt from "../components/upload/BottomPrompt";
import NextStepButton from "../components/NextStepButton";

export default function UploadPage() {
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

  const infoTitle = "전세사기 피해를 예방하고 싶으신가요?";
  const infoLines = [
    "전세 사기를 예방하기 위해",
    "계약 체결 전 계약서 검토가 필요해요.",
    "계약서를 업로드해주시면 위험 요소를 분석해드릴게요!",
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
