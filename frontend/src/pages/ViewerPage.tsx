import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useBook, useChapters, usePages } from "../hooks/useViewer";
import { useViewerStore } from "../store/viewerStore";
import api from "../api/client";

const IMG_MARKER = /(\[IMG:[^\]]+\])/;

function StructuredContent({ text }: { text: string }) {
  const parts = text.split(IMG_MARKER);
  return (
    <>
      {parts.flatMap((part, i) => {
        const imgMatch = part.match(/\[IMG:([^\]]+)\]/);
        if (imgMatch) {
          return (
            <img
              key={i}
              src={`/pages/${imgMatch[1]}`}
              alt=""
              className="max-w-full h-auto my-4 rounded"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          );
        }
        return part
          .split(/\n\n+/)
          .filter((p) => p.trim())
          .map((para, j) => (
            <p key={`${i}-${j}`} className="mb-4 leading-relaxed">
              {para.split("\n").map((line, k, arr) => (
                <span key={k}>
                  {line}
                  {k < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          ));
      })}
    </>
  );
}

export default function ViewerPage() {
  const { bookUuid } = useParams<{ bookUuid: string }>();
  const navigate = useNavigate();
  const { data: book } = useBook(bookUuid!);
  const isImageBook = book && ["pdf", "image", "image_collection", "cbz", "cbr"].includes(book.format);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    currentChapterIndex,
    currentPageNumber,
    showOriginal,
    showTranslated,
    showImage,
    setChapterIndex,
    setPageNumber,
    toggleOriginal,
    toggleTranslated,
    toggleImage,
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
    setSidebarOpen(false);
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
        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden text-gray-400 hover:text-white p-1 text-lg leading-none"
          aria-label="Abrir índice"
        >
          ☰
        </button>
        <button onClick={() => navigate("/library")} className="text-gray-400 hover:text-white text-sm shrink-0">
          ← Biblioteca
        </button>
        <h1 className="text-sm font-semibold truncate flex-1">{book.title}</h1>
        <div className="flex items-center gap-2 text-xs shrink-0">
          {isImageBook && (
            <button
              onClick={toggleImage}
              className={`px-2 py-1.5 rounded ${showImage ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400"}`}
            >
              Imagem
            </button>
          )}
          <button
            onClick={toggleOriginal}
            className={`px-2 py-1.5 rounded ${showOriginal ? "bg-indigo-700 text-white" : "bg-gray-800 text-gray-400"}`}
          >
            Original
          </button>
          <button
            onClick={toggleTranslated}
            className={`px-2 py-1.5 rounded ${showTranslated ? "bg-green-800 text-white" : "bg-gray-800 text-gray-400"}`}
          >
            Traduzido
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Navigation sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-56 bg-gray-900 border-r border-gray-800 overflow-y-auto shrink-0 transition-transform duration-200
            md:static md:translate-x-0 md:z-auto md:block
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-xs text-gray-500 uppercase font-medium">
              {isImageBook ? "Páginas" : "Capítulos"}
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-500 hover:text-white text-lg leading-none p-1"
            >
              ✕
            </button>
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
                className={`w-full text-left px-3 py-2.5 text-xs truncate transition-colors ${
                  isActive ? "bg-indigo-900 text-indigo-200" : "hover:bg-gray-800 text-gray-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </aside>

        {/* Main content area */}
        <main className="flex-1 flex flex-col md:flex-row overflow-auto md:overflow-hidden">
          {isImageBook && showImage && pageContent?.page?.image_url && (
            <div className="w-full md:w-1/2 md:border-r border-b md:border-b-0 border-gray-800 overflow-y-auto p-4 flex justify-center shrink-0">
              <img
                src={pageContent.page.image_url}
                alt=""
                className="max-w-full h-auto rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {/* Text panes */}
          <div className={`flex flex-col sm:flex-row overflow-auto ${isImageBook ? "w-full md:w-1/2" : "w-full"}`}>
            {showOriginal && (
              <div className={`overflow-y-auto p-4 sm:p-6 ${showTranslated ? "sm:w-1/2 border-b sm:border-b-0 sm:border-r border-gray-800" : "w-full"}`}>
                <p className="text-xs text-gray-500 uppercase font-medium mb-3">Original</p>
                <div className="text-sm text-gray-300 leading-relaxed">
                  {content?.original_text ? <StructuredContent text={content.original_text} /> : "Sem texto"}
                </div>
              </div>
            )}
            {showTranslated && (
              <div className={`overflow-y-auto p-4 sm:p-6 ${showOriginal ? "sm:w-1/2" : "w-full"}`}>
                <p className="text-xs text-green-500 uppercase font-medium mb-3">Tradução (pt-BR)</p>
                <div className="text-sm text-gray-100 leading-relaxed">
                  {content?.translated_text
                    ? <StructuredContent text={content.translated_text} />
                    : <span className="text-gray-600 italic">Ainda não traduzido</span>
                  }
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
          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-xs"
        >
          ← Anterior
        </button>
        <span className="text-gray-500 text-xs">
          {currentNav + 1} / {totalNav}
        </span>
        <button
          onClick={() => goTo(Math.min(totalNav - 1, currentNav + 1))}
          disabled={currentNav >= totalNav - 1}
          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-xs"
        >
          Próximo →
        </button>
      </footer>
    </div>
  );
}
