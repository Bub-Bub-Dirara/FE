import axios from "axios";
import { http } from "./http";
import { resolveViewUrl } from "./files";
import type { FileRecord } from "../types/file";
import type { BucketKey } from "../types/evidence";

export type RatingLabel = "G" | "M" | "B";

export type AnalyzeItem = {
  fileurl: string;
  mime: string;
  modality: "pdf" | "image" | "other";
  kind: BucketKey;
  law_input: string;
  case_input: string;
  rating: {
    label: RatingLabel;
    reasons: string[];
  };
};

type AnalyzeResponse = {
  items: AnalyzeItem[];
};

export async function analyzeFilesWithGpt(
  files: FileRecord[],
): Promise<AnalyzeItem[]> {
  if (files.length === 0) return [];

  const urls: string[] = [];

  for (const f of files) {
    const raw = (await resolveViewUrl(f)) as unknown;

    let url: string;
    if (typeof raw === "string") {
      url = raw;
    } else if (
      raw &&
      typeof raw === "object" &&
      "url" in (raw as Record<string, unknown>) &&
      typeof (raw as { url: unknown }).url === "string"
    ) {
      url = (raw as { url: string }).url;
    } else {
      console.error(" invalid download-url response:", raw);
      continue;
    }

    urls.push(url);
  }

  if (urls.length === 0) {
    console.warn("analyzeFilesWithGpt: urls가 비어서 호출하지 않음");
    return [];
  }

  console.log("POST /ai/gpt/analyze urls =", urls);

  try {
    const { data } = await http.post<AnalyzeResponse>("/ai/gpt/analyze", {
      urls,
    });

    const items = data.items ?? [];
    return items.slice(0, files.length);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error(
        "analyze error status=",
        e.response?.status,
        "data=",
        e.response?.data,
      );
    } else {
      console.error("analyze error", e);
    }
    throw e;
  }
}
