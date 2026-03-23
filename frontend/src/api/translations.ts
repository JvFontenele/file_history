import api from "./client";
import type { TranslationJob } from "../types/translation";

export const startTranslation = (bookUuid: string, scope = "full", scopeId?: number) =>
  api.post<TranslationJob>(`/api/translations/${bookUuid}/start`, { scope, scope_id: scopeId }).then((r) => r.data);

export const fetchJob = (bookUuid: string, jobId: number) =>
  api.get<TranslationJob>(`/api/translations/${bookUuid}/job/${jobId}`).then((r) => r.data);

export const cancelJob = (bookUuid: string, jobId: number) =>
  api.post(`/api/translations/${bookUuid}/job/${jobId}/cancel`);

export const fetchJobs = (bookUuid: string) =>
  api.get<TranslationJob[]>(`/api/translations/${bookUuid}/jobs`).then((r) => r.data);
