export type Item = { id: string; name: string };
export type BucketKey = "contract" | "sms" | "deposit" | "me" | "landlord";
export type Buckets = Record<BucketKey, Item[]>;

export const BUCKET_META: Record<BucketKey, { title: string }> = {
  contract: { title: "계약서" },
  sms:      { title: "문자 내역" },
  deposit:  { title: "입금 내역" },
  me:       { title: "내 정보" },
  landlord: { title: "집주인 정보" },
};

export const BUCKET_ORDER: BucketKey[] = [
  "contract", "sms", "deposit", "me", "landlord",
];