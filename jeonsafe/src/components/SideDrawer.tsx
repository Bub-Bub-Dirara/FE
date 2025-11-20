import { useCallback, useEffect, useMemo, useState } from "react";
import { http } from "../lib/http";
import type { ChatThread, ChatThreadsResponse } from "../types/chat";
import { TrashIcon } from "@heroicons/react/24/outline";
import { getDownloadUrl } from "../lib/files";

type ChannelTab = "pre" | "post";
type ChatChannel = ChatThread["channel"];

type Props = {
  open: boolean;
  onClose: () => void;
  width?: number;
  offsetLeftPx?: number;
};

export default function SideDrawer({
  open,
  onClose,
  width = 360,
  offsetLeftPx = 60,
}: Props) {
  const [tab, setTab] = useState<ChannelTab>("pre");

  const [threads, setThreads] = useState<{
    pre: ChatThread[];
    post: ChatThread[];
  }>({
    pre: [],
    post: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인 유저 id
  const [userId, setUserId] = useState<number | null>(null);

  // 날짜 포맷 (YYYY-MM-DD)
  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 드로어가 열릴 때 로그인 유저 정보 로드
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const res = await http.get<{ id: number; email: string }>(
          "/be/auth/me",
        );
        setUserId(res.data.id);
      } catch (e) {
        console.error("failed to load auth user", e);
        setUserId(null);
        setError("로그인 정보를 불러오는 데 실패했습니다.");
      }
    })();
  }, [open]);

  // 탭별 스레드 불러오기
  const fetchThreads = useCallback(
    async (which: ChannelTab) => {
      if (userId == null) return; // 로그인 정보 없으면 스킵

      try {
        setLoading(true);
        setError(null);

        const channel: ChatChannel =
          which === "pre" ? "PREVENTION" : "POST_CASE";

        const res = await http.get<ChatThreadsResponse>("/be/chat/threads", {
          params: {
            user_id: userId,
            channel,
          },
        });

        let list: ChatThread[] = [];
        if (Array.isArray(res.data)) {
          list = res.data;
        } else if (res.data && Array.isArray(res.data.items)) {
          list = res.data.items;
        } else {
          console.warn("Unexpected chat threads payload", res.data);
          list = [];
        }

        setThreads((prev) => ({
          ...prev,
          [which]: list,
        }));
      } catch (e) {
        console.error("failed to load chat threads", e);
        setError("채팅 기록을 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!open) return;
    if (userId == null) return;

    fetchThreads("pre");
    fetchThreads("post");
  }, [open, userId, fetchThreads]);

  const itemsRaw = useMemo(
    () => (tab === "pre" ? threads.pre : threads.post),
    [tab, threads],
  );

  // 🔒 map 호출 전 방어용 배열
  const items: ChatThread[] = Array.isArray(itemsRaw) ? itemsRaw : [];

  const emptyMessage =
    tab === "pre"
      ? "사전대비 리포트가 없습니다. 리포트를 저장해 보세요!"
      : "사후처리 리포트가 없습니다. 리포트를 저장해 보세요!";


  const handleDelete = (threadId: number, which: ChannelTab) => {
    setThreads((prev) => ({
      ...prev,
      [which]: prev[which].filter((t) => t.id !== threadId),
    }));
  };
  // PDF 다운로드
  const handleDownload = async (thread: ChatThread) => {
  try {
    const url = await getDownloadUrl(thread.report_file_id); 

    const a = document.createElement("a");
    a.href = url;
    a.download = thread.title?.endsWith(".pdf")
      ? thread.title
      : `${thread.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    console.error(e);
    alert("리포트 다운로드에 실패했습니다.");
  }
};
  return (
    <div
      className={`fixed inset-y-0 z-[60] transition-opacity ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ left: offsetLeftPx, right: 0 }}
    >
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* 실제 드로어 */}
      <div
        className="absolute top-2 left-2 bottom-2 bg-white shadow-xl border border-gray-200 rounded-2xl transition-transform duration-300 ease-in-out overflow-hidden"
        style={{
          width,
          transform: open ? "translateX(0)" : `translateX(-${width + 16}px)`,
        }}
      >
        {/* 탭 헤더 */}
        <div className="pt-4 pb-2 bg-white">
          <div className="flex justify-center items-center gap-8 text-sm">
            <button
              type="button"
              onClick={() => setTab("pre")}
              className={`pb-2 font-medium whitespace-nowrap ${
                tab === "pre"
                  ? "text-[#113F67] border-b-2 border-[#113F67]"
                  : "text-gray-500"
              }`}
            >
              사전대비 채팅기록
            </button>
            <button
              type="button"
              onClick={() => setTab("post")}
              className={`pb-2 font-medium whitespace-nowrap ${
                tab === "post"
                  ? "text-[#113F67] border-b-2 border-[#113F67]"
                  : "text-gray-500"
              }`}
            >
              사후처리 채팅기록
            </button>
          </div>
        </div>

        {/* 리스트 영역 */}
        <div className="p-3 space-y-3 overflow-y-auto h-[calc(100%-56px)]">
          {loading && (
            <p className="text-sm text-gray-400 px-2 mt-2">불러오는 중…</p>
          )}

          {error && (
            <p className="text-sm text-red-500 px-2 mt-2">{error}</p>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="text-sm text-gray-400 px-2 mt-2">
              {emptyMessage}
            </p>
          )}

          {!loading &&
            !error &&
            items.map((it) => (
              <div
                key={it.id}
                onClick={() => handleDownload(it)}
                className="group flex items-center gap-2 border rounded-lg px-3 h-12 hover:border-[#113F67] hover:bg-[#F5F7FB] transition-colors w-full cursor-pointer"
                role="button"
              >
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {it.title || "제목 없음"}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {formatDate(it.created_at)}
                  </div>
                </div>

                {/* 휴지통 아이콘 버튼 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(it.id, tab);
                  }}
                  className="p-1 rounded-full hover:bg-red-50"
                >
                  <TrashIcon className="w-4 h-4 text-gray-300 group-hover:text-red-500" />
                </button>
              </div>
            ))}

        </div>
      </div>
    </div>
  );
}
