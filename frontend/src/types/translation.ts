export interface TranslationJob {
  id: number;
  book_id: number;
  scope: "full" | "chapter" | "page";
  scope_id?: number;
  status: "queued" | "running" | "done" | "cancelled" | "error";
  progress_current: number;
  progress_total: number;
  error_message?: string;
  created_at: string;
  finished_at?: string;
}
