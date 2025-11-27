// src/lib/pdfHighlights.ts
import type { RiskySentence, RiskLabel, ExtractRisksItem } from "../lib/extractRisks";

export type PdfHighlight = {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  pageWidth: number;
  pageHeight: number;
  color: string;
  reason: string;
  index: number;
  sentence: string;
};

export const RISK_HIGHLIGHT_COLOR: Record<RiskLabel, string> = {
  G: "rgba(34,197,94,0.25)",   // good(저위험) – 초록
  M: "rgba(245,158,11,0.25)",  // medium – 노랑
  B: "rgba(248,113,113,0.25)", // bad(고위험) – 빨강
};

/** RiskPage: risky_sentences 배열 → PdfViewer용 하이라이트 */
export function makePdfHighlightsFromRiskySentences(
  riskySentences: RiskySentence[],
): PdfHighlight[] {
  return riskySentences.flatMap((r, idx) =>
    (r.positions ?? []).map((p) => ({
      page: p.page,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
      pageWidth: p.page_width,
      pageHeight: p.page_height,
      color: RISK_HIGHLIGHT_COLOR[r.risk_label],
      reason: r.reason,
      index: idx,
      sentence: r.sentence,
    })),
  );
}

/** Mapping/Simulate: ExtractRisksItem 전체에서 하이라이트 뽑기 */
export function makePdfHighlightsFromExtractItem(
  item?: ExtractRisksItem | null,
): PdfHighlight[] {
  if (!item) return [];
  return makePdfHighlightsFromRiskySentences(item.risky_sentences ?? []);
}
