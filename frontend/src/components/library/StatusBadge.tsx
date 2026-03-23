const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  extracting: "Extraindo",
  translating: "Traduzindo",
  done: "Traduzido",
  error: "Erro",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-700 text-gray-300",
  extracting: "bg-blue-800 text-blue-200",
  translating: "bg-yellow-800 text-yellow-200",
  done: "bg-green-800 text-green-200",
  error: "bg-red-800 text-red-200",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? "bg-gray-700 text-gray-300"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
