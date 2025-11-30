/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Doc } from "../types/doc";
import { toKorRiskLabel } from "../lib/riskLabel";

type Props = {
  activeDoc: Doc | null;
  analysisById: Record<string, any>;
};

export default function AISummarySection({ activeDoc, analysisById }: Props) {
  return (
    <section className="w-full max-w-3xl mx-auto space-y-4 mb-6">
      <h2 className="text-xl font-bold mb-1 text-[#113F67] ml-3">
        AI 분석 요약
      </h2>

      {!activeDoc ? (
        <p className="text-sm text-gray-500">
          선택된 문서가 없습니다. 좌측에서 문서를 선택해 주세요.
        </p>
      ) : (
        <div className="space-y-4">
          {(() => {
            const id = String(activeDoc.id);
            const analysis = analysisById[id];

            const lawInput = analysis?.law_input;
            const caseInput = analysis?.case_input;
            const ratingRaw = analysis?.rating?.label as string | undefined;
            const ratingKor = toKorRiskLabel(ratingRaw);
            const reasons = (analysis?.rating?.reasons ?? []) as string[];

            return (
              <div
                key={id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-gray-800">
                    {activeDoc.name}
                  </div>
                  {ratingKor && (
                    <span className="inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5 text-[11px] text-gray-700">
                      위험도: {ratingKor}
                    </span>
                  )}
                </div>

                {lawInput && (
                  <div className="mt-2 text-xs text-gray-700">
                    <span className="font-semibold text-[#113F67]">
                      법령 관점 분석:&nbsp;
                    </span>
                    {lawInput}
                  </div>
                )}

                {caseInput && (
                  <div className="mt-1 text-xs text-gray-700">
                    <span className="font-semibold text-[#113F67]">
                      판례 관점 분석:&nbsp;
                    </span>
                    {caseInput}
                  </div>
                )}

                {reasons.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-[11px] text-gray-600">
                    {reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}

                {!analysis && (
                  <p className="mt-2 text-[11px] text-gray-400">
                    이 파일에 대한 AI 분석 결과가 아직 없습니다.
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}
