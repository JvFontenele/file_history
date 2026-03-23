import api from "./client";
import type { Book, Chapter, Page, PreviewPage } from "../types/book";

export const fetchBooks = (params?: Record<string, string>) =>
  api.get<Book[]>("/api/books", { params }).then((r) => r.data);

export const fetchBook = (uuid: string) =>
  api.get<Book>(`/api/books/${uuid}`).then((r) => r.data);

export const uploadBook = (form: FormData) =>
  api.post<Book>("/api/books/upload", form).then((r) => r.data);

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadBookChunked(
  file: File,
  meta: { title?: string; author?: string; tags?: string[] },
  onProgress?: (pct: number) => void,
): Promise<Book> {
  const sessionId = crypto.randomUUID();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const form = new FormData();
    form.append("session_id", sessionId);
    form.append("chunk_index", String(i));
    form.append("file", file.slice(start, start + CHUNK_SIZE), file.name);
    await api.post("/api/books/upload/chunk", form);
    onProgress?.(Math.round(((i + 1) / totalChunks) * 90));
  }

  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("filename", file.name);
  form.append("total_chunks", String(totalChunks));
  if (meta.title) form.append("title", meta.title);
  if (meta.author) form.append("author", meta.author);
  (meta.tags ?? []).forEach((t) => form.append("tags", t));

  const res = await api.post<Book>("/api/books/upload/finalize", form);
  onProgress?.(100);
  return res.data;
}

export const createHQ = (form: FormData) =>
  api.post<Book>("/api/books/create-hq", form).then((r) => r.data);

export const updateBook = (uuid: string, data: { title?: string; author?: string; tags?: string[] }) =>
  api.patch<Book>(`/api/books/${uuid}`, data).then((r) => r.data);

export const deleteBook = (uuid: string) =>
  api.delete(`/api/books/${uuid}`);

export const fetchChapters = (uuid: string) =>
  api.get<Chapter[]>(`/api/books/${uuid}/chapters`).then((r) => r.data);

export const fetchChapter = (uuid: string, chapterId: number) =>
  api.get<Chapter>(`/api/books/${uuid}/chapters/${chapterId}`).then((r) => r.data);

export const fetchPages = (uuid: string) =>
  api.get<Page[]>(`/api/books/${uuid}/pages`).then((r) => r.data);

export const fetchPage = (uuid: string, pageId: number) =>
  api.get<Page>(`/api/books/${uuid}/pages/${pageId}`).then((r) => r.data);

export const reorderPages = (uuid: string, order: number[]) =>
  api.patch(`/api/books/${uuid}/pages/reorder`, { order });

export const fetchPreview = (uuid: string) =>
  api.get<PreviewPage[]>(`/api/books/${uuid}/preview`).then((r) => r.data);
