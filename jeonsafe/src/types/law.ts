export type RawArticle = {
  key: string;           // "0194001"
  number: string;        // "194"
  title?: string;        // "간접점유" 같은 조문표제
  text?: string;         // 요약/전문 텍스트(있으면)
  url?: string;          // 해당 조문/법령 원문 링크(있으면)
};

export type RawLaw = {
  lawId: string;         // "001706"
  lawName: string;       // "민법"
  lawUrl?: string;       // 법령 원문(전체) 링크
  articles: RawArticle[];
};

// 화면 표시용
export type LawWithArticles = RawLaw;
