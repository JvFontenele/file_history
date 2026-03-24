import { create } from "zustand";

interface ViewerState {
  currentChapterIndex: number;
  currentPageNumber: number;
  showOriginal: boolean;
  showTranslated: boolean;
  showImage: boolean;
  setChapterIndex: (i: number) => void;
  setPageNumber: (n: number) => void;
  toggleOriginal: () => void;
  toggleTranslated: () => void;
  toggleImage: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  currentChapterIndex: 0,
  currentPageNumber: 1,
  showOriginal: true,
  showTranslated: true,
  showImage: true,
  setChapterIndex: (i) => set({ currentChapterIndex: i }),
  setPageNumber: (n) => set({ currentPageNumber: n }),
  toggleOriginal: () => set((s) => ({ showOriginal: !s.showOriginal })),
  toggleTranslated: () => set((s) => ({ showTranslated: !s.showTranslated })),
  toggleImage: () => set((s) => ({ showImage: !s.showImage })),
}));
