import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadBookChunked } from "../../api/books";

interface Props {
  onClose: () => void;
}

export default function UploadModal({ onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const tags = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
      await uploadBookChunked(file, { title: title || file.name, author, tags }, setProgress);
      qc.invalidateQueries({ queryKey: ["books"] });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Adicionar livro / arquivo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Dropzone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging ? "border-indigo-500 bg-indigo-900/20" : "border-gray-700 hover:border-gray-500"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.epub,.cbz,.cbr,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
                }
              }}
            />
            {file ? (
              <p className="text-green-400 font-medium">{file.name}</p>
            ) : (
              <>
                <p className="text-gray-400">Arraste ou clique para selecionar</p>
                <p className="text-xs text-gray-600 mt-1">PDF, EPUB, CBZ, CBR, JPG, PNG, WEBP</p>
              </>
            )}
          </div>

          <input
            type="text"
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            placeholder="Autor (opcional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            placeholder="Tags (separadas por vírgula)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />

          {/* Barra de progresso */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Enviando...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors"
          >
            {uploading ? `Enviando... ${progress}%` : "Adicionar à biblioteca"}
          </button>
        </form>
      </div>
    </div>
  );
}
