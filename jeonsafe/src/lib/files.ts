import { http } from "./http";
import type { FileRecord } from "../types/file";

/** presigned GET URL 요청 */
export async function getDownloadUrl(id: number): Promise<string> {
  const { data } = await http.get<string>(`/be/api/files/${id}/download-url`);
  return data;
}

/** 항상 presigned만 사용 — s3_url 무시 */
export async function resolveViewUrl(file: FileRecord): Promise<string> {
  return await getDownloadUrl(file.id);
}
