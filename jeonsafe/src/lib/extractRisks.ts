// src/lib/extractRisks.ts
import axios from "axios";
import { http } from "./http";

export type RiskLabel = "G" | "M" | "B";

// 백엔드에서 오는 positions 구조 그대로
export type RiskPosition = {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  page_width: number;
  page_height: number;
};

export type RiskySentence = {
  sentence: string;
  anchor?: string;          // 백엔드에서 오는 anchor (있으면 사용)
  reason: string;
  risk_label: RiskLabel;
  law_input?: string;
  case_input?: string;
  positions?: RiskPosition[]; // 👈 좌표 정보 (없을 수도 있어서 optional)
};

export type ExtractRisksItem = {
  fileurl: string;

  // 👇 파일(아이템) 단위 요약 입력들 – optional로 추가
  law_input?: string;
  case_input?: string;

  risky_sentences: RiskySentence[];
};


type ExtractRisksResponse = {
  items: ExtractRisksItem[];
};

export async function extractRisksForUrl(
  url: string,
): Promise<ExtractRisksItem | null> {
  console.log("POST /ai/gpt/extract_risks url =", url);

  try {
    const { data } = await http.post<ExtractRisksResponse>(
      "/ai/gpt/extract_risks",
      {
        urls: [url],
      },
    );

    if (!data.items || data.items.length === 0) return null;
    return data.items[0];
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error(
        "extract_risks error status=",
        e.response?.status,
        "data=",
        e.response?.data,
      );
    } else {
      console.error("extract_risks error", e);
    }
    throw e;
  }
}
