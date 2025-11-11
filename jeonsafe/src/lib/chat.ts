import { http } from "./http";

export async function createThread(params: {
  user_id: number;
  channel: "PREVENTION" | "POST_CASE";
  title?: string;
}): Promise<number> {
  const { data } = await http.post<{
    id: number; user_id: number; channel: string; title: string; status: string;
  }>("/be/chat/threads", params);
  return data.id;
}

export async function addThreadMessage(
  threadId: number,
  body: {
    role: "user" | "assistant" | "system";
    content: string;
    step: "UPLOAD" | "RISK" | "REPORT" | string;
    metadata?: Record<string, unknown>;
  }
) {
  await http.post<string>(`/be/chat/threads/${threadId}/messages`, body);
}

