import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Book } from "../../types/book";
import StatusBadge from "./StatusBadge";
import { useDeleteBook, useUpdateBook } from "../../hooks/useBooks";
import { useStartTranslation, useJobs, useCancelJob } from "../../hooks/useTranslation";

interface Props {
  book: Book;
  onClose: () => void;
}

export default function BookDetailPanel({ book, onClose }: Props) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? "");
  const [tagInput, setTagInput] = useState(book.tags.map((t) => t.name).join(", "));

  const { mutateAsync: del, isPending: deleting } = useDeleteBook();
  const { mutateAsync: upd, isPending: updating } = useUpdateBook(book.uuid);
  const { mutate: start, isPending: starting } = useStartTranslation(book.uuid);
  const { data: jobs } = useJobs(book.uuid);
  const { mutate: cancel } = useCancelJob(book.uuid);

  const latestJob = jobs?.[0];
  const isRunning = latestJob && (latestJob.status === "running" || latestJob.status === "queued");
  const progress =
    latestJob && latestJob.progress_total > 0
      ? Math.round((latestJob.progress_current / latestJob.progress_total) * 100)
      : 0;

  const handleSave = async () => {
    await upd({
      title,
      author,
      tags: tagInput.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Excluir "${book.title}"?`)) return;
    await del(book.uuid);
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-40 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="font-semibold truncate pr-2">{book.title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white shrink-0">✕</button>
      </div>

      {/* Cover */}
      {book.cover_path && (
        <div className="h-48 bg-gray-800 overflow-hidden">
          <img
            src={`/covers/${book.uuid}.jpg`}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      <div className="p-4 space-y-4 flex-1">
        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusBadge status={book.translation_status} />
          <span className="text-xs text-gray-500 uppercase">{book.format}</span>
          {book.total_chapters && <span className="text-xs text-gray-500">{book.total_chapters} cap.</span>}
          {book.total_pages && <span className="text-xs text-gray-500">{book.total_pages} pág.</span>}
        </div>

        {/* Translation progress */}
        {isRunning && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Traduzindo...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <button
              onClick={() => cancel(latestJob!.id)}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Cancelar tradução
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate(`/viewer/${book.uuid}`)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg"
          >
            Abrir leitor
          </button>
          {book.translation_status !== "translating" && book.translation_status !== "extracting" && (
            <button
              onClick={() => start({ scope: "full" })}
              disabled={starting}
              className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg"
            >
              {book.translation_status === "done" ? "Retraduzir" : "Iniciar tradução"}
            </button>
          )}
        </div>

        {/* Edit metadata */}
        {editing ? (
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              placeholder="Título"
            />
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              placeholder="Autor"
            />
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              placeholder="Tags (vírgula)"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updating}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg"
              >
                Salvar
              </button>
              <button onClick={() => setEditing(false)} className="flex-1 bg-gray-700 text-sm py-2 rounded-lg">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-sm text-indigo-400 hover:text-indigo-300">
            Editar metadados
          </button>
        )}

        {/* Tags */}
        {book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {book.tags.map((t) => (
              <span key={t.id} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                {t.name}
              </span>
            ))}
          </div>
        )}

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full text-red-500 hover:text-red-400 text-sm py-2 border border-red-900 hover:border-red-700 rounded-lg transition-colors"
        >
          Excluir livro
        </button>
      </div>
    </div>
  );
}
