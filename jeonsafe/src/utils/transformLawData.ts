// ----원본 조문 타입 ----
export type RawLawItem = {
  법령명한글: string;
  법령ID: string;
  조문번호: string;
  조문가지번호: string;
  조문제목: string;
  조문상세링크: string;
  matchedKeywords: string[];
  content: string; 
  조문시행일자: string;
  조문키: string;
  detailTarget: string;
};

// ---- FE에서 표시용 타입 ----
export type LawWithArticles = {
  lawId: string;
  lawName: string;
  lawUrl: string;
  articles: {
    key: string;
    number: string;
    title: string;
    text: string;
    url: string;
    matchedKeywords: string[];
    effectiveDate?: string;
  }[];
};

const buildNumber = (num: string, branch?: string) =>
  branch && branch.trim() !== "" ? `제${num}-${branch}조` : `제${num}조`;

export function convertOnly(raw: RawLawItem[]): LawWithArticles[] {
  const grouped = new Map<string, LawWithArticles>();

  for (const item of raw) {
    const lawId = item.법령ID;
    let law = grouped.get(lawId);

    if (!law) {
      law = {
        lawId,
        lawName: item.법령명한글,
        lawUrl: `https://www.law.go.kr/법령/${item.법령명한글}`,
        articles: [],
      };
      grouped.set(lawId, law);
    }

    law.articles.push({
      key: item.조문키,
      number: buildNumber(item.조문번호, item.조문가지번호),
      title: item.조문제목,
      text: item.content,
      url: item.조문상세링크,
      matchedKeywords: item.matchedKeywords || [],
      effectiveDate: item.조문시행일자,
    });
  }

  const result = Array.from(grouped.values());
  for (const law of result) {
    law.articles.sort((a, b) => a.number.localeCompare(b.number, "ko"));
  }
  result.sort((a, b) => a.lawName.localeCompare(b.lawName, "ko"));
  return result;
}
