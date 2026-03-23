import { useQuery } from "@tanstack/react-query";
import { fetchPreview } from "../../api/books";
import type { PreviewPage } from "../../types/book";

interface Props {
  bookUuid: string;
  bookTitle: string;
  onClose: () => void;
}

function PageCard({ page }: { page: PreviewPage }) {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex flex-col">
      {/* Page image */}
      <div className="bg-gray-900 flex items-center justify-center aspect-[3/4] overflow-hidden">
        {page.image_url ? (
          <img
            src={page.image_url}
            alt={`Página ${page.page_number}`}
            loading="lazy"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-gray-600 text-xs">Sem imagem</span>
        )}
      </div>

      {/* Page info */}
      <div className="p-2 flex-1 flex flex-col gap-1">
        <span className="text-xs text-gray-500 font-medium">Pág. {page.page_number}</span>
        {page.text_snippet ? (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-4 whitespace-pre-wrap">
            {page.text_snippet}
          </p>
        ) : (
          <p className="text-xs text-gray-600 italic">Sem texto extraído</p>
        )}
      </div>
    </div>
  );
}

export default function PreviewModal({ bookUuid, bookTitle, onClose }: Props) {
  const { data: pages, isLoading, error } = useQuery({
    queryKey: ["preview", bookUuid],
    queryFn: () => fetchPreview(bookUuid),
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm shrink-0">
          ← Voltar
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{bookTitle}</h2>
          {pages && (
            <p className="text-xs text-gray-500">{pages.length} páginas</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-48 text-gray-500">
            Carregando preview...
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-48 text-red-400 text-sm">
            Erro ao carregar preview.
          </div>
        )}

        {pages && pages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2">
            <span className="text-4xl">📄</span>
            <p className="text-sm">Nenhuma página disponível ainda.</p>
            <p className="text-xs text-gray-600">O livro pode ainda estar sendo extraído.</p>
          </div>
        )}

        {pages && pages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {pages.map((page) => (
              <PageCard key={page.page_number} page={page} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
