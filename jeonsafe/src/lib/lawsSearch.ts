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

export async function searchLaws(query: string): Promise<LawSearchItem[]> {
  const { data } = await http.post<LawsSearchResponse>("/ai/laws/search", {
    query,
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

export async function searchCases(query: string): Promise<CaseSearchItem[]> {
  const { data } = await http.post<CasesSearchResponse>("/ai/cases/search", {
    query,
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
