import React from "react";

export type DocType = "pdf" | "image" | "other";
export type Doc = { id: number; name: string; type: DocType; pages: number };

type Props = {
  docs: Doc[];
  activeId: number;
  onSelect: (id: number) => void;
};

const FileIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
    aria-hidden
  >
    <path d="M12 21.5c4.7 0 8.5-3.4 8.5-7.5S16.7 6.5 12 6.5 3.5 9.9 3.5 14c0 1.7.6 3.2 1.7 4.5L4 21l3.8-.7c1.3.8 2.9 1.2 4.2 1.2Z" />
    <line x1="12" y1="9.9" x2="12" y2="13" />
    <circle cx="12" cy="16.3" r="0.2" />
  </svg>
);

const UploadList: React.FC<Props> = ({ docs, activeId, onSelect }) => {
  return (
    <div className="h-full rounded-l-lg rounded-r-none border border-gray-300 bg-white overflow-hidden flex flex-col">
      <div className="px-3 py-2 bg-gray-50 shrink-0">
        <h2 className="text-sm font-semibold text-gray-800">업로드 문서</h2>
      </div>

      <ul className="flex-1 overflow-y-auto overflow-x-hidden">
        {docs.map((doc) => {
          const selected = doc.id === activeId;
          return (
            <li key={doc.id}>
              <button
                type="button"
                className={`w-full px-3 py-2 flex items-center gap-3 text-left transition ${
                  selected ? "bg-gray-100 text-gray-800" : "hover:bg-gray-50 text-gray-700"
                }`}
                onClick={() => onSelect(doc.id)}
              >
                <FileIcon />

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{doc.name}</div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {doc.type.toUpperCase()} • {doc.pages} page{doc.pages > 1 ? "s" : ""}
                  </div>
                </div>

                {selected && (
                  <span className="shrink-0 ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 whitespace-nowrap">
                    선택됨
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default UploadList;
