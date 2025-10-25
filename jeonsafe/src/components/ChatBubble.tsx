type Props = {
  open: boolean;
  onClose: () => void;
  anchor?: "bottom-left" | "bottom-right" | "sidebar-top";
};

export default function ChatBubble({ open, onClose, anchor = "bottom-left" }: Props) {
  if (!open) return null;

  let pos = "";
  let arrow = "";
  if (anchor === "bottom-left") {
    pos = "left-16 bottom-20";
    arrow = "absolute -bottom-3 left-4 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-white";
  } else if (anchor === "bottom-right") {
    pos = "right-16 bottom-20";
    arrow = "absolute -bottom-3 right-4 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-white";
  } else if (anchor === "sidebar-top") {
    pos = "top-14 left-[72px]";
    arrow = "absolute left-[-10px] top-6 w-0 h-0 border-t-[10px] border-b-[10px] border-r-[12px] border-t-transparent border-b-transparent border-r-white";
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0" onClick={onClose} />

      <div className={`absolute ${pos} w-[340px] rounded-2xl bg-white shadow-2xl border border-gray-200`}>
        <div className={arrow} />

        <div className="p-6">
          <h2 className="text-xl font-semibold text-center mb-3">로그인 후 이용가능한 메뉴예요!</h2>
          <p className="text-sm text-center">
            <button className="underline" onClick={onClose}>로그인 하러가기 →</button>
          </p>
        </div>
      </div>
    </div>
  );
}