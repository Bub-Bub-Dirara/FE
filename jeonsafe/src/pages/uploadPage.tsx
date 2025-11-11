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
  const [progress, setProgress] = useState<Record<string, number>>({});
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
    setProgress({});

    try {
      const uploaded: FileRecord[] = await uploadManyViaApi(
        files,
        "contract",
        (name, pct) => setProgress((m) => ({ ...m, [name]: pct }))
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
                "PDF, 이미지 등 계약 관련 자료를 등록하면 전세 사기 위험도를 분석할 수 있습니다.",
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
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={onChange}
          />

          {Object.keys(progress).length > 0 && (
            <div className="mt-4 w-full max-w-2xl text-sm text-gray-600">
              {files.map((f) => (
                <div key={f.name} className="flex justify-between py-1">
                  <span className="truncate">{f.name}</span>
                  <span>{progress[f.name] ?? 0}%</span>
                </div>
              ))}
            </div>
          )}
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