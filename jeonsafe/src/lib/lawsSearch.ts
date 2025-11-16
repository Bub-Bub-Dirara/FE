// src/lib/lawsSearch.ts
import { http } from "./http";

export type LawSearchItem = {
  id: string;
  title: string;
  body: string;
};

export type CaseSearchItem = {
  id: string;
  title: string;
  body: string;
};

type LawsSearchResponse = {
  items?: any[];
};

type CasesSearchResponse = {
  items?: any[];
};

// 🔹 법령 검색: GET /ai/laws/search?q=...
export async function searchLaws(q: string): Promise<LawSearchItem[]> {
  const { data } = await http.get<LawsSearchResponse>("/ai/laws/search", {
    params: {
      q,        // ✅ Swagger에 나온 q 파라미터
      // 필요하면 k, min_score 도 여기서 같이 넘겨줄 수 있음
      // k: 5,
      // min_score: 0.05,
    },
  });

  return (data.items ?? []).map((raw: any, idx: number): LawSearchItem => ({
    id:
      raw.id ||
      raw.law_id ||
      raw.law_no ||
      raw.article_no ||
      String(idx + 1),
    title: raw.title || raw.law_name || "관련 법령",
    body:
      raw.body_html ||
      raw.snippet_html ||
      raw.snippet ||
      raw.text ||
      "",
  }));
}

// 🔹 판례 검색: GET /ai/cases/search?q=...
export async function searchCases(q: string): Promise<CaseSearchItem[]> {
  const { data } = await http.get<CasesSearchResponse>("/ai/cases/search", {
    params: {
      q,           // ✅ Swagger에 나온 q 파라미터
      // k: 5,
      // with_summary: true,
      // with_body: false,
    },
  });

  return (data.items ?? []).map((raw: any, idx: number): CaseSearchItem => ({
    id: raw.id || raw.case_no || raw.case_id || String(idx + 1),
    title: raw.title || raw.case_name || "관련 판례",
    body:
      raw.body_html ||
      raw.snippet_html ||
      raw.snippet ||
      raw.summary ||
      "",
  }));
}
