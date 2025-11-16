// src/types/risk.ts
export type RiskLabel = "B" | "M" | "G"; // 높음/중간/낮음 코드

export type RiskySentence = {
  id: string;                 // "파일id-0" 이런 식
  fileId: string;             // 업로드 스토어에서 사용하는 파일 id
  fileurl: string;            // S3 presigned url
  page: number;               // 페이지 번호
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  sentence: string;
  reason: string;
  riskLabel: RiskLabel;
  lawInput?: string;
  caseInput?: string;
};
