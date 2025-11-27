import { http } from "./http";

export type ChatChannel = "PREVENTION" | "POST_CASE";

export type ChatThread = {
  id: number;
  user_id: number;
  channel: ChatChannel;
  title: string;
  status: string;
  report_file_id: number;
  created_at: string;
  closed_at: string | null;
};

export async function createThread(params: {
  user_id: number;
  channel: ChatChannel;
  title?: string;
  report_file_id?: number;
}): Promise<number> {
  const { data } = await http.post<ChatThread>("/be/chat/threads", params);
  return data.id;
}

export async function addThreadMessage(
  threadId: number,
  body: {
    role: "user" | "assistant" | "system";
    content: string;
    step: "UPLOAD" | "RISK" | "REPORT" | string;
    metadata?: Record<string, unknown>;
  },
) {
  await http.post<string>(`/be/chat/threads/${threadId}/messages`, body);
}
