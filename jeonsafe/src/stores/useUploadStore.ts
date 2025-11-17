import { create } from "zustand";
import type { FileRecord } from "../types/file";
import type { AnalyzeItem } from "../lib/analyzeEvidence";

type UploadState = {
  uploaded: FileRecord[];
  setUploaded: (files: FileRecord[]) => void;
  clearUploaded: () => void;

  analysisById: Record<string, AnalyzeItem>;
  setAnalysisById: (map: Record<string, AnalyzeItem>) => void;

  isAnalyzing: boolean;
  setIsAnalyzing: (v:boolean) => void;
};

export const useUploadStore = create<UploadState>((set) => ({
  uploaded: [],
  analysisById: {},
  clearUploaded: () => set({ uploaded: [], analysisById: {}, isAnalyzing: false }),
  setUploaded: (files) => set({ uploaded: files }),
  setAnalysisById: (map) => set({ analysisById: map }),
  isAnalyzing: false,
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
}));