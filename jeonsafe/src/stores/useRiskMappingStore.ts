import { create } from "zustand";

export type RiskMappingItem = {
  id: string;
  fileId: number;
  page: number;
  bbox: [number, number, number, number];
  sentence: string;
  reason?: string;
  riskLabel?: string;
  lawInput?: string;
  caseInput?: string;
};

type RiskMappingStore = {
  // 파일별로 위험 문장 리스트
  byFileId: Record<number, RiskMappingItem[]>;
  setFileMappings: (fileId: number, items: RiskMappingItem[]) => void;
  clear: () => void;
};

export const useRiskMappingStore = create<RiskMappingStore>((set) => ({
  byFileId: {},

  setFileMappings: (fileId, items) =>
    set((state) => ({
      byFileId: {
        ...state.byFileId,
        [fileId]: items,
      },
    })),

  clear: () => set({ byFileId: {} }),
}));
