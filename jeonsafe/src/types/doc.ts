export type DocType = "pdf" | "image" | "other";
export type Doc = { id: number; name: string; type: DocType; pages?: number };
