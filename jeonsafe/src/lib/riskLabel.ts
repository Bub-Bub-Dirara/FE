export type KorRiskLabel = "상" | "중" | "하";

export function toKorRiskLabel(
  raw?: string | null,
): KorRiskLabel | undefined {
  if (!raw) return undefined;

  const v = raw.trim().toUpperCase();

  if (["M"].includes(v)) return "중";
  if (["G"].includes(v)) return "하";
  if (["B"].includes(v)) return "상";

  return undefined;
}
