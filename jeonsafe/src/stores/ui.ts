import { create } from "zustand";

type UIState = {
  chatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
};

export const useUI = create<UIState>((set) => ({
  chatOpen: false,
  openChat: () => set({ chatOpen: true }),
  closeChat: () => set({ chatOpen: false }),
}));
