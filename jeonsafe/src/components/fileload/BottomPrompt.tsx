import { PlusIcon } from "@heroicons/react/24/outline";

type BottomPromptProps = { onPick: () => void };

export default function BottomPrompt({ onPick }: BottomPromptProps) {
  return (
    <section className="w-full">
      <div className="mt-2 flex items-center justify-between gap-4 px-6 sm:px-8 py-3 bg-gray-100 rounded-md">
        <div className="text-sm text-gray-400">사진, 파일을 업로드 하세요.</div>
        <button
          type="button"
          onClick={onPick}
          className="inline-flex items-center justify-center border-2 border-black p-[2px] rounded-[4px] hover:bg-gray-200 active:bg-gray-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black"
          aria-label="파일 추가"
        >
          <PlusIcon className="h-4 w-4 text-black" strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
}
