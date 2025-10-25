import { createContext } from "react";

type Flow = "pre" | "post";

export type ProgressCtxType = {
  prePos: number;
  postPos: number;
  setPos: (flow: Flow, idx: number) => void;
};

export const ProgressCtx = createContext<ProgressCtxType | null>(null);
