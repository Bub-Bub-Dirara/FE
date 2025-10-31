// components/TwoPaneViewer.tsx
import React, { type PropsWithChildren } from "react";

const PANEL_H = 435;
export const VIEW_W = 700;
export const VIEW_H = 340;

type RightHeader = {
  title: string;
  action?: React.ReactNode; //나중에 db 불러오면 삭제!
};

type Props = PropsWithChildren<{
  left: React.ReactNode;         // 좌측 리스트(DocList)
  rightHeader: RightHeader;      // 우측 상단 바
  rightFooter?: React.ReactNode; // 페이지 네비/버튼 등
}>;

export default function TwoPaneViewer({
  left,
  rightHeader,
  rightFooter,
  children,
}: Props) {
  return (
    <div
      className="mx-auto max-w-5xl grid grid-cols-[240px_minmax(0,1fr)] gap-0 items-stretch"
      style={{ height: PANEL_H }}
    >
      <div className="h-full overflow-y-auto overflow-x-hidden">{left}</div>

      <div className="h-full rounded-r-lg rounded-l-none border border-gray-300 border-l-0 bg-white flex flex-col overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-gray-800 truncate">
            {rightHeader.title}
          </h2>
          {rightHeader.action && <div className="shrink-0">{rightHeader.action}</div>}
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div
            className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-y-auto overflow-x-hidden"
            style={{ width: VIEW_W, height: VIEW_H }}
          >
            <div className="p-4">{children}</div>
          </div>
        </div>

        {rightFooter && <div className="py-2 bg-white shrink-0">{rightFooter}</div>}
      </div>
    </div>
  );
}
