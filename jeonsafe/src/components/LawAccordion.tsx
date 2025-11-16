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
              key={a.key ?? `${law.lawId ?? law.lawName}-${a.number ?? idx}`}
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

  // number 가 없거나 "undefined"로 들어오는 경우 방어
  const rawNumber =
    article.number && article.number !== "undefined"
      ? String(article.number)
      : "";

  const cleanedNumber = rawNumber
    .replace(/^제/, "")
    .replace(/조$/, "")
    .trim();

  const numberLabel = cleanedNumber ? `제${cleanedNumber}조` : "";

  // 제목: title > 제n조 > "관련 조항"
  const displayTitle =
    article.title && article.title.trim().length > 0
      ? article.title
      : numberLabel || "관련 조항";

  const fullText = (article.text ?? "").trim();
  const hasText = fullText.length > 0;

  // 프리뷰 길이
  const MAX_PREVIEW = 120;
  const isLong = hasText && fullText.length > MAX_PREVIEW;

  const preview = hasText
    ? isLong
      ? fullText.slice(0, MAX_PREVIEW)
      : fullText
    : "전문 보기로 확인하세요.";

  return (
    <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4">
      <div className="font-semibold text-blue-900">{displayTitle}</div>

      <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
        {fullOpen ? (hasText ? fullText : "(내용 없음)") : preview + (isLong ? "…" : "")}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {/* 실제로 더 보여줄 내용이 있을 때만 버튼 표시 */}
        {isLong && (
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
