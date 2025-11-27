import { useContext } from "react";
import { ProgressCtx } from "./progress-context";

export const useProgress = () => {
  const v = useContext(ProgressCtx);
  if (!v) throw new Error("useProgress must be used within ProgressProvider");
  return v;
};
