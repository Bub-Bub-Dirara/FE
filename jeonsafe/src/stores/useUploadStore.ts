import { create } from "zustand";
import type { FileRecord } from "../types/file";

type UploadState = {
  uploaded: FileRecord[];
  setUploaded: (files: FileRecord[]) => void;
  clearUploaded: () => void;
};

export const useUploadStore = create<UploadState>((set) => ({
  uploaded: [],
  setUploaded: (files) => set({ uploaded: files }),
  clearUploaded: () => set({ uploaded: [] }),
}));
