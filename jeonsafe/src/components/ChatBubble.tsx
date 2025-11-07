type Props = {
  open: boolean;
  onClose: () => void;
  onLoginClick: () => void;
};

export default function ChatBubble({ open, onClose, onLoginClick }: Props) {
  if (!open) return null;

  const LEFT_OFFSET = 76;
  const BOTTOM_OFFSET = 20;

  return (
    <div className="fixed inset-0 z-[70]">

      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="absolute w-[340px] rounded-2xl bg-white shadow-2xl border border-gray-200"
        style={{ left: LEFT_OFFSET, bottom: BOTTOM_OFFSET }}
      >
        <div className="absolute left-[-10px] top-15 w-0 h-0 
                        border-t-[10px] border-b-[10px] border-r-[12px] 
                        border-t-transparent border-b-transparent border-r-white" />

        <div className="p-6">
          <h2 className="text-xl font-semibold text-center mb-3">
            로그인 후에 가능한 메뉴입니다!
          </h2>
          <p className="text-sm text-center">
            <button className="underline"onClick={() => {
                onClose();  
                onLoginClick();
              }}>
              로그인 하러가기 →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
