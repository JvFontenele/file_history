import type { Book } from "../../types/book";
import StatusBadge from "./StatusBadge";

interface Props {
  book: Book;
  onClick: () => void;
}

const FORMAT_ICON: Record<string, string> = {
  pdf: "📄",
  epub: "📖",
  cbz: "🗜️",
  cbr: "🗜️",
  image: "🖼️",
  image_collection: "🗂️",
};

export default function BookCard({ book, onClick }: Props) {
  const icon = FORMAT_ICON[book.format] ?? "📁";

  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-indigo-500 transition-colors group"
    >
      {/* Cover */}
      <div className="h-48 bg-gray-800 flex items-center justify-center overflow-hidden">
        {book.cover_path ? (
          <img
            src={`/covers/${book.uuid}.jpg`}
            alt={book.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-5xl">{icon}</span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold truncate group-hover:text-indigo-300 transition-colors">
          {book.title}
        </p>
        {book.author && (
          <p className="text-xs text-gray-400 truncate">{book.author}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <StatusBadge status={book.translation_status} />
          <span className="text-xs text-gray-500 uppercase">{book.format}</span>
        </div>
        {(book.translation_status === "translating" || book.translation_status === "extracting") && (
          <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-indigo-500 animate-pulse w-2/3" />
          </div>
        )}
        {book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {book.tags.slice(0, 3).map((t) => (
              <span key={t.id} className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
