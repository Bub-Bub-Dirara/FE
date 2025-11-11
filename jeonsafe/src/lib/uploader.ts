import { http } from "./http";
import type { FileRecord } from "../types/file";

export async function uploadFileViaApi(
  file: File,
  category: FileRecord["category"],
  onProgress?: (pct: number) => void
): Promise<FileRecord> {
  const form = new FormData();
  form.append("category", category);
  form.append("file", file, file.name);

  const { data, status } = await http.post<FileRecord>("/be/api/files", form, {
    onUploadProgress: (evt) => {
      if (!evt.total || !onProgress) return;
      onProgress(Math.round((evt.loaded * 100) / evt.total));
    },
  });

  if (status !== 201 && status !== 200) {
    throw new Error(`Upload failed: HTTP ${status}`);
  }
  return data;
}

/** 여러 파일 업로드(병렬) */
export async function uploadManyViaApi(
  files: File[],
  category: FileRecord["category"],
  onEachProgress?: (name: string, pct: number) => void
): Promise<FileRecord[]> {
  return Promise.all(
    files.map((f) =>
      uploadFileViaApi(f, category, (p) => onEachProgress?.(f.name, p))
    )
  );
}
