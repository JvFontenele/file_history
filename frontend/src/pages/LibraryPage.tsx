import { useState } from "react";
import type { Book } from "../types/book";
import { useBooks } from "../hooks/useBooks";
import BookCard from "../components/library/BookCard";
import BookDetailPanel from "../components/library/BookDetailPanel";
import UploadModal from "../components/library/UploadModal";
import UploadHQModal from "../components/library/UploadHQModal";

type Modal = "upload" | "hq" | null;

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<Book | null>(null);

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;

  const { data: books, isLoading, error } = useBooks(params);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-4 shrink-0">
        <h1 className="text-lg font-bold text-indigo-400 shrink-0">📚 Tradutor</h1>
        <input
          type="text"
          placeholder="Buscar título ou autor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="translating">Traduzindo</option>
          <option value="done">Traduzido</option>
          <option value="error">Erro</option>
        </select>
        <button
          onClick={() => setModal("upload")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors shrink-0"
        >
          + Livro / Arquivo
        </button>
        <button
          onClick={() => setModal("hq")}
          className="bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors shrink-0"
        >
          + Nova HQ
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 p-6">
        {isLoading && (
          <div className="flex items-center justify-center h-64 text-gray-500">Carregando...</div>
        )}
        {error && (
          <div className="flex items-center justify-center h-64 text-red-400">
            Erro ao carregar biblioteca.
          </div>
        )}
        {books && books.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
            <span className="text-5xl">📭</span>
            <p>Biblioteca vazia. Adicione seu primeiro livro!</p>
          </div>
        )}
        {books && books.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {books.map((book) => (
              <BookCard key={book.uuid} book={book} onClick={() => setSelected(book)} />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {modal === "upload" && <UploadModal onClose={() => setModal(null)} />}
      {modal === "hq" && <UploadHQModal onClose={() => setModal(null)} />}
      {selected && <BookDetailPanel book={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
