import api from "./client";
import type { Book, Chapter, Page, PreviewPage } from "../types/book";

export const fetchBooks = (params?: Record<string, string>) =>
  api.get<Book[]>("/api/books", { params }).then((r) => r.data);

export const fetchBook = (uuid: string) =>
  api.get<Book>(`/api/books/${uuid}`).then((r) => r.data);

export const uploadBook = (form: FormData) =>
  api.post<Book>("/api/books/upload", form).then((r) => r.data);

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
