import { useEffect, useState } from "react";
import { ProgressCtx } from "./progress-context";

type Flow = "pre" | "post";

export function ProgressProvider({ children }: { children: React.ReactNode }) {

  const [prePos, setPrePos] = useState<number>(() => Number(localStorage.getItem("prePos") ?? 0));
  const [postPos, setPostPos] = useState<number>(() => Number(localStorage.getItem("postPos") ?? 0));

  const setPos = (flow: Flow, idx: number) => {
    if (flow === "pre") setPrePos(idx);
    else setPostPos(idx);
  };

  useEffect(() => { localStorage.setItem("prePos", String(prePos)); }, [prePos]);
  useEffect(() => { localStorage.setItem("postPos", String(postPos)); }, [postPos]);

  return (
    <ProgressCtx.Provider value={{ prePos, postPos, setPos }}>
      {children}
    </ProgressCtx.Provider>
  );
}
