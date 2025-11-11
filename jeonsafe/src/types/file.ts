export type FileRecord = {
  id: number;
  user_id: number;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  storage: "local" | "s3";
  s3_key: string | null;
  s3_url: string | null;
  category: "contract" | "message" | "transfer" | "other";
  created_at: string;
};