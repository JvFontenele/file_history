import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCreateHQ } from "../../hooks/useBooks";

interface PageItem {
  id: string;
  file: File;
  preview: string;
}

function SortablePage({ item, index }: { item: PageItem; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative rounded overflow-hidden border ${isDragging ? "border-indigo-500 opacity-70" : "border-gray-700"}`}
      {...attributes}
      {...listeners}
    >
      <img src={item.preview} alt="" className="h-24 w-full object-cover" />
      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">{index + 1}</span>
    </div>
  );
}

interface Props {
  onClose: () => void;
}

export default function UploadHQModal({ onClose }: Props) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [pages, setPages] = useState<PageItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync, isPending, error } = useCreateHQ();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: PageItem[] = Array.from(files).map((f) => ({
      id: `${f.name}-${f.lastModified}-${Math.random()}`,
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setPages((prev) => [...prev, ...newItems]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || pages.length === 0) return;
    const form = new FormData();
    form.append("title", title);
    if (author) form.append("author", author);
    tagInput.split(",").forEach((t) => { if (t.trim()) form.append("tags", t.trim()); });
    pages.forEach((p) => form.append("pages", p.file));
    await mutateAsync(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl border border-gray-700 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0">
          <h2 className="text-lg font-semibold">Nova HQ (imagens)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Título (obrigatório)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Autor (opcional)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Tags (vírgula)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Page dropzone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            className="border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl p-6 text-center cursor-pointer transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <p className="text-gray-400 text-sm">Clique ou arraste imagens das páginas</p>
            <p className="text-xs text-gray-600 mt-1">JPG, PNG, WEBP — arraste para reordenar</p>
          </div>

          {/* Sortable grid */}
          {pages.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {pages.map((item, i) => (
                    <SortablePage key={item.id} item={item} index={i} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {error && <p className="text-red-400 text-sm">{(error as Error).message}</p>}

          <button
            type="submit"
            disabled={!title || pages.length === 0 || isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors"
          >
            {isPending ? "Criando..." : `Criar HQ com ${pages.length} página(s)`}
          </button>
        </form>
      </div>
    </div>
  );
}
