import { create } from "zustand";

interface ViewerState {
  currentChapterIndex: number;
  currentPageNumber: number;
  showOriginal: boolean;
  showTranslated: boolean;
  setChapterIndex: (i: number) => void;
  setPageNumber: (n: number) => void;
  toggleOriginal: () => void;
  toggleTranslated: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  currentChapterIndex: 0,
  currentPageNumber: 1,
  showOriginal: true,
  showTranslated: true,
  setChapterIndex: (i) => set({ currentChapterIndex: i }),
  setPageNumber: (n) => set({ currentPageNumber: n }),
  toggleOriginal: () => set((s) => ({ showOriginal: !s.showOriginal })),
  toggleTranslated: () => set((s) => ({ showTranslated: !s.showTranslated })),
}));
