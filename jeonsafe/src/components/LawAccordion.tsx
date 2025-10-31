import { useState } from "react";
import type { LawWithArticles } from "../types/law";

type Props = { laws: LawWithArticles[] };

export default function LawAccordion({ laws }: Props) {
  return (
    <div className="space-y-4">
      {laws.map((law) => (
        <LawBlock key={law.lawId} law={law} />
      ))}
    </div>
  );
}

function LawBlock({ law }: { law: LawWithArticles }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
      >
        <div className="font-semibold">{law.lawName}</div>
        <span className="text-gray-500">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="p-3 space-y-3">
          {law.articles.map((a) => (
            <ArticleItem key={a.key} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleItem({ article }: { article: LawWithArticles["articles"][number] }) {
  const [fullOpen, setFullOpen] = useState(false);

  const displayTitle = `${article.number}. ${article.title ?? ""}`.trim();
  const preview = article.text?.slice(0, 200) ?? "전문 보기로 확인하세요.";

  return (
    <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4">
      <div className="font-semibold text-blue-900">{displayTitle}</div>
      <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
        {fullOpen
          ? article.text ?? "(내용 없음)"
          : preview + (article.text && article.text.length > 200 ? "…" : "")}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {article.text && (
          <button
            onClick={() => setFullOpen((v) => !v)}
            className="px-3 py-1 rounded-md text-sm bg-white border hover:bg-gray-50"
          >
            {fullOpen ? "접기" : "전문 보기"}
          </button>
        )}

        {/* 원문 링크(모달) 기능은 추후 활성화 예정 */}
        {/*
        {article.url && (
          <>
            <button
              onClick={() => setModalOpen(true)}
              className="px-3 py-1 rounded-md text-sm bg-indigo-600 text-white hover:bg-indigo-700"
            >
              링크 원문 열기
            </button>
          </>
        )}
        */}
      </div>
    </div>
  );
}
