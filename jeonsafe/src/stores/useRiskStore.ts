// src/stores/useRiskStore.ts
import { create } from "zustand";
import type { ExtractRisksItem } from "../lib/extractRisks";

type RiskStore = {
  items: Record<number, ExtractRisksItem>;
  setItem: (fileId: number, item: ExtractRisksItem) => void;
  updateItem: (fileId: number, partial: Partial<ExtractRisksItem>) => void;
  getItem: (fileId: number) => ExtractRisksItem | undefined;
  hasItem: (fileId: number) => boolean;
  removeItem: (fileId: number) => void;
  reset: () => void;
};

export const useRiskStore = create<RiskStore>((set, get) => ({
  items: {},

  setItem: (fileId, item) =>
    set((state) => ({
      items: {
        ...state.items,
        [fileId]: item,
      },
    })),

  updateItem: (fileId, partial) =>
    set((state) => {
      const prev = state.items[fileId];
      if (!prev) return state; // 없음 → 무시
      return {
        items: {
          ...state.items,
          [fileId]: {
            ...prev,
            ...partial,
          },
        },
      };
    }),

  getItem: (fileId) => {
    return get().items[fileId];
  },

  hasItem: (fileId) => {
    return Boolean(get().items[fileId]);
  },

  removeItem: (fileId) =>
    set((state) => {
      const next = { ...state.items };
      delete next[fileId];
      return { items: next };
    }),

  reset: () => set({ items: {} }),
}));
