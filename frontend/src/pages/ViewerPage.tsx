import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useBook, useChapters, usePages } from "../hooks/useViewer";
import { useViewerStore } from "../store/viewerStore";
import api from "../api/client";

export default function ViewerPage() {
  const { bookUuid } = useParams<{ bookUuid: string }>();
  const navigate = useNavigate();
  const { data: book } = useBook(bookUuid!);
  const isImageBook = book && ["image", "image_collection", "cbz", "cbr"].includes(book.format);

  const {
    currentChapterIndex,
    currentPageNumber,
    showOriginal,
    showTranslated,
    setChapterIndex,
    setPageNumber,
    toggleOriginal,
    toggleTranslated,
  } = useViewerStore();

  const { data: chapters } = useChapters(bookUuid!, !isImageBook);
  const { data: pages } = usePages(bookUuid!, !!isImageBook);

  const currentChapter = chapters?.[currentChapterIndex];
  const currentPage = pages?.find((p) => p.page_number === currentPageNumber);

  const { data: chapterContent } = useQuery({
    queryKey: ["viewer-text", bookUuid, currentChapter?.id],
    queryFn: () => api.get(`/api/viewer/${bookUuid}/text?chapter_id=${currentChapter!.id}&side=both`).then(r => r.data),
    enabled: !!currentChapter && !isImageBook,
  });

  const { data: pageContent } = useQuery({
    queryKey: ["viewer-page", bookUuid, currentPageNumber],
    queryFn: () => api.get(`/api/viewer/${bookUuid}/page?page_number=${currentPageNumber}&side=both`).then(r => r.data),
    enabled: !!isImageBook,
  });

  const navItems = isImageBook ? pages : chapters;
  const totalNav = navItems?.length ?? 0;
  const currentNav = isImageBook ? currentPageNumber - 1 : currentChapterIndex;

  const goTo = (idx: number) => {
    if (isImageBook) {
      setPageNumber(idx + 1);
    } else {
      setChapterIndex(idx);
    }
  };

  if (!book) return (
    <div className="flex items-center justify-center min-h-screen text-gray-500">Carregando...</div>
  );

  const content = isImageBook ? pageContent : chapterContent;

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate("/library")} className="text-gray-400 hover:text-white text-sm">
          ← Biblioteca
        </button>
        <h1 className="text-sm font-semibold truncate flex-1">{book.title}</h1>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={toggleOriginal}
            className={`px-2 py-1 rounded ${showOriginal ? "bg-indigo-700 text-white" : "bg-gray-800 text-gray-400"}`}
          >
            Original
          </button>
          <button
            onClick={toggleTranslated}
            className={`px-2 py-1 rounded ${showTranslated ? "bg-green-800 text-white" : "bg-gray-800 text-gray-400"}`}
          >
            Traduzido
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation sidebar */}
        <aside className="w-56 bg-gray-900 border-r border-gray-800 overflow-y-auto shrink-0">
          <div className="p-2 text-xs text-gray-500 uppercase font-medium border-b border-gray-800 px-3 py-2">
            {isImageBook ? "Páginas" : "Capítulos"}
          </div>
          {navItems?.map((item, idx) => {
            const label = isImageBook
              ? `Página ${(item as any).page_number}`
              : (item as any).title ?? `Capítulo ${idx + 1}`;
            const isActive = currentNav === idx;
            return (
              <button
                key={(item as any).id}
                onClick={() => goTo(idx)}
                className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${
                  isActive ? "bg-indigo-900 text-indigo-200" : "hover:bg-gray-800 text-gray-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </aside>

        {/* Main content area */}
        <main className="flex-1 flex overflow-hidden">
          {isImageBook && pageContent?.page?.image_url && (
            <div className="w-1/2 border-r border-gray-800 overflow-y-auto p-4 flex justify-center">
              <img
                src={pageContent.page.image_url}
                alt=""
                className="max-w-full h-auto rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {/* Text panes */}
          <div className={`flex overflow-hidden ${isImageBook ? "w-1/2" : "w-full"}`}>
            {showOriginal && (
              <div className={`overflow-y-auto p-6 ${showTranslated ? "w-1/2 border-r border-gray-800" : "w-full"}`}>
                <p className="text-xs text-gray-500 uppercase font-medium mb-3">Original</p>
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {content?.original_text ?? "Sem texto"}
                </div>
              </div>
            )}
            {showTranslated && (
              <div className={`overflow-y-auto p-6 ${showOriginal ? "w-1/2" : "w-full"}`}>
                <p className="text-xs text-green-500 uppercase font-medium mb-3">Tradução (pt-BR)</p>
                <div className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {content?.translated_text ?? (
                    <span className="text-gray-600 italic">Ainda não traduzido</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Bottom navigation */}
      <footer className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center justify-between text-sm shrink-0">
        <button
          onClick={() => goTo(Math.max(0, currentNav - 1))}
          disabled={currentNav === 0}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-xs"
        >
          ← Anterior
        </button>
        <span className="text-gray-500 text-xs">
          {currentNav + 1} / {totalNav}
        </span>
        <button
          onClick={() => goTo(Math.min(totalNav - 1, currentNav + 1))}
          disabled={currentNav >= totalNav - 1}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-xs"
        >
          Próximo →
        </button>
      </footer>
    </div>
  );
}
