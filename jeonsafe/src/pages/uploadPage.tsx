import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import InfoCard from "../components/fileload/InfoCard";
import SelectedList from "../components/fileload/SelectedList";
import BottomPrompt from "../components/fileload/BottomPrompt";
import NextStepButton from "../components/NextStepButton";

import { uploadManyViaApi } from "../lib/uploader";
import type { FileRecord } from "../types/file";
import { useUploadStore } from "../stores/useUploadStore";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const setUploaded = useUploadStore((s) => s.setUploaded);

  const onPick = () => fileInputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (list.length) setFiles((prev) => [...prev, ...list]);
    e.currentTarget.value = "";
  };

  const onRemove = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const onBeforeNavigate = async (): Promise<boolean> => {
    if (files.length === 0) return false;
    setBusy(true);

    try {
      const uploaded: FileRecord[] = await uploadManyViaApi(
        files,
        "contract",
      );
      setUploaded(uploaded);

      navigate("/pre/risk");
      return true;
    } catch (err) {
      console.error(err);
      alert("업로드 중 오류가 발생했습니다. (Network/Server)");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-8 flex flex-col items-center gap-4">
          {files.length === 0 ? (
            <InfoCard
              title="계약서 파일을 업로드해주세요"
              lines={[
                "전세 사기 피해에 대한 손해 배상을 받기 위해서는",
                "피해를 증빙할 적절한 자료들이 필요해요.",
                "계약서, 문자 내역, 입금 내역 등 다양한 파일을 업로드 하시면",
                "증명 자료 적절성 판단 및 추가 자료 요청을 드릴게요!",
              ]}
            />
          ) : (
            <SelectedList files={files} onRemove={onRemove} height={300} />
          )}

          <BottomPrompt onPick={onPick} />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png"
            className="hidden"
            onChange={onChange}
          />
        </div>
      </main>

      <NextStepButton
        to="/pre/risk"
        label={busy ? "업로드 중..." : "다음 단계로"}
        disabled={busy || files.length === 0}
        onBeforeNavigate={onBeforeNavigate}
      />
    </div>
  );
}