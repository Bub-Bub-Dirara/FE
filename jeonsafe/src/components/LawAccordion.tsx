import { useState } from "react";
import type { LawWithArticles } from "../types/law";

type Props = { laws: LawWithArticles[] | null };

export default function LawAccordion({ laws }: Props) {
  if (!laws || laws.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        추천할 법령 조항이 아직 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {laws.map((law) => (
        <LawBlock key={law.lawId ?? law.lawName} law={law} />
      ))}
    </div>
  );
}

function LawBlock({ law }: { law: LawWithArticles }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
      >
        <div className="font-semibold">{law.lawName}</div>
        <span className="text-gray-500">{open ? "▾" : "▸"}</span>
      </button>

      {open && law.articles?.length > 0 && (
        <div className="p-3 space-y-3">
          {law.articles.map((a, idx) => (
            <ArticleItem
              key={a.key ?? `${law.lawId}-${a.number ?? idx}`}
              article={a}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type Article = LawWithArticles["articles"][number];

function ArticleItem({ article }: { article: Article }) {
  const [fullOpen, setFullOpen] = useState(false);

  // 백엔드에서 number가 없거나 "undefined"로 올 수도 있으니 방어적으로 처리
  const rawNumber =
    article.number && article.number !== "undefined"
      ? String(article.number)
      : "";

  // "제11조", "11", "11조" 어떤 형식이 와도 깔끔하게 정리
  const cleanedNumber = rawNumber
    .replace(/^제/, "")
    .replace(/조$/, "")
    .trim();

  const numberLabel = cleanedNumber ? `제${cleanedNumber}조` : "";

  // 제목 우선순위: title > (제n조) > "관련 조항"
  const displayTitle =
    article.title && article.title.trim().length > 0
      ? article.title
      : numberLabel || "관련 조항";

  const fullText = article.text?.trim();
  const hasText = !!fullText;

  const preview = hasText
    ? fullText!.slice(0, 200)
    : "전문 보기로 확인하세요.";

  return (
    <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4">
      <div className="font-semibold text-blue-900">{displayTitle}</div>
      <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
        {fullOpen
          ? fullText || "(내용 없음)"
          : preview + (hasText && fullText!.length > 200 ? "…" : "")}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {hasText && (
          <button
            type="button"
            onClick={() => setFullOpen((v) => !v)}
            className="px-3 py-1 rounded-md text-sm bg-white border hover:bg-gray-50"
          >
            {fullOpen ? "접기" : "전문 보기"}
          </button>
        )}
      </div>
    </div>
  );
}
