export type ChatThread = {
  id: number;
  user_id: number;
  channel: "POST_CASE"|'PREVENTION' ;
  title: string;
  status: string;
  report_file_id: number;
  created_at: string;
  closed_at: string | null;
};

export type ChatThreadsResponse = ChatThread[] | { items: ChatThread[] };