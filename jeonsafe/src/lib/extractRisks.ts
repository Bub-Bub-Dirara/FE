import axios from "axios";
import { http } from "./http";

export type RiskLabel = "G" | "M" | "B";

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
  reason: string;
  risk_label: RiskLabel;
  law_input?: string;
  case_input?: string;
  positions?: RiskPosition[];
};

export type ExtractRisksItem = {
  fileurl: string;
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