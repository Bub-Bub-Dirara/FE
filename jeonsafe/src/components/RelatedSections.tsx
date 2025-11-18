/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import type { LawWithArticles } from "../types/law";

type CaseItem = {
  id: string;
  name: string;
  court: string;
  date: string;
  summary?: string;
};

type RelatedCasesSectionProps = {
  cases: CaseItem[] | null;
  caseErr: string | null;
};

type RelatedLawsSectionProps = {
  laws: LawWithArticles[] | null;
  lawErr: string | null;
  hasNoLawQuery: boolean;
  isLawLoading: boolean;
};

export function RelatedCasesSection({ cases, caseErr }: RelatedCasesSectionProps) {
  return (
    <section className="w-full max-w-3xl mx-auto space-y-3 mb-6">
      <h2 className="text-xl font-bold mb-1 text-[#113F67] ml-3">관련 판례</h2>

      {caseErr && (
        <p className="text-sm text-red-600">
          관련 판례를 불러오는 중 오류가 발생했습니다: {caseErr}
        </p>
      )}

      {!caseErr && (!cases || cases.length === 0) && (
        <p className="text-sm text-gray-500">
          추천할 판례가 아직 없습니다.
        </p>
      )}

      {cases && cases.length > 0 && <CaseAccordion cases={cases} />}
    </section>
  );
}

export function RelatedLawsSection({
  laws,
  lawErr,
  hasNoLawQuery,
  isLawLoading,
}: RelatedLawsSectionProps) {
  return (
    <section className="w-full max-w-3xl mx-auto mb-6">
      <h2 className="text-xl font-bold mb-1 text-[#113F67] ml-3">관련 법령 조항</h2>

      {lawErr && (
        <p className="text-sm text-red-600">
          관련 법령을 불러오는 중 오류가 발생했습니다: {lawErr}
        </p>
      )}

      {hasNoLawQuery && !lawErr && (
        <p className="text-sm text-gray-500">
          분석 결과에서 추출된 법령 검색어가 없습니다.
        </p>
      )}

      {isLawLoading && (
        <p className="text-sm text-gray-500">
          관련 법령을 불러오는 중입니다…
        </p>
      )}

      {!isLawLoading &&
        !lawErr &&
        laws &&
        laws.length === 0 &&
        !hasNoLawQuery && (
          <p className="text-sm text-gray-500">
            추천할 법령이 없습니다.
          </p>
        )}

      {!isLawLoading && !lawErr && laws && laws.length > 0 && (
        <LawAccordionSimple laws={laws} />
      )}
    </section>
  );
}

function CaseAccordion({ cases }: { cases: CaseItem[] }) {
  return (
    <div className="space-y-4">
      {cases.map((c) => (
        <CaseBlock key={c.id} item={c} />
      ))}
    </div>
  );
}

function CaseBlock({ item }: { item: CaseItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {item.name}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {item.court} · {item.date}
          </div>
        </div>
        <span className="ml-4 text-[11px] text-gray-400">
          {open ? "접기" : "자세히"}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          {item.summary ? (
            <p className="whitespace-pre-wrap text-xs text-gray-700">
              {item.summary}
            </p>
          ) : (
            <p className="text-xs text-gray-400">요약 정보가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}

function LawAccordionSimple({ laws }: { laws: LawWithArticles[] }) {
  return (
    <div className="space-y-4">
      {laws.map((law) => (
        <LawBlock key={law.lawId ?? law.lawName} law={law} />
      ))}
    </div>
  );
}

function LawBlock({ law }: { law: LawWithArticles }) {
  const [open, setOpen] = useState(false);

  const articles = ((law.articles ?? []) as any[]) || [];

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {law.lawName || law.lawId}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {articles.length > 0
              ? `${articles.length}개 조항`
              : "조문 정보 없음"}
          </div>
        </div>
        <span className="ml-4 text-[11px] text-gray-400">
          {open ? "접기" : "자세히"}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
          {articles.length === 0 && (
            <p className="text-xs text-gray-400">표시할 조문이 없습니다.</p>
          )}

          {articles.map((a) => {
            const key = a.key ?? a.number ?? a.title;
            const title = a.title || a.number;
            const text = a.text ?? a.content ?? "";

            return (
              <div
                key={key}
                className="rounded-xl bg-white px-3 py-2 shadow-sm border border-gray-100"
              >
                {title && (
                  <div className="text-xs font-semibold text-gray-900">
                    {title}
                  </div>
                )}
                {text && (
                  <p className="mt-1 text-[11px] text-gray-700 whitespace-pre-wrap">
                    {text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
